// src/stripe/stripeClient.js
// Calls Vercel serverless functions for all Stripe operations.
// Works locally with "vercel dev" and in production automatically.

import { loadStripe } from "@stripe/stripe-js";

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// In development (vercel dev): calls http://localhost:3000/api/...
// In production (Vercel):      calls https://your-app.vercel.app/api/...
// No env variable needed — /api/ always resolves to the right place.
const API_BASE = "/api";

// ─── Create Payment Intent ────────────────────────────────────────────────────
export async function createPaymentIntent({ amount, bookingMeta }) {
  const response = await fetch(`${API_BASE}/createPaymentIntent`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      amount,           // in pounds — server converts to pence
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
export async function requestRefund({ paymentIntentId, slotDate }) {
  const response = await fetch(`${API_BASE}/requestRefund`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ paymentIntentId, slotDate }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error ?? "Failed to process refund");
  }

  return await response.json(); // { refunded: true | false }
}