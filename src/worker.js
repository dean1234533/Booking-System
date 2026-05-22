/**
 * src/worker.js
 *
 * Single Cloudflare Worker entry point.
 * Handles all /api/* routes, then proxy-routes tenants to Firebase static hosting.
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
  const userId = barberId || body?.userId;

  if (!email || !userId) {
    return json({ error: "Missing email or barberId" }, 400);
  }

  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
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
      metadata: { barberId: userId }
    });

    const origin = env.APP_ORIGIN ?? "https://bookehtrim.co.uk";

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/signup`,
      return_url: `${origin}/dashboard?stripe_success=true`,
      type: "account_onboarding",
    });

    const base = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);
    await fetch(`${base}/barbers/${userId}?updateMask.fieldPaths=stripeAccountId&updateMask.fieldPaths=stripeConnected`, {
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
    const dnsUrl = `https://1.1.1.1/dns-query?name=${encodeURIComponent(clean)}&type=SOA`;
    const dnsRes = await fetch(dnsUrl, { headers: { accept: "application/dns-json" } });

    if (!dnsRes.ok) return json({ error: "DNS lookup engine failed verification" }, 502);

    const dnsData    = await dnsRes.json();
    const isAvailable = dnsData.Status === 3;

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
  const tld           = extractTLD(targetExtension);
  const finalPriceGbp = calcFinalPriceGbp(tld, env.USD_TO_GBP_RATE);
  const priceGbpPence = Math.round(finalPriceGbp * 100);

  const origin = env.APP_ORIGIN ?? "https://bookehtrim.co.uk";

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
    const hostnameResult = await addCustomHostname(clean, env);
    await updateFirestoreDomain(barberId, clean, hostnameResult.id, env);
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

// ── PORKBUN REGISTRATION ENGINE ───────────────────────────────────────────────

async function registerDomain(domain, env) {
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

  const nsRes = await fetch(
    `https://api.porkbun.com/api/json/v3/domain/updateNameservers/${encodeURIComponent(domain)}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        apikey:       env.PORKBUN_API_KEY,
        secretapikey: env.PORKBUN_SECRET_KEY,
        nameservers: [
          "byron.ns.cloudflare.com",  
          "sierra.ns.cloudflare.com", 
        ],
      }),
    }
  );

  const nsData = await nsRes.json();
  if (!nsRes.ok || nsData.status !== "SUCCESS") {
    console.warn(`[provision-domain] Nameserver update warning: ${nsData.message || JSON.stringify(nsData)}`);
  }

  return data;
}

// ── CLOUDFLARE CONFIGURATION ENGINE ───────────────────────────────────────────

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
  try {
    await registerDomain(domain, env);
  } catch (err) {
    if (!err.message.toLowerCase().includes("already own")) throw err;
  }

  const hostnameResult = await addCustomHostname(domain, env);
  await updateFirestoreDomain(barberId, domain, hostnameResult.id, env);

  return {
    domain,
    customHostnameId: hostnameResult.id,
    sslStatus:        hostnameResult.ssl?.status ?? "initializing",
  };
}

// ── Main Worker Export with Built-In Firebase Proxy ──────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Global CORS Preflight Handling
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

    // 2. API Routing Table
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
        // 3. CLOUDFLARE SSL CHALLENGE BYPASS
        // Let Cloudflare handle its own validation challenges at the edge natively.
        if (url.pathname.startsWith("/.well-known/cf-custom-hostname-challenge/")) {
          return fetch(request);
        }

        // 4. MULTI-TENANT PROXY ROUTING (GET/POST Safe)
        const firebaseTargetHost = `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`;
        const targetFirebaseUrl = `https://${firebaseTargetHost}${url.pathname}${url.search}`;
        
        const initOptions = {
          method: request.method,
          headers: new Headers(request.headers),
        };

        // Stream body data safely if request method accepts payload contents
        if (request.method !== "GET" && request.method !== "HEAD") {
          initOptions.body = request.body;
        }

        const proxyRequest = new Request(targetFirebaseUrl, initOptions);
        proxyRequest.headers.set("Host", firebaseTargetHost);
        
        let response = await fetch(proxyRequest);

        // 5. SPA ROUTING FALLBACK INTERCEPTOR
        if (response.status === 404 && !url.pathname.includes(".")) {
          const fallbackIndexUrl = `https://${firebaseTargetHost}/index.html`;
          const fallbackRequest = new Request(fallbackIndexUrl, {
            method: "GET",
            headers: new Headers(request.headers)
          });
          fallbackRequest.headers.set("Host", firebaseTargetHost);
          response = await fetch(fallbackRequest);
        }
        
        return response;
    }
  },
};