// Client-reminder engine for the Cloudflare Worker: the 5-minute cron, the
// client push opt-in endpoints, the owner test endpoint and the Resend bounce
// webhook. Worker-only helpers (Web Push sender, admin token, Firestore base,
// JSON responder, Resend) are injected through `deps` so this file has no
// circular import with worker.js.
//
// Channel chain per reminder (see chain.js): push -> email -> sms, first
// success wins, one channel per reminder. Plan gating is re-read from the
// business document at send time.
import {
  REMINDER_OFFSETS, PUSH_TIMEOUT_MS, DEFAULT_TIMEZONE,
  reminderRulesFor, resolveReminderSettings,
} from "../config/reminders.js";
import { zonedDateStr, zonedMonthKey, dayWord, safeTimezone } from "./time.js";
import { dueReminders, reminderLogId } from "./schedule.js";
import { runChain, isValidEmail } from "./chain.js";
import { normaliseUkMobile, smsSenderId, buildSmsText, sendSms } from "./sms.js";
import { fsClient, eq, and, isIn, sha256Hex } from "./fsrest.js";

const SITE = "https://bookrightly.co.uk";
const manageUrl = id => `${SITE}/manage-booking/${id}`;
const shortUrl  = id => `${SITE}/m/${id}`;

// Only genuine browser push services — the Worker POSTs to whatever endpoint is
// stored, and the opt-in endpoint is public, so this blocks SSRF.
const PUSH_HOST_SUFFIXES = ["fcm.googleapis.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com", "push.microsoft.com"];
export function isAllowedPushEndpoint(endpoint) {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && PUSH_HOST_SUFFIXES.some(s => u.hostname === s || u.hostname.endsWith("." + s));
  } catch { return false; }
}

const isDry = (env, opts) => opts?.dryRun === true || String(env.REMINDERS_DRY_RUN || "").toLowerCase() === "true";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function client(env, deps) {
  const token = await deps.getFirebaseAdminToken(env);
  if (!token) throw new Error("no firebase admin token");
  return fsClient(deps.firestoreBase(env.VITE_FIREBASE_PROJECT_ID), env.VITE_FIREBASE_PROJECT_ID, token);
}

function businessInfo(barber) {
  return {
    name: barber.businessName || barber.name || "your appointment",
    brandColor: barber.brandColor || "#2563EB",
    logoUrl: /^https:\/\//.test(barber.logoUrl || "") ? barber.logoUrl : null,
    plan: barber.plan,
    timezone: safeTimezone(barber.timezone || DEFAULT_TIMEZONE),
    cancellationPolicy: barber.cancellationPolicy || "",
    settings: barber.reminderSettings || {},
  };
}

// ── Content ──────────────────────────────────────────────────────────────────
function pushPayload({ biz, booking, bookingId, offsetId, nowMs }) {
  const day = dayWord(booking.date, nowMs, biz.timezone);
  return {
    title: `${biz.name} ${day} at ${booking.time}`,
    body: `${booking.haircutStyle || booking.serviceName || "Your appointment"}. Tap to view or reschedule.`,
    icon: biz.logoUrl || "/images/icon-192.png",
    url: `/manage-booking/${bookingId}`,
    tag: `reminder-${bookingId}-${offsetId}`,
    kind: "reminder", sound: true, vibrate: true,
  };
}

function reminderEmailHtml({ biz, booking, bookingId, day }) {
  const color = biz.brandColor;
  const row = (l, v) => v ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;">${l}</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#1a1a1a;">${esc(v)}</td></tr>` : "";
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:16px;overflow:hidden;background:#fff;">
      <div style="background:${color};padding:32px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:22px;font-weight:900;">See you ${esc(day)}!</h1></div>
      <div style="padding:32px;">
        <p style="color:#444;line-height:1.6;">Hi ${esc(booking.name || "there")}, just a reminder about your appointment with <strong>${esc(biz.name)}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0;">
          ${row("Date", booking.date)}${row("Time", booking.time)}${row("Service", booking.haircutStyle || booking.serviceName)}
        </table>
        <div style="text-align:center;margin:8px 0 20px;">
          <a href="${manageUrl(bookingId)}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;font-weight:700;padding:12px 26px;border-radius:999px;">View or reschedule</a>
        </div>
        ${biz.cancellationPolicy ? `<p style="color:#666;font-size:12px;line-height:1.6;"><strong>Cancellation policy:</strong> ${esc(biz.cancellationPolicy)}</p>` : ""}
        <p style="color:#666;font-size:12px;text-align:center;margin-top:20px;">
          <a href="${manageUrl(bookingId)}?enable=push" style="color:${color};">Get reminders on your phone instead</a>
        </p>
        <footer style="margin-top:32px;padding-top:20px;border-top:1px solid #eee;font-size:11px;color:#bbb;text-align:center;">Sent by Bookrightly on behalf of ${esc(biz.name)}.</footer>
      </div>
    </div>`;
}

