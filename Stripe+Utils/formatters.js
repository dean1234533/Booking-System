// src/utils/formatters.js
// Date, time and currency formatters used across the app.

// Format a Firestore Timestamp or JS Date to a readable date string
// e.g. "Monday 12 May 2025"
export function formatDate(dateOrTimestamp) {
  const date =
    dateOrTimestamp?.toDate?.() // Firestore Timestamp
    ?? new Date(dateOrTimestamp);

  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  });
}

// Format a time string e.g. "10:00" → "10:00 AM"
export function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// Format pence/cents to a currency string e.g. 1000 → "£10.00"
export function formatCurrency(amountInPounds) {
  return new Intl.NumberFormat("en-GB", {
    style:    "currency",
    currency: "GBP",
  }).format(amountInPounds);
}

// Check if a slot date is more than 24 hours away — used for refund eligibility
export function isRefundEligible(slotDate) {
  const slot = slotDate?.toDate?.() ?? new Date(slotDate);
  const hoursUntilSlot = (slot - Date.now()) / (1000 * 60 * 60);
  return hoursUntilSlot > 24;
}

// Shorten long text for card previews e.g. bio snippets
export function truncate(str, maxLength = 100) {
  if (!str) return "";
  return str.length <= maxLength ? str : str.slice(0, maxLength).trimEnd() + "…";
}
