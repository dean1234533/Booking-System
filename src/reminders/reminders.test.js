import { describe, it, expect, vi, beforeEach } from "vitest";
import { runChain } from "./chain.js";
import { runReminderCron } from "./service.js";
import { dueReminders, reminderSendAtMs } from "./schedule.js";
import { zonedToUtcMs, zonedMonthKey, safeTimezone } from "./time.js";
import { normaliseUkMobile, smsSenderId, buildSmsText } from "./sms.js";
import { resolveReminderSettings, reminderRulesFor } from "../config/reminders.js";
import { enc, dec, decDoc } from "./fsrest.js";

const ok = () => ({ ok: true });
const fail = reason => () => ({ ok: false, reason });
const gone = () => ({ ok: false, gone: true, reason: "410" });
// SMS is globally off for now (SMS_ENABLED=false), so chain tests that exercise
// the SMS step switch it on for the Full plan explicitly.
const mk = (plan, over = {}) => {
  const base = resolveReminderSettings(plan, { smsFallback: true });
  const settings = plan === "full" ? { ...base, smsFallback: true, rules: { ...base.rules, sms: true } } : base;
  return { rules: settings.rules, settings, hasPush: true, email: "a@b.co", phone: "+447700900123", usage: { email: 0, sms: 0 }, ...over };
};
const spies = (o = {}) => ({ push: vi.fn(o.push || ok), email: vi.fn(o.email || ok), sms: vi.fn(o.sms || ok) });

describe("channel chain", () => {
  it("Free sends push only and stops", async () => {
    const a = spies();
    const r = await runChain(mk("free"), a);
    expect(r.finalChannel).toBe("push");
    expect(a.email).not.toHaveBeenCalled();
    expect(a.sms).not.toHaveBeenCalled();
  });
  it("Free client without push gets nothing (no email, no SMS)", async () => {
    const a = spies();
    const r = await runChain(mk("free", { hasPush: false }), a);
    expect(r).toMatchObject({ finalChannel: "none", status: "skipped", reason: "no-push" });
    expect(a.push).not.toHaveBeenCalled();
    expect(a.email).not.toHaveBeenCalled();
    expect(a.sms).not.toHaveBeenCalled();
  });
  it("Free never falls back when push errors, and 410 is skipped not failed", async () => {
    const a = spies({ push: fail("boom") });
    expect((await runChain(mk("free"), a)).status).toBe("failed");
    const b = spies({ push: gone });
    const r = await runChain(mk("free"), b);
    expect(r).toMatchObject({ status: "skipped", deleteSubscription: true });
    expect(a.email).not.toHaveBeenCalled();
    expect(b.email).not.toHaveBeenCalled();
  });
  it("Basic never sends SMS, even when everything else fails", async () => {
    const a = spies({ push: fail("x"), email: fail("bounce") });
    const r = await runChain(mk("basic"), a);
    expect(a.sms).not.toHaveBeenCalled();
    expect(r.status).toBe("failed");
  });
  it("Basic without push falls back to email; one channel only", async () => {
    const a = spies();
    const r = await runChain(mk("basic", { hasPush: false }), a);
    expect(r.finalChannel).toBe("email");
    expect(r.usedCounter).toBe("email");
    expect(a.push).not.toHaveBeenCalled();
    expect(a.sms).not.toHaveBeenCalled();
  });
  it("Full: push fails -> email fails -> SMS", async () => {
    const a = spies({ push: fail("x"), email: fail("y") });
    const r = await runChain(mk("full"), a);
    expect(r).toMatchObject({ finalChannel: "sms", usedCounter: "sms" });
  });
  it("Full: SMS only when the business switched it on and the number is a UK mobile", async () => {
    const off = { ...mk("full"), settings: { ...mk("full").settings, smsFallback: false }, hasPush: false, email: "" };
    const a = spies();
    expect((await runChain(off, a)).status).toBe("failed");
    expect(a.sms).not.toHaveBeenCalled();
    const b = spies();
    await runChain({ ...mk("full"), hasPush: false, email: "", phone: null }, b);
    expect(b.sms).not.toHaveBeenCalled();
  });
  it("skips email over its cap and logs 'skipped: limit reached' when nothing is left", async () => {
    const a = spies();
    const r = await runChain(mk("basic", { hasPush: false, usage: { email: 150, sms: 0 } }), a);
    expect(a.email).not.toHaveBeenCalled();
    expect(r).toMatchObject({ status: "skipped", reason: "limit-reached" });
  });
  it("cap hit on email moves down the chain to SMS on Full", async () => {
    const a = spies();
    const r = await runChain(mk("full", { hasPush: false, usage: { email: 500, sms: 0 } }), a);
    expect(r.finalChannel).toBe("sms");
  });
  it("skips email for bounced / missing / invalid addresses", async () => {
    for (const [email, checks] of [["a@b.co", { emailBounced: async () => true }], ["", {}], ["nope", {}]]) {
      const a = spies();
      await runChain(mk("basic", { hasPush: false, email }), a, checks);
      expect(a.email).not.toHaveBeenCalled();
    }
  });
  it("simulated push failure forces the fallback", async () => {
    const a = spies();
    const r = await runChain(mk("basic", { force: { push: false } }), a);
    expect(a.push).not.toHaveBeenCalled();
    expect(r.finalChannel).toBe("email");
  });
});

