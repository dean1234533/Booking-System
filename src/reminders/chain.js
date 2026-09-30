// The channel chain for ONE reminder: push -> email -> sms, stopping at the
// first channel that succeeds. Pure decision logic — every side effect goes
// through injected adapters, so it is unit-tested without a network.
//
// adapters.push()  -> { ok, gone?, reason? }     gone = 404/410 (subscription dead)
// adapters.email() -> { ok, reason? }
// adapters.sms()   -> { ok, reason? }
// checks.emailBounced() -> Promise<boolean>
//
// ctx: {
//   rules:    reminderRulesFor(plan)            (from CURRENT plan)
//   settings: resolveReminderSettings(...)      (smsFallback already plan-clamped)
//   hasPush, email, phone (E.164 or null), usage: { email, sms },
//   force: { push?: false, email?: false }      (test/simulation — force a channel to fail)
// }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isValidEmail = e => typeof e === "string" && EMAIL_RE.test(e.trim());

export async function runChain(ctx, adapters, checks = {}) {
  const { rules, settings, usage = { email: 0, sms: 0 }, force = {} } = ctx;
  const attempts = [];
  const note = (channel, status, reason) => attempts.push({ channel, status, ...(reason ? { reason } : {}), at: new Date().toISOString() });
  const call = async (fn, forcedOff) => {
    if (forcedOff === false) return { ok: false, reason: "simulated failure" };
    try { return await fn(); } catch (err) { return { ok: false, reason: err?.message || "error" }; }
  };
  const done = (finalChannel, status, reason, extra = {}) => ({ finalChannel, status, ...(reason ? { reason } : {}), attempts, ...extra });
  let deleteSubscription = false;

  // 1. PUSH — every plan
  if (rules.push && ctx.hasPush) {
    const r = await call(adapters.push, force.push);
    if (r.ok) { note("push", "sent"); return done("push", "sent"); }
    if (r.gone) deleteSubscription = true;
    note("push", "failed", r.gone ? "subscription-gone" : r.reason);
    if (!rules.email && !rules.sms) {
      // Free: 404/410 -> skipped, any other error -> failed. Never falls back.
      return deleteSubscription
        ? done("none", "skipped", "no-push", { deleteSubscription, usedCounter: null })
        : done("none", "failed", r.reason || "push-failed", { usedCounter: null });
    }
  } else {
    note("push", "skipped", "no-push");
    if (!rules.email && !rules.sms) return done("none", "skipped", "no-push", { usedCounter: null });
  }

  // 2. EMAIL — Basic/Full
  if (rules.email) {
    const email = ctx.email && ctx.email.trim();
    if (!email) note("email", "skipped", "no-email");
    else if (!isValidEmail(email)) note("email", "skipped", "invalid-email");
    else if (checks.emailBounced && await checks.emailBounced()) note("email", "skipped", "email-bounced");
    else if (usage.email >= rules.emailLimit) note("email", "skipped", "limit-reached");
    else {
      const r = await call(adapters.email, force.email);
      if (r.ok) { note("email", "sent"); return done("email", "sent", null, { deleteSubscription, usedCounter: "email" }); }
      note("email", "failed", r.reason || "email-failed");
    }
  }

  // 3. SMS — Full, only if the business switched it on
  if (rules.sms) {
    if (!settings.smsFallback) note("sms", "skipped", "sms-off");
    else if (!ctx.phone) note("sms", "skipped", "no-valid-mobile");
    else if (usage.sms >= rules.smsLimit) note("sms", "skipped", "limit-reached");
    else {
      const r = await call(adapters.sms, force.sms);
      if (r.ok) { note("sms", "sent"); return done("sms", "sent", null, { deleteSubscription, usedCounter: "sms" }); }
      note("sms", "failed", r.reason || "sms-failed");
    }
  }

  // Nothing delivered. A cap being the only thing that stopped us is logged
  // as "skipped: limit reached"; anything else is a failure with per-step reasons.
  const anyFailed = attempts.some(a => a.status === "failed");
  const limitHit = attempts.some(a => a.reason === "limit-reached");
  if (limitHit && !anyFailed) return done("none", "skipped", "limit-reached", { deleteSubscription, usedCounter: null });
  const reasons = attempts.map(a => `${a.channel}:${a.reason || a.status}`).join(", ");
  return done("none", "failed", reasons, { deleteSubscription, usedCounter: null });
}
