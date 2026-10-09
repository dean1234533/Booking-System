"use strict";

// Cloud Functions equivalent of src/admin/requireAdmin.js (the Worker-side
// helper) — same per-IP lockout logic, same constant-time comparison, and
// crucially the SAME Firestore collection (adminAuthAttempts) and field
// shape, so a lockout triggered against a Worker endpoint also blocks that
// IP here, and vice versa — both backends read the same Firestore database
// (booking-system-cdce0), there's just no way to literally share one JS
// module across a Cloudflare Worker and a Node Cloud Function.
//
// Node 22 (see functions/package.json's engines field) exposes the Web
// Crypto API globally, so this uses the exact same crypto.subtle calls as
// the Worker side rather than Node's legacy `crypto` module API.
const admin = require("firebase-admin");

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const ATTEMPT_TTL_DAYS = 1;

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function constantTimeEqual(a, b) {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(String(a ?? ""))),
    crypto.subtle.digest("SHA-256", enc.encode(String(b ?? ""))),
  ]);
  const ua = new Uint8Array(da);
  const ub = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

// Returns { ok, locked }, same contract as the Worker's verifyAdminKey.
// `ip` may be null — see the Worker-side comment; same tradeoff applies.
async function requireAdmin(ip, submittedKey, realKey) {
  const db = admin.firestore();
  const now = Date.now();
  const docId = ip ? await sha256Hex(ip) : null;
  const ref = docId ? db.collection("adminAuthAttempts").doc(docId) : null;
  const snap = ref ? await ref.get() : null;
  const doc = snap && snap.exists ? snap.data() : null;

  if (doc && doc.lockedUntil && now < doc.lockedUntil) {
    return {ok: false, locked: true};
  }

  const match = realKey ? await constantTimeEqual(submittedKey || "", realKey) : false;

  if (match) {
    if (ref && doc && (doc.failedCount > 0 || doc.lockedUntil)) {
      await ref.set({failedCount: 0, lockedUntil: null}, {merge: true});
    }
    return {ok: true, locked: false};
  }

  if (ref) {
    const windowExpired = !doc || !doc.firstFailedAt || now - doc.firstFailedAt > LOCKOUT_WINDOW_MS;
    const firstFailedAt = windowExpired ? now : doc.firstFailedAt;
    const failedCount = windowExpired ? 1 : (doc.failedCount || 0) + 1;
    const lockedUntil = failedCount >= LOCKOUT_THRESHOLD ? now + LOCKOUT_DURATION_MS : null;
    await ref.set({
      ip, failedCount, firstFailedAt, lockedUntil,
      expiresAt: admin.firestore.Timestamp.fromMillis(now + ATTEMPT_TTL_DAYS * 24 * 3600 * 1000),
    }, {merge: true}).catch((err) => console.error("[admin-auth] failed to record attempt:", err.message));
    // Never log the submitted key itself — only the fact that an attempt failed.
    console.warn("[admin-auth] failed admin key attempt", JSON.stringify({ip, failedCount, at: new Date(now).toISOString()}));
  }
  return {ok: false, locked: false};
}

module.exports = {requireAdmin, constantTimeEqual};