describe("plan gating", () => {
  it("downgrade clamps to push-only 24h; upgrade restores fallbacks", () => {
    const saved = { offsets: { h24: false, morning: true, h2: true }, smsFallback: true };
    expect(resolveReminderSettings("free", saved)).toMatchObject({ offsets: ["h24"], smsFallback: false });
    expect(resolveReminderSettings("basic", saved).smsFallback).toBe(false);
    expect(resolveReminderSettings("full", saved)).toMatchObject({ offsets: ["morning", "h2"], smsFallback: false }); // SMS_ENABLED is false
    expect(reminderRulesFor("full").sms).toBe(false);
    expect(reminderRulesFor("mini").email).toBe(false); // legacy alias -> free
  });
});

describe("timezones and scheduling", () => {
  it("handles BST/GMT: London 09:00 is 08:00Z in summer, 09:00Z in winter", () => {
    expect(new Date(zonedToUtcMs("2026-07-01", "09:00", "Europe/London")).toISOString()).toBe("2026-07-01T08:00:00.000Z");
    expect(new Date(zonedToUtcMs("2026-12-01", "09:00", "Europe/London")).toISOString()).toBe("2026-12-01T09:00:00.000Z");
  });
  it("24h before is an exact 24 hours across the clocks-back change", () => {
    const { apptMs, sendAtMs } = reminderSendAtMs("h24", { date: "2026-10-25", time: "10:00" }, "08:00", "Europe/London");
    expect(new Date(apptMs).toISOString()).toBe("2026-10-25T10:00:00.000Z");
    expect(new Date(sendAtMs).toISOString()).toBe("2026-10-24T10:00:00.000Z");
  });
  it("uses the business's own timezone, not London", () => {
    expect(new Date(zonedToUtcMs("2026-07-01", "09:00", "America/New_York")).toISOString()).toBe("2026-07-01T13:00:00.000Z");
    expect(zonedMonthKey(Date.parse("2026-07-31T23:30:00Z"), "Europe/London")).toBe("2026-08");
    expect(zonedMonthKey(Date.parse("2026-07-31T23:30:00Z"), "America/New_York")).toBe("2026-07");
    expect(safeTimezone("Not/AZone")).toBe("Europe/London");
    expect(safeTimezone(undefined)).toBe("Europe/London");
  });
  it("morning-of follows the business zone; skips if before booking or after appointment", () => {
    const eff = resolveReminderSettings("basic", { offsets: { h24: false, morning: true, h2: false, h1: false }, morningTime: "08:00" });
    const booking = { date: "2026-07-01", time: "12:00", createdAt: "2026-06-30T00:00:00Z" };
    const at = zonedToUtcMs("2026-07-01", "08:00", "Europe/London");
    expect(dueReminders({ booking, effective: eff, tz: "Europe/London", nowMs: at + 60000 })).toHaveLength(1);
    expect(dueReminders({ booking, effective: eff, tz: "Europe/London", nowMs: at + 30 * 60000 })).toHaveLength(0); // window passed
    expect(dueReminders({ booking: { ...booking, createdAt: "2026-07-01T07:30:00Z" }, effective: eff, tz: "Europe/London", nowMs: at + 60000 })).toHaveLength(0); // booked after send time
    expect(dueReminders({ booking: { ...booking, time: "07:30" }, effective: eff, tz: "Europe/London", nowMs: at + 60000 })).toHaveLength(0); // after appointment start
  });
});

