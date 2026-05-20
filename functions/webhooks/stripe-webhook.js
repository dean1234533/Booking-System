/**
 * POST /api/stripe-webhook
 *
 * Handles Stripe webhook events. For domain purchases, calls provisionDomain()
 * after a confirmed checkout.session.completed event.
 *
 * ⚠️  Register this URL in your Stripe Dashboard →
 *     Developers → Webhooks → Add endpoint
 *     Events to listen for: checkout.session.completed
 *
 * ⚠️  Set STRIPE_WEBHOOK_SECRET in your environment (from the Stripe dashboard).
 */

import Stripe                from "stripe";
import { provisionDomain }   from "../api/provision-domain.js";
import { getRawBody }        from "../utils/rawBody.js"; // helper — see note below

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Disable body parsing so we get the raw buffer for signature verification
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Signature verification ─────────────────────────────────────────────────
  const sig     = req.headers["stripe-signature"];
  const rawBody = await getRawBody(req); // raw Buffer — never parse before this

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
  }

  // ── Handle events ─────────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session  = event.data.object;
    const meta     = session.metadata ?? {};

    // Only process domain purchase events
    if (meta.type === "domain_purchase") {
      const { domain, barberId } = meta;

      if (!domain || !barberId) {
        console.error("[stripe-webhook] Missing domain or barberId in metadata");
        // Return 200 so Stripe doesn't retry — this is a data error, not a transient one
        return res.status(200).json({ received: true });
      }

      try {
        const result = await provisionDomain(domain, barberId);
        console.log("[stripe-webhook] Domain provisioned:", result);
      } catch (err) {
        console.error("[stripe-webhook] Provisioning failed:", err.message);
        // Return 500 so Stripe retries — provisioning errors are often transient
        return res.status(500).json({ error: "Provisioning failed, will retry" });
      }
    }
  }

  return res.status(200).json({ received: true });
}

/*
 * NOTE — rawBody helper (utils/rawBody.js):
 *
 * import { Readable } from "stream";
 * export async function getRawBody(req) {
 *   const chunks = [];
 *   for await (const chunk of req) chunks.push(chunk);
 *   return Buffer.concat(chunks);
 * }
 *
 * If you're using Next.js, add this to next.config.js instead:
 *   api: { bodyParser: false }
 * …and use `req` directly with stripe.webhooks.constructEvent.
 *
 * If you're using Express, use express.raw({ type: "application/json" })
 * as middleware on this route only.
 */