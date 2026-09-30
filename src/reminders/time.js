// Timezone helpers for reminder scheduling. Every function takes the
// business's IANA timezone (business.timezone, default Europe/London), so
// nothing here hardcodes a zone and BST/GMT (or any other DST) changes are
// handled by Intl rather than by manual offsets.
import { DEFAULT_TIMEZONE } from "../config/reminders.js";

export function safeTimezone(tz) {
  if (!tz || typeof tz !== "string") return DEFAULT_TIMEZONE;
  try { new Intl.DateTimeFormat("en-GB", { timeZone: tz }); return tz; }
  catch { return DEFAULT_TIMEZONE; }
}

const fmtCache = new Map();
function fmt(tz) {
  if (!fmtCache.has(tz)) {
    fmtCache.set(tz, new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }));
  }
  return fmtCache.get(tz);
}

// Wall-clock parts of an instant in `tz`.
export function zonedParts(ms, tz) {
  const o = {};
  for (const p of fmt(safeTimezone(tz)).formatToParts(new Date(ms))) if (p.type !== "literal") o[p.type] = Number(p.value);
  return o; // { year, month, day, hour, minute, second }
}

// tz offset (ms) at an instant: local-wall-clock-as-UTC minus the real UTC.
function offsetMs(ms, tz) {
  const p = zonedParts(ms, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

// "2026-03-29" + "09:30" in `tz` -> UTC epoch ms. Two passes so the result is
// right on either side of a DST change.
export function zonedToUtcMs(dateStr, timeStr, tz) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const [H, M] = String(timeStr || "00:00").split(":").map(Number);
  if (![y, m, d, H, M].every(Number.isFinite)) return NaN;
  const zone = safeTimezone(tz);
  const guess = Date.UTC(y, m - 1, d, H, M);
  let t = guess - offsetMs(guess, zone);
  t = guess - offsetMs(t, zone);
  return t;
}

const pad = n => String(n).padStart(2, "0");
export function zonedDateStr(ms, tz) {
  const p = zonedParts(ms, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}
export function zonedMonthKey(ms, tz) {
  const p = zonedParts(ms, tz);
  return `${p.year}-${pad(p.month)}`;
}

// "today" / "tomorrow" / "Saturday" — relative to `nowMs` in the business zone.
export function dayWord(dateStr, nowMs, tz) {
  const today = zonedDateStr(nowMs, tz);
  if (dateStr === today) return "today";
  if (dateStr === zonedDateStr(nowMs + 24 * 3600 * 1000, tz)) return "tomorrow";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}
