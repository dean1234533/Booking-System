/**
 * src/worker.js
 *
 * Single Cloudflare Worker entry point.
 * Handles all /api/* routes, then falls back to serving your Vite SPA.
 *
 * Environment variables (set in Cloudflare Dashboard → Settings → Variables):
 * API_TOKEN                    — Cloudflare Global API Key (Required for Account Registrar API)
 * ACCOUNT_ID                   — Cloudflare account ID
 * ZONE_ID                      — Zone ID of your main SaaS domain
 * STRIPE_SECRET_KEY            — Stripe secret key (sk_live_...)
 * STRIPE_WEBHOOK_SECRET        — Stripe webhook signing secret (whsec_...)
 * VITE_FIREBASE_PROJECT_ID     — Firebase project ID
 * APP_ORIGIN                   — e.g. https://yoursaas.com
 * USD_TO_GBP_RATE              — e.g. 0.79
 */

import Stripe from "stripe";

// ── Constants ─────────────────────────────────────────────────────────────────

const SUPPORTED_TLDS   = ["com", "co.uk", "uk", "net", "org", "io", "shop", "store"];
const PLATFORM_MARKUP  = 5; // £5 added on top of Cloudflare registrar cost

// ── Shared helpers ────────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function extractTLD(domain) {
  const parts = domain.split(".");
  return parts.length >= 3 ? parts.slice(-2).join(".") : parts.slice(-1)[0];
}

function isValidDomain(domain) {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/i.test(domain);
}

// Firestore REST helper — no Firebase Admin SDK needed in Workers
function firestoreBase(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

// Converts a plain JS object to Firestore REST field format
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string")  fields[key] = { stringValue: val };
    else if (typeof val === "boolean") fields[key] = { booleanValue: val };
    else if (typeof val === "number")  fields[key] = { integerValue: String(val) };
    else if (val === null) fields[key] = { nullValue: null };
  }
  return fields;
}

// Reads a raw body buffer — needed for Stripe webhook signature verification
async function readRawBody(request) {
  const buffer = await request.arrayBuffer();
  return { raw: buffer, text: new TextDecoder().decode(buffer) };
}

// ── Route handlers ────────────────────────────────────────────────────────────

// GET /api/check-payment?sessionId=cs_live_...&barberId=123
async function handleCheckPayment(request, env) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const barberId = url.searchParams.get("barberId");

  // Protect against uninitialized frontend variables or missing keys
  if (!sessionId || sessionId === "undefined" || !barberId) {
    return json({ error: "Missing or invalid sessionId or barberId" }, 400);
  }

  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    return json({ 
      status: session.status, 
      payment_status: session.payment_status,
      metadata: session.metadata 
    });
  } catch (err) {
    console.error("[check-payment] Stripe verification error:", err);
    return json({ error: err.message }, 500);
  }
}

// POST /api/quick-charge
async function handleQuickCharge(request, env) {
  // Placeholder handler to catch the request and stop the 500/fallback error
  return json({ message: "Quick charge endpoint reached successfully" });
}

