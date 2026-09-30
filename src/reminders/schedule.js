// Pure "which reminders are due right now?" logic. No I/O.
import { REMINDER_OFFSETS, REMINDER_WINDOW_MINUTES } from "../config/reminders.js";
import { zonedToUtcMs } from "./time.js";

// The instant a given reminder should go out, in the business's timezone.
export function reminderSendAtMs(offsetId, { date, time }, morningTime, tz) {
  const apptMs = zonedToUtcMs(date, time, tz);
  if (!Number.isFinite(apptMs)) return { apptMs: NaN, sendAtMs: NaN };
  const def = REMINDER_OFFSETS[offsetId];
  if (!def) return { apptMs, sendAtMs: NaN };
  const sendAtMs = def.kind === "morning" ? zonedToUtcMs(date, morningTime, tz) : apptMs - def.minutes * 60 * 1000;
  return { apptMs, sendAtMs };
}

// Whether a reminder should exist at all for this booking: it must go out
// after the booking was created and before the appointment starts.
export function reminderApplies(sendAtMs, apptMs, createdAtMs = 0) {
  return Number.isFinite(sendAtMs) && Number.isFinite(apptMs) && sendAtMs >= createdAtMs && sendAtMs < apptMs;
}

// Reminders whose send time falls in [now - window, now] and haven't started
// the appointment yet.
export function dueReminders({ booking, effective, tz, nowMs, windowMinutes = REMINDER_WINDOW_MINUTES }) {
  const createdAtMs = booking.createdAt ? Date.parse(booking.createdAt) || 0 : 0;
  const out = [];
  for (const offsetId of effective.offsets) {
    const { apptMs, sendAtMs } = reminderSendAtMs(offsetId, booking, effective.morningTime, tz);
    if (!reminderApplies(sendAtMs, apptMs, createdAtMs)) continue;
    if (nowMs >= apptMs) continue;
    if (nowMs < sendAtMs || nowMs >= sendAtMs + windowMinutes * 60 * 1000) continue;
    out.push({ offsetId, sendAtMs, apptMs });
  }
  return out;
}

export function reminderLogId(bookingId, offsetId, date, time) {
  return `${bookingId}_${offsetId}_${date}_${String(time || "").replace(":", "")}`;
}
