import { loadStripe } from '@stripe/stripe-js';

/**
 * ✅ FRONTEND STRIPE CLIENT
 * This file initializes Stripe for your browser.
 * It MUST be exported as 'stripePromise' to match your BookingForm.jsx import.
 */

const publicKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!publicKey) {
  console.error("VITE_STRIPE_PUBLISHABLE_KEY is missing from your .env file!");
}

export const stripePromise = loadStripe(publicKey);

/**
 * ✅ ADDED: requestRefund function
 * This sends the refund request to your server-side API.
 */
export async function requestRefund({ paymentIntentId, stripeAccountId, date, time }) {
  try {
    const response = await fetch("/api/cancel-refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        paymentIntentId, 
        stripeAccountId, 
        date, 
        time 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Refund failed");
    }

    return await response.json();
  } catch (err) {
    console.error("Stripe Client Refund Error:", err);
    throw err;
  }
}