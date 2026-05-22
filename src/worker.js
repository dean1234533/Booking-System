/**
 * src/worker.js
 *
 * Single Cloudflare Worker entry point.
 * Handles all /api/* routes, then falls back to serving your Vite SPA.
 *
 * Environment variables (set in Cloudflare Dashboard → Settings → Variables):
 * API_TOKEN        — Cloudflare Global API Key (Required for Custom Hostnames/SSL)
 * CLOUDFLARE_EMAIL — Cloudflare account login email
 * ACCOUNT_ID       — Cloudflare account ID
 * ZONE_ID          — Zone ID of your main SaaS domain
 * PORKBUN_API_KEY       — Your Porkbun Developer API Key (For automated purchasing)
 * PORKBUN_SECRET_KEY    — Your Porkbun Developer API Secret Key
 * STRIPE_SECRET_KEY            — Stripe secret key (sk_live_...)
 * STRIPE_WEBHOOK_SECRET        — Stripe webhook signing secret (whsec_...)
 * VITE_FIREBASE_PROJECT_ID     — Firebase project ID
 * APP_ORIGIN                   — e.g. https://yoursaas.com
 * USD_TO_GBP_RATE              — e.g. 0.79
 */

import Stripe from "stripe";

// ── Constants ─────────────────────────────────────────────────────────────────

const SUPPORTED_TLDS  = ["com", "co.uk", "uk", "net", "org", "io", "shop", "store"];
const PLATFORM_MARKUP = 9; // £9 added on top of base cost

// Porkbun base pricing estimates in USD (used for calculating the final GBP price)
const ESTIMATED_PRICES_USD = {
  "com":    11.08,
  "net":    12.52,
  "org":    10.74,
  "io":     27.12,
  "co.uk":   5.66,
  "uk":      5.66,
  "shop":    4.00,
  "store":   5.00,
};

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

function firestoreBase(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string")       fields[key] = { stringValue: val };
    else if (typeof val === "boolean") fields[key] = { booleanValue: val };
    else if (typeof val === "number")  fields[key] = { integerValue: String(val) };
    else if (val === null)             fields[key] = { nullValue: null };
  }
  return fields;
}

async function readRawBody(request) {
  const buffer = await request.arrayBuffer();
  return { raw: buffer, text: new TextDecoder().decode(buffer) };
}

// ── Shared pricing helper — single source of truth ───────────────────────────
// Both check-domain and create-domain-checkout use this so displayed price
// always matches the Stripe checkout price exactly.

function calcFinalPriceGbp(tld, usdToGbpRate) {
  const baseCostUsd = ESTIMATED_PRICES_USD[tld] ?? 12.00;
  const rate        = parseFloat(usdToGbpRate ?? "0.79");
  return parseFloat((baseCostUsd * rate + PLATFORM_MARKUP).toFixed(2));
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function handleConnect(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  const { email, barberId, businessName } = body ?? {};

  if (!email || !barberId) {
    return json({ error: "Missing email or barberId" }, 400);
  }

  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    // 1. Generate an Express Connected Account for the barber shop owner
    const account = await stripe.accounts.create({
      type: "express",
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: businessName || "Barber Shop Owner",
      },
      metadata: { barberId }
    });

    const origin = env.APP_ORIGIN ?? "https://bookehtrim.co.uk";

    // 2. Build secure custom onboarding link structure
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/signup`,
      return_url: `${origin}/dashboard?stripe_success=true`,
      type: "account_onboarding",
    });

    // 3. Document parameters allocation inside Firestore project
    const base = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);
    await fetch(`${base}/barbers/${barberId}?updateMask.fieldPaths=stripeAccountId&updateMask.fieldPaths=stripeConnected`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: toFirestoreFields({
          stripeAccountId: account.id,
          stripeConnected: false
        })
      })
    });

    return json({ url: accountLink.url });
  } catch (err) {
    console.error("[connect-error]:", err);
    return json({ error: err.message }, 500);
  }
}

async function handleCheckPayment(request, env) {
  const url       = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const barberId  = url.searchParams.get("barberId");

  if (!sessionId || sessionId === "undefined" || !barberId) {
    return json({ error: "Missing or invalid sessionId or barberId" }, 400);
  }

  try {
    const stripe  = new Stripe(env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return json({
      status:       session.status,
      payment_status: session.payment_status,
      metadata:       session.metadata,
    });
  } catch (err) {
    console.error("[check-payment] Stripe verification error:", err);
    return json({ error: err.message }, 500);
  }
}

async function handleQuickCharge(request, env) {
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
    // Ultra-fast DoH check — bypasses registrar platform blocks completely
    const dnsUrl = `https://1.1.1.1/dns-query?name=${encodeURIComponent(clean)}&type=SOA`;
    const dnsRes = await fetch(dnsUrl, { headers: { accept: "application/dns-json" } });

    if (!dnsRes.ok) return json({ error: "DNS lookup engine failed verification" }, 502);

    const dnsData    = await dnsRes.json();
    const isAvailable = dnsData.Status === 3; // NXDOMAIN = available

    // ── FIX: always return the final GBP price including markup so the
    //         displayed price matches the Stripe checkout price exactly. ──
    const finalPrice = calcFinalPriceGbp(tld, env.USD_TO_GBP_RATE);

    return json({
      domain:    clean,
      available: isAvailable,
      price:     finalPrice,
      currency:  "GBP",
    });
  } catch (err) {
    console.error("[check-domain] Unexpected error:", err);
    return json({ error: "Internal server error" }, 500);
  }
}

