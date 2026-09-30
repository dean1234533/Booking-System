// Turns reminderLogs + settings into the per-booking status shown in the dashboard.
import { REMINDER_OFFSETS, resolveReminderSettings } from "../config/reminders";
import { reminderSendAtMs, reminderApplies } from "../reminders/schedule";
import { safeTimezone } from "../reminders/time";

const CH = { push: "push", email: "email", sms: "SMS" };

export function describeLog(log, plan) {
  if (!log) return null;
  if (log.status === "sent") return `${CH[log.finalChannel] || log.finalChannel} ✓`;
  if (log.status === "processing") return "sending…";
  if (log.reason === "limit-reached") return "skipped: limit reached";
  if (log.reason === "no-push") return (!plan || plan === "free") ? "no reminder, notifications off" : "no push";
  return "failed";
}

// -> [{ id, label, text, status }] for one booking, e.g. "24h: push ✓".
export function bookingReminderSummary(booking, logsByKey, barber) {
  const tz = safeTimezone(barber?.timezone);
  const effective = resolveReminderSettings(barber?.plan, barber?.reminderSettings);
  if (!effective.enabled) return [];
  const createdAtMs = booking.createdAt ? Date.parse(booking.createdAt) || 0 : 0;
  const out = [];
  for (const id of effective.offsets) {
    const log = logsByKey[`${booking.id}_${id}`];
    if (log) { out.push({ id, label: REMINDER_OFFSETS[id].short, text: describeLog(log, barber?.plan), status: log.status }); continue; }
    const { apptMs, sendAtMs } = reminderSendAtMs(id, booking, effective.morningTime, tz);
    if (booking.status !== "cancelled" && reminderApplies(sendAtMs, apptMs, createdAtMs) && sendAtMs > Date.now()) {
      out.push({ id, label: REMINDER_OFFSETS[id].short, text: "scheduled", status: "scheduled" });
    }
  }
  return out;
}

// Index logs by bookingId_offset (the newest wins if a booking was rescheduled).
export function indexLogs(logs) {
  const m = {};
  for (const l of logs) {
    const k = `${l.bookingId}_${l.offset}`;
    if (!m[k] || (l.createdAt || "") > (m[k].createdAt || "")) m[k] = l;
  }
  return m;
}
