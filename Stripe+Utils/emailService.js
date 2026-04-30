// src/utils/emailService.js
// Sends confirmation emails to clients after a booking is made.
// Uses EmailJS (free tier supports ~200 emails/month) — no backend needed.
//
// Setup:
//   1. Create a free account at https://www.emailjs.com
//   2. Create an Email Service (Gmail works fine)
//   3. Create an Email Template with these variables:
//        {{client_name}}, {{barber_name}}, {{date}}, {{time}},
//        {{haircut_style}}, {{deposit_amount}}, {{booking_id}}
//   4. Add to your .env:
//        VITE_EMAILJS_SERVICE_ID=service_xxx
//        VITE_EMAILJS_TEMPLATE_ID=template_xxx
//        VITE_EMAILJS_PUBLIC_KEY=your_public_key

import emailjs from "@emailjs/browser";

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Send a booking confirmation to the client
export async function sendConfirmationEmail({
  clientName,
  clientEmail,
  barberName,
  date,
  time,
  haircutStyle,
  depositAmount,
  bookingId,
}) {
  const templateParams = {
    to_email:       clientEmail,
    client_name:    clientName,
    barber_name:    barberName,
    date,
    time,
    haircut_style:  haircutStyle,
    deposit_amount: `£${depositAmount}`,
    booking_id:     bookingId,
  };

  await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
}

// Send a cancellation email to the client
export async function sendCancellationEmail({
  clientName,
  clientEmail,
  barberName,
  date,
  time,
  refunded,
}) {
  const templateParams = {
    to_email:    clientEmail,
    client_name: clientName,
    barber_name: barberName,
    date,
    time,
    refund_status: refunded
      ? "A full refund of your deposit has been issued and should appear within 3–5 business days."
      : "As this was cancelled within 24 hours of your appointment, the deposit is non-refundable.",
  };

  // Use a separate cancellation template in EmailJS
  await emailjs.send(
    SERVICE_ID,
    import.meta.env.VITE_EMAILJS_CANCEL_TEMPLATE_ID,
    templateParams,
    PUBLIC_KEY
  );
}