// POST /api/create-domain-checkout
async function handleCreateDomainCheckout(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  const { domain, barberId } = body ?? {};

  if (!domain || !barberId) {
    return json({ error: "domain and barberId are required" }, 400);
  }

  const targetExtension = domain.toLowerCase().trim();

  // ── FIX: derive price server-side from the TLD using the same formula as
  //         check-domain — never trust the price sent from the frontend. ──
  const tld          = extractTLD(targetExtension);
  const finalPriceGbp = calcFinalPriceGbp(tld, env.USD_TO_GBP_RATE);
  const priceGbpPence = Math.round(finalPriceGbp * 100);

  const origin = env.APP_ORIGIN ?? "https://yoursaas.com";

  try {
    const stripe  = new Stripe(env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode:                  "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency:    "gbp",
          unit_amount: priceGbpPence,
          product_data: {
            name:        `Custom Domain: ${domain}`,
            description: `1-year registration and automated SSL routing setup for ${domain}.`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        type:     "domain_purchase",
        domain,
        barberId,
      },
      success_url: `${origin}/dashboard?domainSuccess=true&domain=${encodeURIComponent(domain)}`,
      cancel_url:  `${origin}/dashboard?domainCancelled=true`,
    });

    return json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[create-domain-checkout] Stripe error:", err);
    return json({ error: err.message }, 500);
  }
}

// POST /api/connect-existing-domain
async function handleConnectExistingDomain(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  const { domain, barberId } = body ?? {};

  if (!domain || !barberId) {
    return json({ error: "domain and barberId are required" }, 400);
  }

  const clean = domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (!isValidDomain(clean)) {
    return json({ error: "Invalid domain format" }, 400);
  }

  try {
    // 1. Skip Porkbun entirely and provision the SSL Custom Hostname right away in Cloudflare
    const hostnameResult = await addCustomHostname(clean, env);
    console.log(`[connect-existing] Cloudflare Custom hostname linked successfully: ${hostnameResult?.id}`);

    // 2. Map domain properties straight to the barber's document structure in Firestore
    await updateFirestoreDomain(barberId, clean, hostnameResult.id, env);
    console.log(`[connect-existing] Firestore mapped for existing domain: ${clean}`);

    return json({ 
      success: true, 
      domain: clean, 
      customHostnameId: hostnameResult.id 
    });
  } catch (err) {
    console.error("[connect-existing] Configuration routing error:", err);
    return json({ error: err.message }, 500);
  }
}

async function handleCheckStripe(request, env) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const url    = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) return json({ error: "Missing userId" }, 400);

  const base = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);

  try {
    const fbRes = await fetch(`${base}/barbers/${userId}`);
    if (!fbRes.ok) return json({ error: "Barber not found" }, 404);

    const barberData      = await fbRes.json();
    const stripeAccountId = barberData.fields?.stripeAccountId?.stringValue;

    if (!stripeAccountId) return json({ connected: false });

    const stripe      = new Stripe(env.STRIPE_SECRET_KEY);
    const account     = await stripe.accounts.retrieve(stripeAccountId);
    const isConnected = account.charges_enabled && account.details_submitted;

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
async function handleStripeWebhook(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const sig = request.headers.get("stripe-signature");
  if (!sig) return json({ error: "Missing stripe-signature header" }, 400);

  const { raw, text } = await readRawBody(request);

  let event;
  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
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
        return json({ received: true });
      }

      try {
        await provisionDomain(domain, barberId, env);
      } catch (err) {
        console.error("[stripe-webhook] Provisioning loop failed:", err.message);
        return json({ error: "Provisioning failed" }, 500);
      }
    }
  }

  return json({ received: true });
}

// ── AUTOMATED DOMAIN PURCHASING & NAMESERVER CONFIG (PORKBUN API) ─────────────