// ── Adapters ─────────────────────────────────────────────────────────────────
function makePushAdapter({ subs, payload, env, deps, fs, dry, log }) {
  return async () => {
    if (dry) return { ok: true, dryRun: true };
    const results = await Promise.all(subs.map(async s => {
      try {
        await deps.sendWebPush({ endpoint: s.endpoint, keys: s.keys }, payload, env, { signal: AbortSignal.timeout(PUSH_TIMEOUT_MS) });
        return { s, ok: true };
      } catch (err) {
        const gone = err.status === 404 || err.status === 410;
        return { s, ok: false, gone, reason: err.name === "TimeoutError" ? "timeout" : err.message };
      }
    }));
    for (const r of results) {
      if (r.gone && r.s.id) await fs.del(`pushSubscriptions/${r.s.id}`).catch(() => {});
      if (r.ok && r.s.id) await fs.patch(`pushSubscriptions/${r.s.id}`, { lastSuccessAt: new Date().toISOString() }).catch(() => {});
    }
    if (results.some(r => r.ok)) return { ok: true };
    return { ok: false, gone: results.length > 0 && results.every(r => r.gone), reason: results[0]?.reason || "push-failed" };
  };
}
function makeEmailAdapter({ to, subject, html, env, deps, dry }) {
  return async () => {
    if (dry) return { ok: true, dryRun: true };
    if (!env.RESEND_API_KEY) return { ok: false, reason: "email-not-configured" };
    const resend = new deps.Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: "Bookrightly <info@bookrightly.co.uk>", to: [to], subject, html });
    return error ? { ok: false, reason: error.message || "provider-error" } : { ok: true };
  };
}
function makeSmsAdapter({ to, from, body, env, dry }) {
  return async () => (dry ? { ok: true, dryRun: true } : sendSms({ to, from, body }, env, { signal: AbortSignal.timeout(8000) }));
}

// ── Push subscriptions ───────────────────────────────────────────────────────
async function findSubscriptions(fs, booking, cache) {
  const email = (booking.email || "").trim().toLowerCase();
  const phone = normaliseUkMobile(booking.phone) || "";
  const key = `${email}|${phone}`;
  if (cache.has(key)) return cache.get(key);
  const byId = new Map();
  const add = d => { if (d?.endpoint && d?.keys?.p256dh && d?.keys?.auth) byId.set(d.id, d); };
  if (email) (await fs.query({ from: [{ collectionId: "pushSubscriptions" }], where: eq("clientEmail", email), limit: 5 })).forEach(add);
  if (phone) (await fs.query({ from: [{ collectionId: "pushSubscriptions" }], where: eq("clientPhone", phone), limit: 5 })).forEach(add);
  // Legacy: subscription stored on the booking itself by the old opt-in.
  if (booking.pushSubscription) {
    try { const l = JSON.parse(booking.pushSubscription); if (l?.endpoint && isAllowedPushEndpoint(l.endpoint)) byId.set("legacy", { id: null, endpoint: l.endpoint, keys: l.keys }); } catch {}
  }
  const subs = [...byId.values()];
  cache.set(key, subs);
  return subs;
}

