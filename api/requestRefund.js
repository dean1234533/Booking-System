// api/requestRefund.js
// Vercel serverless function — becomes POST /api/requestRefund
// Checks the 24hr window and issues a Stripe refund if eligible.

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { paymentIntentId, slotDate } = req.body;

  if (!paymentIntentId) {
    return res.status(400).json({ error: "Missing paymentIntentId" });
  }

  // 24hr refund eligibility check — runs server-side so it can't be spoofed
  const slot           = new Date(slotDate);
  const hoursUntilSlot = (slot - Date.now()) / (1000 * 60 * 60);
  const isEligible     = hoursUntilSlot > 24;

  if (!isEligible) {
    return res.status(200).json({
      refunded: false,
      reason:   "Cancellation is within 24 hours of the appointment.",
    });
  }

  try {
    await stripe.refunds.create({ payment_intent: paymentIntentId });
    return res.status(200).json({ refunded: true });
  } catch (err) {
    console.error("requestRefund error:", err);
    return res.status(500).json({ error: err.message });
  }
};