async function registerDomain(domain, env) {
  // 1. Register the domain via Porkbun's production API
  const res = await fetch(
    `https://api.porkbun.com/api/json/v3/domain/register/${encodeURIComponent(domain)}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        apikey:       env.PORKBUN_API_KEY,
        secretapikey: env.PORKBUN_SECRET_KEY,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok || data.status !== "SUCCESS") {
    throw new Error(`Porkbun API automated registration failure: ${data.message || JSON.stringify(data)}`);
  }

  console.log(`[provision-domain] Purchased ${domain} successfully. Forcing Cloudflare nameservers...`);

  // 2. Point the domain at your Cloudflare nameservers immediately
  const nsRes = await fetch(
    `https://api.porkbun.com/api/json/v3/domain/updateNameservers/${encodeURIComponent(domain)}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        apikey:       env.PORKBUN_API_KEY,
        secretapikey: env.PORKBUN_SECRET_KEY,
        nameservers: [
          "byron.ns.cloudflare.com",  // CRITICAL: swap with your exact Cloudflare NS 1
          "sierra.ns.cloudflare.com", // CRITICAL: swap with your exact Cloudflare NS 2
        ],
      }),
    }
  );

  const nsData = await nsRes.json();
  if (!nsRes.ok || nsData.status !== "SUCCESS") {
    console.warn(`[provision-domain] Nameserver update warning: ${nsData.message || JSON.stringify(nsData)}`);
  } else {
    console.log(`[provision-domain] Nameservers matched to Cloudflare for ${domain}`);
  }

  return data;
}

// ── Cloudflare Routing configuration engine ───────────────────────────────────

async function addCustomHostname(domain, env) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.ZONE_ID}/custom_hostnames`,
    {
      method:  "POST",
      headers: {
        "X-Auth-Email": env.CLOUDFLARE_EMAIL,
        "X-Auth-Key":   env.API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hostname: domain,
        ssl: {
          method:   "http",
          type:     "dv",
          settings: { min_tls_version: "1.2", http2: "on" },
        },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Cloudflare Custom Hostname linking failed: ${JSON.stringify(data.errors ?? data)}`);
  }
  return data.result;
}

async function updateFirestoreDomain(barberId, domain, customHostnameId, env) {
  const base   = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);
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
  console.log(`[provision-domain] Initializing background workers for ${domain}`);

  // 1. Buy the domain and assign nameservers via Porkbun
  try {
    await registerDomain(domain, env);
    console.log(`[provision-domain] Porkbun successfully processed order for: ${domain}`);
  } catch (err) {
    if (err.message.toLowerCase().includes("already own")) {
      console.warn("[provision-domain] Domain already owned in Porkbun account, moving to routing.");
    } else {
      throw err;
    }
  }

  // 2. Create SSL custom hostname in Cloudflare
  const hostnameResult = await addCustomHostname(domain, env);
  console.log(`[provision-domain] Cloudflare Custom hostname active: ${hostnameResult?.id}`);

  // 3. Sync domain details back to Firestore
  await updateFirestoreDomain(barberId, domain, hostnameResult.id, env);
  console.log(`[provision-domain] Firebase synced for barber ${barberId}`);

  return {
    domain,
    customHostnameId: hostnameResult.id,
    sslStatus:        hostnameResult.ssl?.status ?? "initializing",
  };
}

// ── Main Worker export ────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

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

    switch (url.pathname) {
      case "/api/connect":
        return handleConnect(request, env);
      case "/api/check-payment":
        return handleCheckPayment(request, env);
      case "/api/quick-charge":
        return handleQuickCharge(request, env);
      case "/api/check-domain":
        return handleCheckDomain(request, env);
      case "/api/create-domain-checkout":
        return handleCreateDomainCheckout(request, env);
      case "/api/connect-existing-domain":
        return handleConnectExistingDomain(request, env);
      case "/api/check-stripe":
        return handleCheckStripe(request, env);
      case "/api/stripe-webhook":
        return handleStripeWebhook(request, env);
        
      default:
        // 1. If Cloudflare is checking the SSL validation token, let it pass gracefully
        if (url.pathname.startsWith("/.well-known/cf-custom-hostname-challenge/")) {
          if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
            return env.ASSETS.fetch(request);
          }
          // Fallback if env.ASSETS is missing but Cloudflare needs to verify the challenge path
          return new Response("Cloudflare custom hostname validation challenge path pass-through.", { status: 200 });
        }

        // 2. Normal asset serving safety logic for standard pages/favicons
        if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
          return env.ASSETS.fetch(request);
        }

        return new Response("Not Found", { status: 404 });
    }
  },
};