// ── The cron ─────────────────────────────────────────────────────────────────
export async function runReminderCron(env, deps, opts = {}) {
  const nowMs = opts.nowMs ?? Date.now();
  const dry = isDry(env, opts);
  const fs = await client(env, deps);
  const summary = { dryRun: dry, examined: 0, due: 0, sent: 0, skipped: 0, failed: 0, decisions: [] };

  // Candidate appointment dates: business timezones differ, so cover a 4-day UTC span.
  const dates = [...new Set([-24, 0, 24, 48].map(h => new Date(nowMs + h * 3600e3).toISOString().slice(0, 10)))];
  const bookings = await fs.query({
    from: [{ collectionId: "bookings" }],
    where: and([eq("status", "confirmed"), isIn("date", dates)]),
  });

  const barberCache = new Map(), usageCache = new Map(), subCache = new Map(), bounceCache = new Map();
  const getBarber = async id => {
    if (!barberCache.has(id)) barberCache.set(id, await fs.get(`barbers/${id}`));
    return barberCache.get(id);
  };

  for (const booking of bookings) {
    summary.examined++;
    try {
      if (!booking.barberId || !booking.date || !booking.time) continue;
      const barber = await getBarber(booking.barberId);
      if (!barber) continue;
      const biz = businessInfo(barber);
      const effective = resolveReminderSettings(biz.plan, biz.settings); // CURRENT plan, at send time
      if (!effective.enabled) continue;
      const due = dueReminders({ booking, effective, tz: biz.timezone, nowMs });
      const rules = effective.rules;

      for (const d of due) {
        const logId = reminderLogId(booking.id, d.offsetId, booking.date, booking.time);
        if (!dry && await fs.get(`reminderLogs/${logId}`)) continue; // already handled
        summary.due++;

        const month = zonedMonthKey(nowMs, biz.timezone);
        const base = {
          bookingId: booking.id, businessId: booking.barberId, offset: d.offsetId,
          apptDate: booking.date, apptTime: booking.time, month, timezone: biz.timezone,
          createdAt: new Date(nowMs).toISOString(), plan: biz.plan || "free",
        };

        // Free: check push FIRST, before any other work.
        const subs = await findSubscriptions(fs, booking, subCache);
        if (!rules.email && !rules.sms && subs.length === 0) {
          const rec = { ...base, finalChannel: "none", status: "skipped", reason: "no-push", skipReason: "no-push", sentAt: null,
            attempts: [{ channel: "push", status: "skipped", reason: "no-push", at: new Date().toISOString() }] };
          if (dry) {
            const decision = { logId, plan: biz.plan || "free", tz: biz.timezone, finalChannel: "none", status: "skipped", reason: "no-push", attempts: rec.attempts };
            console.log("[reminders][dry-run]", JSON.stringify(decision));
            summary.decisions.push(decision);
            summary.skipped++;
          } else if ((await fs.create("reminderLogs", logId, rec)) === "created") summary.skipped++;
          continue;
        }

        // Idempotency: claim this reminder BEFORE sending anything.
        if (!dry) {
          const claim = await fs.create("reminderLogs", logId, { ...base, finalChannel: "pending", status: "processing", reason: null, attempts: [], sentAt: null });
          if (claim === "exists") continue;
        }

        if (!usageCache.has(booking.barberId + month)) {
          usageCache.set(booking.barberId + month, (await fs.get(`barbers/${booking.barberId}/reminderUsage/${month}`)) || {});
        }
        const usage = usageCache.get(booking.barberId + month);
        const phone = normaliseUkMobile(booking.phone);
        const day = dayWord(booking.date, nowMs, biz.timezone);
        const payload = pushPayload({ biz, booking, bookingId: booking.id, offsetId: d.offsetId, nowMs });
        const email = (booking.email || "").trim().toLowerCase();

        const result = await runChain(
          { rules, settings: effective, hasPush: subs.length > 0, email, phone, usage: { email: usage.email || 0, sms: usage.sms || 0 } },
          {
            push: makePushAdapter({ subs, payload, env, deps, fs, dry }),
            email: makeEmailAdapter({ to: email, subject: `Reminder: ${biz.name} ${day} at ${booking.time}`, html: reminderEmailHtml({ biz, booking, bookingId: booking.id, day }), env, deps, dry }),
            sms: makeSmsAdapter({ to: phone, from: smsSenderId(biz.name), body: buildSmsText({ service: booking.haircutStyle || booking.serviceName, business: biz.name, day, time: booking.time, shortLink: shortUrl(booking.id) }), env, dry }),
          },
          { emailBounced: async () => {
              if (!bounceCache.has(email)) bounceCache.set(email, Boolean(await fs.get(`emailSuppressions/${await sha256Hex(email)}`)));
              return bounceCache.get(email);
            } },
        );

        summary[result.status === "sent" ? "sent" : result.status === "skipped" ? "skipped" : "failed"]++;
        const decision = { logId, plan: biz.plan || "free", tz: biz.timezone, finalChannel: result.finalChannel, status: result.status, reason: result.reason, attempts: result.attempts };
        if (dry) { console.log("[reminders][dry-run]", JSON.stringify(decision)); summary.decisions.push(decision); continue; }

        await fs.patch(`reminderLogs/${logId}`, {
          finalChannel: result.finalChannel, status: result.status, reason: result.reason || null,
          skipReason: result.reason === "limit-reached" ? "limit-reached" : null,
          attempts: result.attempts, sentAt: result.status === "sent" ? new Date().toISOString() : null,
        });
        const counter = result.finalChannel === "push" ? "push" : result.usedCounter;
        if (counter) {
          await fs.increment(`barbers/${booking.barberId}/reminderUsage/${month}`, counter, 1);
          usage[counter] = (usage[counter] || 0) + 1;
        }
      }
    } catch (err) {
      console.error(`[reminders] booking ${booking.id} failed:`, err);
    }
  }
  return summary;
}

