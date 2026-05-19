/**
 * POST /api/create-domain-checkout
 * Body: { domain: "deansbarbershop.com", barberId: "uid123", priceUsd: 12.99 }
 *
 * Creates a Stripe Checkout session for a domain purchase.
 * On success, Stripe redirects to /dashboard?domainSuccess=true
 * On cancel,  Stripe redirects to /dashboard?domainCancelled=true
 *
 * IMPORTANT: The Stripe webhook (stripe-webhook.js) handles the actual
 * provisioning after payment is confirmed — never trust the redirect alone.
 */

import Stripe from "stripe";

const stripe          = new Stripe(process.env.STRIPE_SECRET_KEY);
const PLATFORM_MARKUP = 5; // Extra £5 platform fee on top of Cloudflare cost

// GBP conversion rate (keep this in an env var or fetch live in production)
const USD_TO_GBP = parseFloat(process.env.USD_TO_GBP_RATE ?? "0.79");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { domain, barberId, priceUsd } = req.body ?? {};

  // ── Validation ────────────────────────────────────────────────────────────
  if (!domain || !barberId || !priceUsd) {
    return res.status(400).json({ error: "domain, barberId, and priceUsd are required" });
  }
  if (typeof priceUsd !== "number" || priceUsd <= 0) {
    return res.status(400).json({ error: "Invalid priceUsd" });
  }

  // Convert USD registrar cost → GBP, add platform markup, convert to pence
  const priceGbp        = priceUsd * USD_TO_GBP + PLATFORM_MARKUP;
  const priceGbpPence   = Math.round(priceGbp * 100);

  const origin = process.env.APP_ORIGIN ?? "https://yoursaas.com";

  try {
    const session = await stripe.checkout.sessions.create({
      mode:               "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency:     "gbp",
            unit_amount:  priceGbpPence,
            product_data: {
              name:        `Custom Domain: ${domain}`,
              description: `1-year registration for ${domain}, connected to your barber booking site.`,
            },
          },
          quantity: 1,
        },
      ],
      // Metadata flows through to the webhook — this is how we know what to provision
      metadata: {
        type:     "domain_purchase",
        domain,
        barberId,
        priceUsd: String(priceUsd),
      },
      success_url: `${origin}/dashboard?domainSuccess=true&domain=${encodeURIComponent(domain)}`,
      cancel_url:  `${origin}/dashboard?domainCancelled=true`,
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[create-domain-checkout] Stripe error:", err);
    return res.status(500).json({ error: err.message });
  }
}