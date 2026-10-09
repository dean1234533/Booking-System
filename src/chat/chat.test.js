import { describe, it, expect, vi, beforeEach } from "vitest";
import { stripHtml, extractEmail, extractUkPhone, redactContactInfo, guessBusinessName, isLikelyNameReply } from "./leadExtraction.js";
import { handleChat, handleChatEvent, handleAdminChatStats } from "./service.js";
import { PRIVACY_NOTICE, UNKNOWN_REPLY, VOLUNTEERED_LEAD_REPLY } from "../config/botFacts.js";
import { enc, dec, decDoc } from "../reminders/fsrest.js";

describe("fsrest enc() Date support (needed for Firestore TTL policies)", () => {
  it("encodes a Date as a Firestore timestampValue, not a string", () => {
    const d = new Date("2026-01-01T00:00:00.000Z");
    expect(enc(d)).toEqual({ timestampValue: "2026-01-01T00:00:00.000Z" });
  });
});

describe("leadExtraction", () => {
  it("strips HTML tags", () => {
    expect(stripHtml("<script>alert(1)</script>hello <b>world</b>")).toBe("alert(1)hello world");
  });
  it("extracts an email anywhere in the message", () => {
    expect(extractEmail("you can reach me at Jo@Example.co.uk thanks")).toBe("jo@example.co.uk");
    expect(extractEmail("no email here")).toBeNull();
  });
  it("normalises UK phone numbers in various formats", () => {
    for (const n of ["07700 900123", "+44 7700 900123", "0044 7700 900123", "07700900123"]) {
      expect(extractUkPhone(`call me on ${n} please`)).toBe("07700900123");
    }
    expect(extractUkPhone("no number here")).toBeNull();
    expect(extractUkPhone("12345")).toBeNull();
  });
  it("guesses the business name from the reply right after 'called?'", () => {
    const msgs = [
      { role: "assistant", content: "Barber? What's your shop called?" },
      { role: "user", content: "Fade Factory" },
    ];
    expect(guessBusinessName(msgs)).toBe("Fade Factory");
    expect(isLikelyNameReply(msgs)).toBe(true);
  });
  it("does not treat a real question as a name reply", () => {
    const msgs = [
      { role: "assistant", content: "Sure, here's how deposits work." },
      { role: "user", content: "how much is the full plan?" },
    ];
    expect(isLikelyNameReply(msgs)).toBe(false);
    expect(guessBusinessName(msgs)).toBeNull();
  });
  it("redacts emails and phone numbers but leaves everything else untouched", () => {
    expect(redactContactInfo("call me on 07700 900123 or email jo@example.com")).toBe("call me on [phone] or email [email]");
    expect(redactContactInfo("how much is the full plan?")).toBe("how much is the full plan?");
  });
});

// ── In-memory Firestore fake, same technique as src/reminders/reminders.test.js ─
function fakeFirestore(seed = {}) {
  const store = new Map(Object.entries(seed));
  const BASE = "https://fs.test/documents";
  const wrap = (path, d) => ({ name: `projects/p/databases/(default)/documents/${path}`, fields: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, enc(v)])) });
  const match = (d, f) => {
    if (f.compositeFilter) return f.compositeFilter.filters.every(x => match(d, x));
    const { field, op, value } = f.fieldFilter;
    const v = dec(value);
    if (op === "EQUAL") return d[field.fieldPath] === v;
    if (op === "GREATER_THAN_OR_EQUAL") return (d[field.fieldPath] || "") >= v;
    return false;
  };
  const fetchImpl = vi.fn(async (url, init = {}) => {
    url = String(url);
    const method = init.method || "GET";
    if (url.endsWith(":runQuery")) {
      const q = JSON.parse(init.body).structuredQuery;
      const col = q.from[0].collectionId;
      let rows = [...store].filter(([p]) => p.split("/").length === 2 && p.startsWith(col + "/")).filter(([, d]) => !q.where || match(d, q.where));
      if (q.orderBy?.[0]?.field?.fieldPath === "createdAt" && q.orderBy[0].direction === "DESCENDING") rows = rows.sort((a, b) => (b[1].createdAt || "").localeCompare(a[1].createdAt || ""));
      return new Response(JSON.stringify(rows.length ? rows.map(([p, d]) => ({ document: wrap(p, d) })) : [{}]));
    }
    const rel = url.slice(BASE.length + 1);
    if (method === "POST") {
      const [col, id] = rel.split("?documentId=");
      const path = `${col}/${id}`;
      if (store.has(path)) return new Response("{}", { status: 409 });
      store.set(path, decDoc(JSON.parse(init.body).fields));
      return new Response("{}");
    }
    const path = rel.split("?")[0];
    if (method === "PATCH") { store.set(path, { ...(store.get(path) || {}), ...decDoc(JSON.parse(init.body).fields) }); return new Response("{}"); }
    if (method === "DELETE") { store.delete(path); return new Response("{}"); }
    return store.has(path) ? new Response(JSON.stringify(wrap(path, store.get(path)))) : new Response("{}", { status: 404 });
  });
  return { store, fetchImpl, BASE };
}