// ── POST /api/client-push-subscribe (also /api/subscribe-booking-reminder) ───
// Body: { bookingId, subscription }. Contact details come from the booking
// (server-side), never from the request, so a caller can only ever register a
// device against the client on a booking they hold the unguessable id of.
export async function handleClientPushSubscribe(request, env, deps) {
  if (request.method !== "POST") return deps.json({ error: "Method not allowed" }, 405);
  let body; try { body = await request.json(); } catch { return deps.json({ error: "Invalid JSON" }, 400); }
  const { bookingId, subscription } = body ?? {};
  const keys = subscription?.keys;
  if (!bookingId || !subscription?.endpoint || !keys?.p256dh || !keys?.auth) return deps.json({ error: "Missing bookingId or subscription" }, 400);
  if (!isAllowedPushEndpoint(subscription.endpoint)) return deps.json({ error: "Unsupported push endpoint" }, 400);
  try {
    const fs = await client(env, deps);
    const booking = await fs.get(`bookings/${bookingId}`);
    if (!booking) return deps.json({ error: "Booking not found" }, 404);
    const id = await sha256Hex(subscription.endpoint);
    const existing = await fs.get(`pushSubscriptions/${id}`);
    await fs.patch(`pushSubscriptions/${id}`, {
      clientEmail: (booking.email || "").trim().toLowerCase(),
      clientPhone: normaliseUkMobile(booking.phone) || "",
      businessId: booking.barberId || "",
      endpoint: subscription.endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      createdAt: existing?.createdAt || new Date().toISOString(),
      lastSuccessAt: existing?.lastSuccessAt || null,
    });
    return deps.json({ ok: true });
  } catch (err) {
    console.error("[client-push-subscribe]", err);
    return deps.json({ error: err.message }, 500);
  }
}

// GET /api/client-push-status?bookingId=… -> { subscribed } so returning clients
// (matched by email/phone) aren't asked to opt in again.
export async function handleClientPushStatus(request, env, deps) {
  const bookingId = new URL(request.url).searchParams.get("bookingId");
  if (!bookingId) return deps.json({ error: "Missing bookingId" }, 400);
  try {
    const fs = await client(env, deps);
    const booking = await fs.get(`bookings/${bookingId}`);
    if (!booking) return deps.json({ subscribed: false });
    const subs = await findSubscriptions(fs, booking, new Map());
    return deps.json({ subscribed: subs.length > 0 });
  } catch { return deps.json({ subscribed: false }); }
}

