// src/stripe/stripeClient.js
// Stripe helpers for deposit payment and refunds.
// Uses Stripe.js on the client side.
// Refund logic should run server-side via a Firebase Cloud Function in production.

import { loadStripe } from "@stripe/stripe-js";

// Load Stripe once and reuse the promise — never call loadStripe() inside a component
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ─── Create Payment Intent ────────────────────────────────────────────────────
// In production this should be a Firebase Cloud Function (HTTP callable)
// so the secret key never touches the browser.
// For now this shows the shape of the call — swap the URL for your function endpoint.
//
// The Cloud Function should:
//   1. Receive { amount, currency, bookingMeta }
//   2. Create a PaymentIntent with Stripe server SDK
//   3. Return { clientSecret }
//
export async function createPaymentIntent({ amount, bookingMeta }) {
  // Replace this URL with your Firebase Cloud Function endpoint
  const response = await fetch(
    "https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/createPaymentIntent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Stripe uses pence/cents
        currency: "gbp",
        metadata: bookingMeta,           // slotId, barberId etc for reference
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to create payment intent");
  }

  const { clientSecret } = await response.json();
  return clientSecret;
}

// ─── Issue Refund ─────────────────────────────────────────────────────────────
// Should also be a Cloud Function — Stripe refunds require the secret key.
// Called from Dashboard when barber cancels a booking within the refund window.
//
// The Cloud Function should:
//   1. Receive { paymentIntentId }
//   2. Check the slot date vs now (>24hrs = refund, <=24hrs = no refund)
//   3. Issue refund via Stripe if applicable
//   4. Return { refunded: true/false }
//
export async function requestRefund({ paymentIntentId, slotDate }) {
  const response = await fetch(
    "https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/requestRefund",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId, slotDate }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to process refund");
  }

  return await response.json(); // { refunded: true | false }
}

// ─── .env additions needed ────────────────────────────────────────────────────
// VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
// (Never put your secret key in .env — it must stay on the server)
