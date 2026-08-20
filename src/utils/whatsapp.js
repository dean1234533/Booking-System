// Builds a wa.me deep link with a pre-filled booking message. Free — no
// WhatsApp Business API, just a link, matching how WhatsApp is used
// elsewhere in the app (PT client chat links).
export function getWhatsAppBookingUrl(number, businessName) {
  if (!number) return null;
  let digits = String(number).replace(/[^\d+]/g, "");
  if (digits.startsWith("0")) digits = "44" + digits.slice(1);
  digits = digits.replace(/^\+/, "");
  if (!digits) return null;
  const message = `Hi${businessName ? " " + businessName : ""}, I'd like to book an appointment.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
