// Shared brute-force protection for EVERY admin-key-gated endpoint in the
// Cloudflare Worker (chat leads/stats, reminders, churn feedback, trial
// lifecycle, demo-slot maintenance, the account-setup email tool). A
// per-IP lockout tracked in Firestore (adminAuthAttempts) so it survives
// across the Worker's many isolates, plus a constant-time key comparison.
// The equivalent for the three Cloud Functions admin routes lives at
// functions/adminAuth.js — same collection, same field shapes, so a
// lockout triggered via one backend applies to the other too (both read
// the same Firestore database).
import { fsClient, sha256Hex } from "../reminders/fsrest.js";

export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;   // failures must land within this window to count toward a lockout
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // how long a locked-out IP stays locked
const ATTEMPT_TTL_DAYS = 1; // 24 hours — see the Firestore TTL setup step in the delivery summary

// Hashes both sides to a fixed 32-byte SHA-256 digest before comparing, so
// neither the submitted key's length nor its content can be inferred from
// how long the comparison takes — a plain `===` on the raw strings returns
// as soon as it finds the first differing character, which leaks exactly
// how many leading characters an attacker already has right. No early exit
// anywhere in the byte loop below, by design.
export async function constantTimeEqual(a, b) {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(String(a ?? ""))),
    crypto.subtle.digest("SHA-256", enc.encode(String(b ?? ""))),
  ]);
  const ua = new Uint8Array(da), ub = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i]; // both always 32 bytes (SHA-256 output) — nothing to early-exit on
  return diff === 0;
}

// Returns one of:
//   { ok: true  }                — key correct; that IP's failure count was reset
//   { ok: false, locked: true }  — IP is currently locked out; the submitted
//                                   key was never even looked at
//   { ok: false, locked: false } — key wrong (or no real key configured at
//                                   all), not yet locked
//
// `ip` may be null (e.g. a missing CF-Connecting-IP header in local dev) —
// lockout tracking is skipped in that case, but the key check itself still
// runs; this only weakens brute-force *tracking*, never the check, and the
// header is always present on real Cloudflare traffic.
export async function verifyAdminKey(fs, ip, submittedKey, realKey) {
  const now = Date.now();
  const path = ip ? `adminAuthAttempts/${await sha256Hex(ip)}` : null;
  const doc = path ? await fs.get(path).catch(() => null) : null;

  // Locked — the submitted key is never hashed or compared at all.
  if (doc?.lockedUntil && now < doc.lockedUntil) {
    return { ok: false, locked: true };
  }

  const match = realKey ? await constantTimeEqual(submittedKey || "", realKey) : false;

  if (match) {
    if (path && doc && (doc.failedCount > 0 || doc.lockedUntil)) {
      await fs.patch(path, { failedCount: 0, lockedUntil: null }).catch(() => {});
    }
    return { ok: true, locked: false };
  }

  if (path) {
    const windowExpired = !doc?.firstFailedAt || now - doc.firstFailedAt > LOCKOUT_WINDOW_MS;
    const firstFailedAt = windowExpired ? now : doc.firstFailedAt;
    const failedCount = windowExpired ? 1 : (doc.failedCount || 0) + 1;
    const lockedUntil = failedCount >= LOCKOUT_THRESHOLD ? now + LOCKOUT_DURATION_MS : null;
    await fs.patch(path, {
      ip, failedCount, firstFailedAt, lockedUntil,
      expiresAt: new Date(now + ATTEMPT_TTL_DAYS * 24 * 3600 * 1000),
    }).catch(err => console.error("[admin-auth] failed to record attempt:", err.message));
    // Never log the submitted key itself — only the fact that an attempt failed.
    console.warn("[admin-auth] failed admin key attempt", JSON.stringify({ ip, failedCount, at: new Date(now).toISOString() }));
  }
  return { ok: false, locked: false };
}

// High-level helper every Worker admin route calls first, with the request
// body it already parsed. `deps` needs { firestoreBase, getFirebaseAdminToken }
// — the same two worker.js functions every other Firestore-touching handler
// in this file already uses. Returns null if the request may proceed, or
// `{ status, error }` to send straight back to the caller.
export async function requireAdmin(request, env, deps, body) {
  let fs;
  try {
    const token = await deps.getFirebaseAdminToken(env);
    if (!token) throw new Error("no admin token");
    fs = fsClient(deps.firestoreBase(env.VITE_FIREBASE_PROJECT_ID), env.VITE_FIREBASE_PROJECT_ID, token);
  } catch (err) {
    return { status: 500, error: "Server not configured" };
  }
  const ip = request.headers.get("CF-Connecting-IP");
  const auth = await verifyAdminKey(fs, ip, body?.adminKey, env.ADMIN_ACCESS_KEY);
  if (auth.locked) return { status: 429, error: "Too many attempts. Try again later." };
  if (!auth.ok) return { status: 401, error: "Invalid admin key" };
  return null;
}
