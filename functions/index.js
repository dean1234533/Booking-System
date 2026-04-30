const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const cors = require("cors")({ origin: true });

admin.initializeApp();

const stripeSecret = defineSecret("STRIPE_SECRET_KEY");

exports.createPaymentIntent = onRequest(
  { secrets: [stripeSecret] },
  (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const stripe = Stripe(stripeSecret.value());
      const { amount, currency = "gbp", metadata = {} } = req.body;

      if (!amount || typeof amount !== "number") {
        return res.status(400).json({ error: "Invalid amount" });
      }

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency,
          automatic_payment_methods: { enabled: true },
          metadata,
        });
        return res.status(200).json({ clientSecret: paymentIntent.client_secret });
      } catch (err) {
        console.error("createPaymentIntent error:", err);
        return res.status(500).json({ error: err.message });
      }
    });
  }
);

exports.requestRefund = onRequest(
  { secrets: [stripeSecret] },
  (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const stripe = Stripe(stripeSecret.value());
      const { paymentIntentId, slotDate } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ error: "Missing paymentIntentId" });
      }

      const slot = new Date(slotDate);
      const hoursUntilSlot = (slot - Date.now()) / (1000 * 60 * 60);

      if (hoursUntilSlot <= 24) {
        return res.status(200).json({
          refunded: false,
          reason: "Cancellation is within 24 hours of the appointment.",
        });
      }

      try {
        await stripe.refunds.create({ payment_intent: paymentIntentId });
        return res.status(200).json({ refunded: true });
      } catch (err) {
        console.error("requestRefund error:", err);
        return res.status(500).json({ error: err.message });
      }
    });
  }
);

