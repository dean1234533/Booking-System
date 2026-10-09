import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAdmin, verifyAdminKey, constantTimeEqual, LOCKOUT_DURATION_MS } from "./requireAdmin.js";
import { enc, decDoc, sha256Hex, fsClient } from "../reminders/fsrest.js";

// Same in-memory Firestore fake used by src/reminders/reminders.test.js and
// src/chat/chat.test.js.
function fakeFirestore(seed = {}) {
  const store = new Map(Object.entries(seed));
  const BASE = "https://fs.test/documents";
  const wrap = (path, d) => ({ name: `projects/p/databases/(default)/documents/${path}`, fields: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, enc(v)])) });
  const fetchImpl = vi.fn(async (url, init = {}) => {
    url = String(url);
    const method = init.method || "GET";
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

describe("constantTimeEqual", () => {
  it("matches identical strings and rejects anything else, regardless of shared prefix length", async () => {
    expect(await constantTimeEqual("correct-key-12345", "correct-key-12345")).toBe(true);
    expect(await constantTimeEqual("correct-key-00000", "correct-key-12345")).toBe(false); // long shared prefix — timing must not leak this
    expect(await constantTimeEqual("", "correct-key-12345")).toBe(false);
    expect(await constantTimeEqual("correct-key-12345", "")).toBe(false);
    expect(await constantTimeEqual(undefined, "correct-key-12345")).toBe(false);
  });
});

describe("verifyAdminKey (Firestore-backed lockout)", () => {
  let fake, fs;
  const ip = "203.0.113.7";
  beforeEach(() => {
    fake = fakeFirestore();
    vi.stubGlobal("fetch", fake.fetchImpl);
    fs = fsClient(fake.BASE, "p", "tok");
  });

  it("accepts the correct key and resets a prior failure count", async () => {
    await verifyAdminKey(fs, ip, "wrong", "secret");
    await verifyAdminKey(fs, ip, "wrong", "secret");
    const ok = await verifyAdminKey(fs, ip, "secret", "secret");
    expect(ok).toEqual({ ok: true, locked: false });
    const doc = fake.store.get(`adminAuthAttempts/${await sha256Hex(ip)}`);
    expect(doc.failedCount).toBe(0);
  });

  it("locks the IP after the 5th failed attempt within the window — the 6th attempt is 429 even with the right key", async () => {
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      const r = await verifyAdminKey(fs, ip, "wrong", "secret");
      expect(r).toEqual({ ok: false, locked: false }); // each of the first 5 is a genuine wrong-key rejection
    }
    const sixth = await verifyAdminKey(fs, ip, "secret", "secret"); // correct key, but now locked
    expect(sixth).toEqual({ ok: false, locked: true });
  });

  it("the correct key works again once the lock has expired", async () => {
    vi.useFakeTimers();
    try {
      for (let i = 0; i < 5; i++) await verifyAdminKey(fs, ip, "wrong", "secret"); // eslint-disable-line no-await-in-loop
      expect(await verifyAdminKey(fs, ip, "secret", "secret")).toEqual({ ok: false, locked: true });
      vi.advanceTimersByTime(LOCKOUT_DURATION_MS + 1000);
      expect(await verifyAdminKey(fs, ip, "secret", "secret")).toEqual({ ok: true, locked: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects without ever matching when no real key is configured at all", async () => {
    expect(await verifyAdminKey(fs, ip, "anything", undefined)).toEqual({ ok: false, locked: false });
  });

  it("records failedCount/firstFailedAt/expiresAt (a real Timestamp) and never the submitted key", async () => {
    await verifyAdminKey(fs, ip, "some-guessed-key", "secret");
    const doc = fake.store.get(`adminAuthAttempts/${await sha256Hex(ip)}`);
    expect(doc).toMatchObject({ ip, failedCount: 1 });
    expect(typeof doc.firstFailedAt).toBe("number");
    expect(doc.expiresAt).toBeTruthy();
    expect(JSON.stringify(doc)).not.toContain("some-guessed-key");
  });

  it("logs failed attempts via console.warn without the submitted key, and never logs on success", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await verifyAdminKey(fs, ip, "guess-1", "secret");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0].join(" ")).not.toContain("guess-1");
    await verifyAdminKey(fs, ip, "secret", "secret");
    expect(warn).toHaveBeenCalledTimes(1); // still just the one failure — the successful call logged nothing
    warn.mockRestore();
  });

  it("never tracks lockout when no IP is available, but the key check itself still runs", async () => {
    expect(await verifyAdminKey(fs, null, "secret", "secret")).toEqual({ ok: true, locked: false });
    expect(await verifyAdminKey(fs, null, "wrong", "secret")).toEqual({ ok: false, locked: false });
    expect(fake.store.size).toBe(0); // nothing written — there's no IP to key a doc on
  });

  it("a failure outside the 15-minute window starts a fresh count instead of accumulating", async () => {
    vi.useFakeTimers();
    try {
      for (let i = 0; i < 4; i++) await verifyAdminKey(fs, ip, "wrong", "secret"); // eslint-disable-line no-await-in-loop
      vi.advanceTimersByTime(16 * 60 * 1000); // past the 15-minute window
      const r = await verifyAdminKey(fs, ip, "wrong", "secret"); // would be the 5th (lockout) if the window hadn't reset
      expect(r).toEqual({ ok: false, locked: false });
      const doc = fake.store.get(`adminAuthAttempts/${await sha256Hex(ip)}`);
      expect(doc.failedCount).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("requireAdmin (high-level Worker-route helper)", () => {
  let fs, env, deps;
  const ip = "203.0.113.42";
  beforeEach(() => {
    fs = fakeFirestore();
    vi.stubGlobal("fetch", fs.fetchImpl);
    env = { VITE_FIREBASE_PROJECT_ID: "p", ADMIN_ACCESS_KEY: "secret" };
    deps = { firestoreBase: () => fs.BASE, getFirebaseAdminToken: async () => "tok" };
  });
  const req = adminKey => new Request("https://x", { method: "POST", headers: { "CF-Connecting-IP": ip }, body: JSON.stringify({ adminKey }) });

  it("returns null (proceed) for the correct key", async () => {
    expect(await requireAdmin(req("secret"), env, deps, { adminKey: "secret" })).toBeNull();
  });
  it("returns 401 for a wrong key", async () => {
    expect(await requireAdmin(req("wrong"), env, deps, { adminKey: "wrong" })).toEqual({ status: 401, error: "Invalid admin key" });
  });
  it("returns 429 once locked, same shared collection as verifyAdminKey", async () => {
    for (let i = 0; i < 5; i++) await requireAdmin(req("wrong"), env, deps, { adminKey: "wrong" }); // eslint-disable-line no-await-in-loop
    expect(await requireAdmin(req("secret"), env, deps, { adminKey: "secret" })).toEqual({ status: 429, error: "Too many attempts. Try again later." });
  });
  it("returns 500 if the Firebase admin token itself can't be obtained", async () => {
    deps.getFirebaseAdminToken = async () => null;
    const res = await requireAdmin(req("secret"), env, deps, { adminKey: "secret" });
    expect(res.status).toBe(500);
  });
});
