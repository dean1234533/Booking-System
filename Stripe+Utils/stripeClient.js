// src/stripe/stripeClient.js
// Calls Firebase Cloud Functions for all Stripe operations.
// The secret key never touches the browser — it lives in the Cloud Function.

import { loadStripe } from "@stripe/stripe-js";

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Base URL for your deployed Cloud Functions.
// Add this to your .env file once you have deployed:
//   VITE_FUNCTIONS_URL=https://us-central1-YOUR_PROJECT.cloudfunctions.net
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL;

// ─── Create Payment Intent ────────────────────────────────────────────────────
// Called from BookingForm before showing the Stripe payment element.
// amount is in pounds (e.g. 10 for £10) — the Cloud Function converts to pence.
export async function createPaymentIntent({ amount, bookingMeta }) {
  const response = await fetch(`${FUNCTIONS_URL}/createPaymentIntent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount,
      currency: "gbp",
      metadata: bookingMeta,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error ?? "Failed to create payment intent");
  }

  const { clientSecret } = await response.json();
  return clientSecret;
}

// ─── Request Refund ───────────────────────────────────────────────────────────
// Called from BookingCard in the Dashboard when a barber cancels a booking.
// The Cloud Function checks the 24hr window and issues the refund if eligible.
export async function requestRefund({ paymentIntentId, slotDate }) {
  const response = await fetch(`${FUNCTIONS_URL}/requestRefund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentIntentId, slotDate }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error ?? "Failed to process refund");
  }

  return await response.json(); // { refunded: true | false }
}