describe("SMS helpers", () => {
  it("normalises UK mobiles to E.164 and rejects the rest", () => {
    for (const n of ["07700 900123", "+44 7700 900123", "0044 7700-900123", "447700900123"]) expect(normaliseUkMobile(n)).toBe("+447700900123");
    for (const n of ["01632 960123", "12345", "", null, "+15551234567"]) expect(normaliseUkMobile(n)).toBeNull();
  });
  it("sender ID is alphanumeric, max 11, with fallback", () => {
    expect(smsSenderId("Fade Factory Barbers!")).toBe("FadeFactory");
    expect(smsSenderId("!!! 123")).toBe("Bookrightly");
  });
  it("template stays within 160 chars and keeps the link", () => {
    const link = "https://bookrightly.co.uk/m/abcdefghijklmnopqrst";
    const t = buildSmsText({ service: "Very long service name ".repeat(6), business: "An extremely long business name ".repeat(4), day: "tomorrow", time: "10:00", shortLink: link });
    expect(t.length).toBeLessThanOrEqual(160);
    expect(t).toContain(link);
  });
});

// ── End-to-end cron against an in-memory Firestore ───────────────────────────
function fakeFirestore(seed) {
  const store = new Map(Object.entries(seed));
  const BASE = "https://fs.test/documents";
  const calls = [];
  const wrap = (path, d) => ({ name: `projects/p/databases/(default)/documents/${path}`, fields: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, enc(v)])) });
  const match = (d, f) => {
    if (f.compositeFilter) return f.compositeFilter.filters.every(x => match(d, x));
    const { field, op, value } = f.fieldFilter;
    const v = dec(value);
    return op === "EQUAL" ? d[field.fieldPath] === v : v.includes(d[field.fieldPath]);
  };
  const fetchImpl = vi.fn(async (url, init = {}) => {
    url = String(url);
    calls.push(url);
    const method = init.method || "GET";
    if (url.endsWith(":runQuery")) {
      const q = JSON.parse(init.body).structuredQuery;
      const col = q.from[0].collectionId;
      const rows = [...store].filter(([p]) => p.split("/").length === 2 && p.startsWith(col + "/")).filter(([, d]) => !q.where || match(d, q.where));
      return new Response(JSON.stringify(rows.length ? rows.map(([p, d]) => ({ document: wrap(p, d) })) : [{}]));
    }
    if (url.endsWith(":commit")) {
      const t = JSON.parse(init.body).writes[0].transform;
      const path = t.document.split("/documents/")[1];
      const d = store.get(path) || {};
      const f = t.fieldTransforms[0];
      d[f.fieldPath] = (d[f.fieldPath] || 0) + Number(f.increment.integerValue);
      store.set(path, d);
      return new Response("{}");
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
  return { store, fetchImpl, calls, BASE };
}

describe("reminder cron (idempotent, plan-gated, timezone-aware)", () => {
  // London business, appointment 2026-10-11 10:00 BST = 09:00Z; 24h before = 2026-10-10 09:00Z.
  const NOW = Date.parse("2026-10-10T09:05:00Z");
  let env, deps, fs, sent;
  const setup = (barber, booking = {}, extra = {}) => {
    fs = fakeFirestore({
      "barbers/b1": { uid: "b1", businessName: "Fade Factory", ...barber },
      "bookings/bk1": { barberId: "b1", status: "confirmed", date: "2026-10-11", time: "10:00", email: "c@x.co", phone: "07700 900123", name: "Jo", haircutStyle: "Skin fade", createdAt: "2026-10-01T00:00:00Z", ...booking },
      ...extra,
    });
    sent = { push: vi.fn(async () => ({})), email: vi.fn(async () => ({ error: null })) };
    vi.stubGlobal("fetch", fs.fetchImpl);
    env = { VITE_FIREBASE_PROJECT_ID: "p", RESEND_API_KEY: "k", TWILIO_ACCOUNT_SID: "AC", TWILIO_AUTH_TOKEN: "t" };
    deps = {
      json: d => d, firestoreBase: () => fs.BASE, getFirebaseAdminToken: async () => "tok", sendWebPush: sent.push,
      Resend: class { constructor() { this.emails = { send: sent.email }; } },
    };
  };
  beforeEach(() => vi.unstubAllGlobals());
  const log = () => fs.store.get("reminderLogs/bk1_h24_2026-10-11_1000");
  const twilioCalls = () => fs.calls.filter(u => u.includes("twilio")).length;
  const sub = { clientEmail: "c@x.co", clientPhone: "+447700900123", endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "a", auth: "b" } };

  it("Free client with no push subscription gets nothing and is logged for the upsell stat", async () => {
    setup({ plan: "free", timezone: "Europe/London" });
    await runReminderCron(env, deps, { nowMs: NOW });
    expect(sent.push).not.toHaveBeenCalled();
    expect(sent.email).not.toHaveBeenCalled();
    expect(twilioCalls()).toBe(0);
    expect(log()).toMatchObject({ status: "skipped", reason: "no-push", plan: "free", finalChannel: "none" });
  });
  it("Free client with push gets exactly one push", async () => {
    setup({ plan: "free" }, {}, { "pushSubscriptions/s1": sub });
    await runReminderCron(env, deps, { nowMs: NOW });
    expect(sent.push).toHaveBeenCalledTimes(1);
    expect(sent.email).not.toHaveBeenCalled();
    expect(log()).toMatchObject({ status: "sent", finalChannel: "push" });
    expect(fs.store.get("barbers/b1/reminderUsage/2026-10")).toMatchObject({ push: 1 });
  });
  it("is idempotent: repeated runs never resend", async () => {
    setup({ plan: "basic" });
    await runReminderCron(env, deps, { nowMs: NOW });
    await runReminderCron(env, deps, { nowMs: NOW + 5 * 60000 });
    expect(sent.email).toHaveBeenCalledTimes(1);
  });
  it("Basic without push emails, counts usage, and never touches SMS", async () => {
    setup({ plan: "basic", reminderSettings: { smsFallback: true } });
    await runReminderCron(env, deps, { nowMs: NOW });
    expect(sent.email).toHaveBeenCalledTimes(1);
    expect(twilioCalls()).toBe(0);
    expect(fs.store.get("barbers/b1/reminderUsage/2026-10").email).toBe(1);
    expect(log().finalChannel).toBe("email");
  });
  it("re-reads the current plan at send time: a downgraded business is push-only", async () => {
    setup({ plan: "free", reminderSettings: { offsets: { h24: true }, smsFallback: true } });
    await runReminderCron(env, deps, { nowMs: NOW });
    expect(sent.email).not.toHaveBeenCalled();
  });
  it("Basic email cap reached -> skipped: limit reached, no SMS", async () => {
    setup({ plan: "basic" }, {}, { "barbers/b1/reminderUsage/2026-10": { email: 150 } });
    await runReminderCron(env, deps, { nowMs: NOW });
    expect(sent.email).not.toHaveBeenCalled();
    expect(twilioCalls()).toBe(0);
    expect(log()).toMatchObject({ status: "skipped", reason: "limit-reached" });
  });
  it("uses the business timezone: same booking is not yet due for a New York business", async () => {
    setup({ plan: "basic", timezone: "America/New_York" }); // 10:00 New York = 14:00Z, so 24h-before is 14:00Z the day before
    await runReminderCron(env, deps, { nowMs: NOW });
    expect(sent.email).not.toHaveBeenCalled();
  });
  it("dead subscription (410) is deleted and a paid business falls back to email", async () => {
    setup({ plan: "basic" }, {}, { "pushSubscriptions/s1": sub });
    sent.push.mockRejectedValueOnce(Object.assign(new Error("gone"), { status: 410 }));
    await runReminderCron(env, deps, { nowMs: NOW });
    expect(fs.store.has("pushSubscriptions/s1")).toBe(false);
    expect(log().finalChannel).toBe("email");
  });
  it("dry run decides but sends and writes nothing", async () => {
    setup({ plan: "basic" });
    const r = await runReminderCron(env, deps, { nowMs: NOW, dryRun: true });
    expect(sent.email).not.toHaveBeenCalled();
    expect(log()).toBeUndefined();
    expect(r.decisions[0]).toMatchObject({ finalChannel: "email" });
  });
  it("cancelled bookings and reminders-off businesses are never reminded", async () => {
    setup({ plan: "basic" }, { status: "cancelled" });
    await runReminderCron(env, deps, { nowMs: NOW });
    expect(sent.email).not.toHaveBeenCalled();
    setup({ plan: "basic", reminderSettings: { enabled: false } });
    await runReminderCron(env, deps, { nowMs: NOW });
    expect(sent.email).not.toHaveBeenCalled();
  });
});