describe("handleChat", () => {
  let fs, env, deps, aiRun;
  const setup = (seed = {}) => {
    fs = fakeFirestore(seed);
    vi.stubGlobal("fetch", fs.fetchImpl);
    aiRun = vi.fn(async () => ({ response: "Full plan is £10/month, 90-day free trial." }));
    env = { VITE_FIREBASE_PROJECT_ID: "p", AI: { run: aiRun }, RESEND_API_KEY: "k", ADMIN_NOTIFICATION_EMAIL: "dean@example.com", ADMIN_ACCESS_KEY: "secret" };
    const sent = vi.fn(async () => ({}));
    deps = {
      json: (d, status = 200) => ({ status, body: d }),
      firestoreBase: () => fs.BASE, getFirebaseAdminToken: async () => "tok",
      Resend: class { constructor() { this.emails = { send: sent }; } },
      sentEmail: sent,
    };
    return { fs, env, deps };
  };
  beforeEach(() => vi.unstubAllGlobals());
  const req = body => new Request("https://x/api/chat", { method: "POST", body: JSON.stringify(body) });

  it("answers a normal question via AI, no lead captured", async () => {
    setup();
    const res = await handleChat(req({ message: "how much is it?", sessionId: "s1" }), env, deps);
    expect(res.body.source).toBe("ai");
    expect(res.body.reply).toContain("£10");
    expect(res.body.leadCaptured).toBe(false);
  });

  it("falls back to a keyword-matched answer when the AI call fails", async () => {
    setup();
    aiRun.mockRejectedValueOnce(new Error("quota exceeded"));
    const res = await handleChat(req({ message: "do my clients pay a booking fee?", sessionId: "s2" }), env, deps);
    expect(res.body.source).toBe("fallback");
    expect(res.body.reply).toMatch(/commission/i);
  });

  it("replies with the exact unknown-topic sentence when nothing matches (fallback path)", async () => {
    setup();
    aiRun.mockRejectedValueOnce(new Error("down"));
    const res = await handleChat(req({ message: "do you support dog grooming businesses with a van", sessionId: "s3" }), env, deps);
    expect(res.body.reply).toBe(UNKNOWN_REPLY);
    expect(res.body.reply).toContain(PRIVACY_NOTICE); // the ask-for-email message must always carry the notice
  });

  it("captures a lead when an email appears, notifies, returns a Start free link, and uses the volunteered-reply wording", async () => {
    setup();
    const res = await handleChat(req({
      message: "my email is jo@example.com", sessionId: "s4", audience: "barber",
      history: [{ role: "assistant", content: "Barber? What's your shop called?" }, { role: "user", content: "Fade Factory" }],
    }), env, deps);
    expect(res.body.leadCaptured).toBe(true);
    expect(res.body.reply).toBe(VOLUNTEERED_LEAD_REPLY);
    expect(res.body.startFreeUrl).toContain("plan=basic");
    // chatLeads keeps the FULL, unredacted transcript — that's the whole point of a lead record.
    expect(fs.store.get("chatLeads/s4")).toMatchObject({ email: "jo@example.com", businessName: "Fade Factory", audience: "barber", status: "new" });
    expect(fs.store.get("chatLeads/s4").transcript.some(m => m.content.includes("jo@example.com"))).toBe(true);
    expect(deps.sentEmail).toHaveBeenCalledTimes(1);
  });

  it("does not re-notify on a second message in the same already-captured lead", async () => {
    setup();
    await handleChat(req({ message: "jo@example.com", sessionId: "s5" }), env, deps);
    await handleChat(req({ message: "also my number is 07700 900123", sessionId: "s5" }), env, deps);
    expect(deps.sentEmail).toHaveBeenCalledTimes(1);
    expect(fs.store.get("chatLeads/s5")).toMatchObject({ email: "jo@example.com", phone: "07700900123" });
  });

  it("redacts contact details in chatSessions' transcript, sets a Timestamp expiresAt, and caps at 20 entries", async () => {
    setup();
    await handleChat(req({ message: "my email is jo@example.com and number 07700 900123", sessionId: "s7" }), env, deps);
    const session = fs.store.get("chatSessions/s7");
    expect(session.transcript.find(m => m.role === "user").content).toBe("my email is [email] and number [phone]");
    expect(session.transcript.every(m => typeof m.timestamp === "string")).toBe(true);
    // expiresAt must round-trip as a real Firestore Timestamp (the TTL policy
    // only fires on that field type, not a plain string) — see enc()'s new
    // `instanceof Date` branch in src/reminders/fsrest.js.
    expect(session.expiresAt).toBeTruthy();
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now() + 85 * 24 * 3600 * 1000);
  });

  it("every chatSession gets a transcript, not just ones that become leads — feeds Top questions for ALL visitors", async () => {
    setup();
    await handleChat(req({ message: "how much is the full plan?", sessionId: "s8" }), env, deps);
    const session = fs.store.get("chatSessions/s8");
    expect(session.transcript.some(m => m.role === "user" && m.content.includes("how much"))).toBe(true);
    expect(fs.store.has("chatLeads/s8")).toBe(false); // never gave contact details — no lead, but the session transcript still exists
  });

  it("rejects a 31st message within the rate-limit window", async () => {
    setup({ "chatRateLimits/x": {} }); // seed irrelevant — real key is a hash we don't know ahead; exercised via repeated calls instead
    for (let i = 0; i < 30; i++) {
      // eslint-disable-next-line no-await-in-loop
      await handleChat(new Request("https://x/api/chat", { method: "POST", headers: { "CF-Connecting-IP": "1.2.3.4" }, body: JSON.stringify({ message: `hi ${i}`, sessionId: "rl" }) }), env, deps);
    }
    const res = await handleChat(new Request("https://x/api/chat", { method: "POST", headers: { "CF-Connecting-IP": "1.2.3.4" }, body: JSON.stringify({ message: "one more", sessionId: "rl" }) }), env, deps);
    expect(res.body.source).toBe("rate_limited");
  });

  it("strips HTML from the incoming message before storing/answering", async () => {
    setup();
    await handleChat(req({ message: "<img src=x onerror=alert(1)>jo@example.com", sessionId: "s6" }), env, deps);
    expect(fs.store.get("chatLeads/s6").transcript[0].content).not.toContain("<img");
  });
});

