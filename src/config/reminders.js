// Single source of truth for the client-reminder system: plan limits, the
// reminder schedule options and their defaults. Plain JS (no React, no
// import.meta.env) — imported by both the dashboard and src/worker.js.
// Change a limit here and nothing else needs touching.
import { normalizePlanId } from "./plans.js";

// ── Monthly caps (reset on the 1st of each month, in the business's timezone) ─
export const REMINDER_EMAIL_LIMIT_BASIC = 150;
export const REMINDER_EMAIL_LIMIT_FULL  = 500;
export const SMS_LIMIT_FULL             = 30;

// Master switch for the SMS last-resort channel. OFF for now (no SMS provider
// set up): the Full plan behaves like Basic for reminders (push -> email), and
// all SMS UI is hidden. Set to true once Twilio secrets are configured.
export const SMS_ENABLED = false;

// Dashboard banner fires when usage passes this fraction, and again at 100%.
export const USAGE_WARN_THRESHOLD = 0.8;

// Every business has a `timezone` field (IANA name). Missing/invalid values
// fall back to this. There is no UI to change it yet.
export const DEFAULT_TIMEZONE = "Europe/London";

// The cron runs every 5 minutes; a reminder is still sent if it's up to this
// many minutes late (covers a missed/slow run) but never after the appointment.
export const REMINDER_WINDOW_MINUTES = 20;
export const PUSH_TIMEOUT_MS = 5000;

// Reminder schedule options. "before" = N minutes before the appointment,
// "morning" = a fixed local time on the day of the appointment.
export const REMINDER_OFFSETS = {
  h24:     { id: "h24",     kind: "before",  minutes: 24 * 60, label: "24 hours before",   short: "24h" },
  morning: { id: "morning", kind: "morning",                   label: "Morning of the appointment", short: "Morning" },
  h2:      { id: "h2",      kind: "before",  minutes: 120,     label: "2 hours before",    short: "2h" },
  h1:      { id: "h1",      kind: "before",  minutes: 60,      label: "1 hour before",     short: "1h" },
};
export const REMINDER_OFFSET_IDS = Object.keys(REMINDER_OFFSETS);

export const DEFAULT_REMINDER_SETTINGS = {
  enabled: true,
  offsets: { h24: true, morning: true, h2: false, h1: false },
  morningTime: "08:00",
  smsFallback: false,
};

// Channel rules per plan. Chain order is always push → email → sms, stopping
// at the first success. Free = push only with one fixed reminder.
const FREE  = { push: true, email: false, sms: false, emailLimit: 0,                        smsLimit: 0,            editableSchedule: false };
const BASIC = { push: true, email: true,  sms: false, emailLimit: REMINDER_EMAIL_LIMIT_BASIC, smsLimit: 0,            editableSchedule: true };
const FULL  = { push: true, email: true,  sms: SMS_ENABLED,  emailLimit: REMINDER_EMAIL_LIMIT_FULL,  smsLimit: SMS_LIMIT_FULL, editableSchedule: true };

export const REMINDER_PLAN_RULES = {
  free: FREE,
  basic: BASIC,
  widget: BASIC, // £5 plan — same reminder entitlements as Basic
  full: FULL,
};

export function reminderRulesFor(planId) {
  return REMINDER_PLAN_RULES[normalizePlanId(planId)] || FREE;
}

// Effective settings for a business RIGHT NOW: the saved settings clamped by
// the CURRENT plan. The Worker calls this at send time, so a downgrade takes
// effect immediately (pending reminders become push-only) and an upgrade
// applies to reminders due from that point.
export function resolveReminderSettings(planId, saved = {}) {
  const rules = reminderRulesFor(planId);
  const s = saved || {};
  const enabled = s.enabled !== false;
  if (!rules.editableSchedule) {
    return { enabled, offsets: ["h24"], morningTime: DEFAULT_REMINDER_SETTINGS.morningTime, smsFallback: false, rules };
  }
  const merged = { ...DEFAULT_REMINDER_SETTINGS.offsets, ...(s.offsets || {}) };
  const offsets = REMINDER_OFFSET_IDS.filter(id => merged[id]);
  const morningTime = /^\d{2}:\d{2}$/.test(s.morningTime || "") ? s.morningTime : DEFAULT_REMINDER_SETTINGS.morningTime;
  return { enabled, offsets, morningTime, smsFallback: rules.sms && s.smsFallback === true, rules };
}