// ── POST /api/reminders/test (owner only) ────────────────────────────────────
// Body: { channel: "push"|"email"|"sms"|"chain", simulate?: "push-fail"|"push-email-fail" }
// Sends to the business owner. Limited to the channels the CURRENT plan allows.
// Test sends never touch the monthly usage counters.
export async function handleReminderTest(request, env, deps) {
  if (request.method !== "POST") return deps.json({ error: "Method not allowed" }, 405);
  let body; try { body = await request.json(); } catch { body = {}; }
  const uid = await deps.verifyFirebaseUid(request, env);
  if (!uid) return deps.json({ error: "Unauthorized" }, 401);
  try {
    const fs = await client(env, deps);
    const barber = await fs.get(`barbers/${uid}`);
    if (!barber) return deps.json({ error: "Business not found" }, 404);
    const biz = businessInfo(barber);
    const effective = resolveReminderSettings(biz.plan, biz.settings);
    const rules = effective.rules;
    const { channel = "push", simulate } = body;
    if (channel === "email" && !rules.email) return deps.json({ error: "Email reminders aren't included in your plan." }, 403);
    if (channel === "sms" && !rules.sms) return deps.json({ error: "SMS reminders are only on the Full plan." }, 403);
    if ((channel === "chain" || simulate) && !rules.editableSchedule) return deps.json({ error: "Chain simulation is for paid plans." }, 403);

    const nowMs = Date.now();
    const tz = biz.timezone;
    const sample = { date: zonedDateStr(nowMs + 86400e3, tz), time: "10:00", name: barber.name || "there", haircutStyle: "Test appointment", email: barber.email || "", phone: barber.phone || "" };
    const ownerSub = barber.pushSubscription?.endpoint && barber.pushSubscription?.keys?.p256dh
      ? [{ id: null, endpoint: barber.pushSubscription.endpoint, keys: barber.pushSubscription.keys }] : [];
    const day = "tomorrow";
    const email = (sample.email || "").trim().toLowerCase();
    const phone = normaliseUkMobile(sample.phone);
    const payload = { ...pushPayload({ biz, booking: sample, bookingId: "test", offsetId: "test", nowMs }), url: "/dashboard?tab=reminders", title: `[Test] ${biz.name} ${day} at 10:00` };
    const adapters = {
      push: makePushAdapter({ subs: ownerSub, payload, env, deps, fs, dry: false }),
      email: makeEmailAdapter({ to: email, subject: `[Test] Reminder: ${biz.name} ${day} at 10:00`, html: reminderEmailHtml({ biz, booking: sample, bookingId: "test", day }), env, deps, dry: false }),
      sms: makeSmsAdapter({ to: phone, from: smsSenderId(biz.name), body: buildSmsText({ service: "Test appointment", business: biz.name, day, time: "10:00", shortLink: shortUrl("test") }), env, dry: false }),
    };

    if (channel === "chain") {
      const force = simulate === "push-email-fail" ? { push: false, email: false } : { push: false };
      const result = await runChain(
        { rules, settings: { ...effective, smsFallback: rules.sms }, hasPush: ownerSub.length > 0, email, phone, usage: { email: 0, sms: 0 }, force }, adapters);
      return deps.json({ ok: result.status === "sent", result });
    }
    if (channel === "push" && ownerSub.length === 0) return deps.json({ ok: false, error: "Turn on your own push notifications first (Settings → Notifications), then try again." });
    if (channel === "email" && !isValidEmail(email)) return deps.json({ ok: false, error: "No email address on your business profile." });
    if (channel === "sms" && !phone) return deps.json({ ok: false, error: "No valid UK mobile number on your business profile." });
    const r = await adapters[channel]();
    return deps.json({ ok: r.ok, error: r.ok ? undefined : r.reason });
  } catch (err) {
    console.error("[reminders-test]", err);
    return deps.json({ error: err.message }, 500);
  }
}

// ── POST /api/resend-webhook — Svix-signed bounce events ─────────────────────
// Records HARD bounces so future reminders skip email for that address.
export async function handleResendWebhook(request, env, deps) {
  if (request.method !== "POST") return deps.json({ error: "Method not allowed" }, 405);
  if (!env.RESEND_WEBHOOK_SECRET) return deps.json({ error: "Webhook not configured" }, 500);
  const raw = await request.text();
  const id = request.headers.get("svix-id"), ts = request.headers.get("svix-timestamp"), sigHeader = request.headers.get("svix-signature");
  if (!id || !ts || !sigHeader || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return deps.json({ error: "Bad signature" }, 401);
  const secretBytes = Uint8Array.from(atob(env.RESEND_WEBHOOK_SECRET.replace(/^whsec_/, "")), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${raw}`)))));
  if (!sigHeader.split(" ").some(s => s.replace(/^v1,/, "") === expected)) return deps.json({ error: "Bad signature" }, 401);

  let evt; try { evt = JSON.parse(raw); } catch { return deps.json({ ok: true }); }
  if (evt.type === "email.bounced" && String(evt.data?.bounce?.type || "").toLowerCase() === "permanent") {
    const fs = await client(env, deps);
    for (const addr of evt.data?.to || []) {
      const email = String(addr).trim().toLowerCase();
      await fs.patch(`emailSuppressions/${await sha256Hex(email)}`, { email, emailBounced: true, bouncedAt: new Date().toISOString() }).catch(() => {});
      const subs = await fs.query({ from: [{ collectionId: "pushSubscriptions" }], where: eq("clientEmail", email), limit: 10 }).catch(() => []);
      for (const s of subs) await fs.patch(`pushSubscriptions/${s.id}`, { emailBounced: true }).catch(() => {});
    }
  }
  return deps.json({ ok: true });
}