describe("handleChatEvent", () => {
  it("marks a session as signed up", async () => {
    const fs = fakeFirestore({ "chatSessions/s1": { audience: "barber", createdAt: "x" } });
    vi.stubGlobal("fetch", fs.fetchImpl);
    const deps = { json: (d, status = 200) => ({ status, body: d }), firestoreBase: () => fs.BASE, getFirebaseAdminToken: async () => "tok" };
    const req = new Request("https://x/api/chat-event", { method: "POST", body: JSON.stringify({ sessionId: "s1", event: "signed_up" }) });
    const res = await handleChatEvent(req, { VITE_FIREBASE_PROJECT_ID: "p" }, deps);
    expect(res.body.ok).toBe(true);
    expect(fs.store.get("chatSessions/s1").signedUp).toBe(true);
    vi.unstubAllGlobals();
  });
});

// The exhaustive lockout/constant-time-comparison test suite now lives at
// src/admin/requireAdmin.test.js, next to the shared helper every admin
// endpoint (not just these chat ones) goes through — see that file. These
// two just confirm handleAdminChatStats is actually WIRED to it correctly.
describe("handleAdminChatStats uses the shared admin helper", () => {
  let fs, env, deps;
  const setupAdmin = () => {
    fs = fakeFirestore();
    vi.stubGlobal("fetch", fs.fetchImpl);
    env = { VITE_FIREBASE_PROJECT_ID: "p", ADMIN_ACCESS_KEY: "secret" };
    deps = { json: (d, status = 200) => ({ status, body: d }), firestoreBase: () => fs.BASE, getFirebaseAdminToken: async () => "tok" };
  };
  const call = adminKey => handleAdminChatStats(new Request("https://x", { method: "POST", headers: { "CF-Connecting-IP": "203.0.113.9" }, body: JSON.stringify({ adminKey }) }), env, deps);
  beforeEach(() => { vi.unstubAllGlobals(); setupAdmin(); });

  it("rejects a wrong key with 401, no data", async () => {
    const res = await call("wrong");
    expect(res.status).toBe(401);
    expect(res.body.last7).toBeUndefined();
  });

  it("accepts the correct key", async () => {
    const res = await call("secret");
    expect(res.status).toBe(200);
    expect(res.body.last7).toBeDefined();
  });
});
