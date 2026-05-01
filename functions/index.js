const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// Define both secrets used by the system
const stripeSecret = defineSecret("STRIPE_SECRET_KEY");
const webhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// 1. CREATE PAYMENT INTENT
exports.createPaymentIntent = onRequest(
  { secrets: [stripeSecret] },
  (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

      const stripe = Stripe(stripeSecret.value());
      const { amount, currency = "gbp", metadata = {} } = req.body;

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Stripe expects cents
          currency,
          automatic_payment_methods: { enabled: true },
          metadata, // Pass slotId and barberId here from frontend
        });
        res.status(200).json({ clientSecret: paymentIntent.client_secret });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  }
);

// 2. STRIPE WEBHOOK (The "Safety Net")
exports.stripeWebhook = onRequest(
  { secrets: [stripeSecret, webhookSecret] },
  async (req, res) => {
    const stripe = Stripe(stripeSecret.value());
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      // Validates that the request actually came from Stripe
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        webhookSecret.value()
      );
    } catch (err) {
      console.error("Webhook Error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      const { slotId, barberId, clientName } = intent.metadata;

      const db = admin.firestore();
      const batch = db.batch();

      // Create booking record
      const bookingRef = db.collection("bookings").doc();
      batch.set(bookingRef, {
        slotId,
        barberId,
        clientName,
        paid: true,
        status: "confirmed",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update slot status
      const slotRef = db.collection("slots").doc(slotId);
      batch.update(slotRef, { status: "booked", bookingId: bookingRef.id });

      await batch.commit();
    }

    res.status(200).send({ received: true });
  }
);

// 3. REQUEST REFUND
exports.requestRefund = onRequest(
  { secrets: [stripeSecret] },
  (req, res) => {
    cors(req, res, async () => {
      const stripe = Stripe(stripeSecret.value());
      const { paymentIntentId, slotDate } = req.body;

      const hoursUntilSlot = (new Date(slotDate) - Date.now()) / (1000 * 60 * 60);

      if (hoursUntilSlot <= 24) {
        return res.status(200).json({ refunded: false, reason: "Too close to appointment." });
      }

      try {
        await stripe.refunds.create({ payment_intent: paymentIntentId });
        res.status(200).json({ refunded: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  }
);