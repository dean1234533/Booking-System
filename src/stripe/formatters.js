export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-GB", {
    style:    "currency",
    currency: "GBP",
  }).format(amount || 0);
}

export function formatDate(dateOrTimestamp) {
  if (!dateOrTimestamp) return "";
  const date = dateOrTimestamp?.toDate?.() ?? new Date(dateOrTimestamp);
  return date.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export function formatTime(timeStr) {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function isRefundEligible(slotDate) {
  if (!slotDate) return false;
  const slot = slotDate?.toDate?.() ?? new Date(slotDate);
  return (slot - Date.now()) / (1000 * 60 * 60) > 24;
}