// GET /api/check-domain?domain=example.com
async function handleCheckDomain(request, env) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const url    = new URL(request.url);
  const domain = url.searchParams.get("domain");

  if (!domain) return json({ error: "domain query parameter is required" }, 400);

  const clean = domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (!isValidDomain(clean)) return json({ error: "Invalid domain format" }, 400);

  const tld = extractTLD(clean);
  if (!SUPPORTED_TLDS.includes(tld)) {
    return json({ error: `Unsupported TLD: .${tld}`, supported: SUPPORTED_TLDS }, 400);
  }

  try {
    // Replaced legacy GET endpoint with the valid Cloudflare Registrar POST endpoint
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/registrar/domain-check`,
      {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${env.API_TOKEN}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ domains: [clean] })
      }
    );

    if (!cfRes.ok) {
      const err = await cfRes.json();
      console.error("[check-domain] Cloudflare error:", JSON.stringify(err));
      return json({ error: "Cloudflare availability check failed", details: err }, 502);
    }

    const data = await cfRes.json();
    const domainData = data.result?.domains?.[0] ?? {};
    
    // Map back cleanly into your existing frontend payload expectations
    return json({ 
      domain: clean, 
      available: domainData.registrable ?? false, 
      price: domainData.pricing?.registration_cost ? parseFloat(domainData.pricing.registration_cost) : null, 
      currency: domainData.pricing?.currency ?? "USD" 
    });
  } catch (err) {
    console.error("[check-domain] Unexpected error:", err);
    return json({ error: "Internal server error" }, 500);
  }
}

// POST /api/create-domain-checkout
// Body: { domain, barberId, priceUsd }
async function handleCreateDomainCheckout(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  const { domain, barberId, priceUsd } = body ?? {};

  if (!domain || !barberId || !priceUsd) {
    return json({ error: "domain, barberId, and priceUsd are required" }, 400);
  }
  if (typeof priceUsd !== "number" || priceUsd <= 0) {
    return json({ error: "Invalid priceUsd" }, 400);
  }

  const usdToGbp     = parseFloat(env.USD_TO_GBP_RATE ?? "0.79");
  const priceGbp     = priceUsd * usdToGbp + PLATFORM_MARKUP;
  const priceGbpPence= Math.round(priceGbp * 100);
  const origin       = env.APP_ORIGIN ?? "https://yoursaas.com";

  try {
    const stripe  = new Stripe(env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode:                 "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency:     "gbp",
          unit_amount:  priceGbpPence,
          product_data: {
            name:        `Custom Domain: ${domain}`,
            description: `1-year registration for ${domain}, connected to your barber booking site.`,
          },
        },
        quantity: 1,
      }],
      metadata: { type: "domain_purchase", domain, barberId, priceUsd: String(priceUsd) },
      success_url: `${origin}/dashboard?domainSuccess=true&domain=${encodeURIComponent(domain)}`,
      cancel_url:  `${origin}/dashboard?domainCancelled=true`,
    });

    return json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[create-domain-checkout] Stripe error:", err);
    return json({ error: err.message }, 500);
  }
}

// GET /api/check-stripe?userId=uid123
async function handleCheckStripe(request, env) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const url    = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) return json({ error: "Missing userId" }, 400);

  const base = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);

  try {
    // Fetch barber from Firestore
    const fbRes = await fetch(`${base}/barbers/${userId}`);
    if (!fbRes.ok) return json({ error: "Barber not found" }, 404);

    const barberData      = await fbRes.json();
    const stripeAccountId = barberData.fields?.stripeAccountId?.stringValue;

    if (!stripeAccountId) return json({ connected: false });

    // Check Stripe account status
    const stripe      = new Stripe(env.STRIPE_SECRET_KEY);
    const account     = await stripe.accounts.retrieve(stripeAccountId);
    const isConnected = account.charges_enabled && account.details_submitted;

    // Update Firestore
    await fetch(`${base}/barbers/${userId}?updateMask.fieldPaths=stripeConnected`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ fields: toFirestoreFields({ stripeConnected: isConnected }) }),
    });

    return json({ connected: isConnected });
  } catch (err) {
    console.error("[check-stripe] Error:", err);
    return json({ error: err.message }, 500);
  }
}

// POST /api/stripe-webhook
// Verifies Stripe signature, then provisions domain on checkout.session.completed
async function handleStripeWebhook(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const sig = request.headers.get("stripe-signature");
  if (!sig) return json({ error: "Missing stripe-signature header" }, 400);

  const { raw, text } = await readRawBody(request);

  let event;
  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    // Workers don't have Node crypto — use the subtleCrypto-compatible verify method
    event = await stripe.webhooks.constructEventAsync(text, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return json({ error: `Webhook signature invalid: ${err.message}` }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const meta    = session.metadata ?? {};

    if (meta.type === "domain_purchase") {
      const { domain, barberId } = meta;

      if (!domain || !barberId) {
        console.error("[stripe-webhook] Missing domain or barberId in metadata");
        return json({ received: true }); // 200 so Stripe doesn't retry a data error
      }

      try {
        await provisionDomain(domain, barberId, env);
      } catch (err) {
        console.error("[stripe-webhook] Provisioning failed:", err.message);
        return json({ error: "Provisioning failed" }, 500); // 500 triggers Stripe retry
      }
    }
  }

  return json({ received: true });
}

// ── Domain provisioning (internal — not a public route) ───────────────────────

async function registerDomain(domain, env) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/registrar/domains`,
    {
      method:  "POST",
      headers: { Authorization: `Bearer ${env.API_TOKEN}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ name: domain, auto_renew: true, years: 1 }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Registrar failed: ${JSON.stringify(data.errors ?? data)}`);
  }
  return data.result;
}

async function addCustomHostname(domain, env) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.ZONE_ID}/custom_hostnames`,
    {
      method:  "POST",
      headers: { Authorization: `Bearer ${env.API_TOKEN}`, "Content-Type": "application/json" },
      body:    JSON.stringify({
        hostname: domain,
        ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2", http2: "on" } },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Custom Hostname creation failed: ${JSON.stringify(data.errors ?? data)}`);
  }
  return data.result;
}

async function updateFirestoreDomain(barberId, domain, customHostnameId, env) {
  const base = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);
  const params = `updateMask.fieldPaths=customDomain&updateMask.fieldPaths=customHostnameId&updateMask.fieldPaths=domainStatus`;
  await fetch(`${base}/barbers/${barberId}?${params}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      fields: toFirestoreFields({ customDomain: domain, customHostnameId, domainStatus: "pending" }),
    }),
  });
}

async function provisionDomain(domain, barberId, env) {
  console.log(`[provision-domain] Starting for ${domain} / barber ${barberId}`);

  // 1. Register (tolerate "already registered" errors on retries)
  try {
    await registerDomain(domain, env);
    console.log(`[provision-domain] Domain registered: ${domain}`);
  } catch (err) {
    if (err.message.toLowerCase().includes("already")) {
      console.warn("[provision-domain] Domain already registered, continuing.");
    } else {
      throw err;
    }
  }

  // 2. Add SSL for SaaS custom hostname
  const hostnameResult = await addCustomHostname(domain, env);
  console.log(`[provision-domain] Custom hostname created: ${hostnameResult?.id}`);

  // 3. Update Firestore
  await updateFirestoreDomain(barberId, domain, hostnameResult.id, env);
  console.log(`[provision-domain] Firestore updated for barber ${barberId}`);

  return { domain, customHostnameId: hostnameResult.id, sslStatus: hostnameResult.ssl?.status ?? "initializing" };
}

// ── Main Worker export ────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin":  "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, stripe-signature",
        },
      });
    }

    // ── API routing ───────────────────────────────────────────────────────
    switch (url.pathname) {
      case "/api/check-payment":
        return handleCheckPayment(request, env);

      case "/api/quick-charge":
        return handleQuickCharge(request, env);

      case "/api/check-domain":
        return handleCheckDomain(request, env);

      case "/api/create-domain-checkout":
        return handleCreateDomainCheckout(request, env);

      case "/api/check-stripe":
        return handleCheckStripe(request, env);

      case "/api/stripe-webhook":
        return handleStripeWebhook(request, env);

      default:
        // Serve compiled Vite SPA assets for everything else
        return env.ASSETS.fetch(request);
    }
  },
};