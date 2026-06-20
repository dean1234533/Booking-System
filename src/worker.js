/**
 * src/worker.js
 *
 * Single Cloudflare Worker entry point.
 * Handles all /api/* routes, then proxy-routes tenants to Firebase static hosting.
 */

import Stripe from "stripe";

// ── Constants ─────────────────────────────────────────────────────────────────

const SUPPORTED_TLDS  = ["com", "co.uk", "uk", "net", "org", "io", "shop", "store"];
const PLATFORM_MARKUP = 9;

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
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
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

// ── Web Push helpers ──────────────────────────────────────────────────────────

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromB64url(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

function concat(...arrays) {
  const out = new Uint8Array(arrays.reduce((s, a) => s + a.length, 0));
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

async function hkdf(salt, ikm, info, length) {
  const saltKey = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk     = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm));
  const prkKey  = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const blocks  = Math.ceil(length / 32);
  const okm     = new Uint8Array(length);
  let t = new Uint8Array(0);
  for (let i = 1; i <= blocks; i++) {
    const input = concat(t, info, new Uint8Array([i]));
    t = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, input));
    const needed = Math.min(32, length - (i - 1) * 32);
    okm.set(t.slice(0, needed), (i - 1) * 32);
  }
  return okm;
}

async function vapidJwt(audience, subject, privateJwk) {
  const enc    = new TextEncoder();
  const now    = Math.floor(Date.now() / 1000);
  const header = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload= b64url(enc.encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: subject })));
  const input  = `${header}.${payload}`;
  const key    = await crypto.subtle.importKey("jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig    = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(input));
  return `${input}.${b64url(sig)}`;
}

async function encryptPush(subscription, payloadObj) {
  const enc           = new TextEncoder();
  const plaintext     = enc.encode(JSON.stringify(payloadObj));
  const uaPubBytes    = fromB64url(subscription.keys.p256dh);
  const authSecret    = fromB64url(subscription.keys.auth);

  const asKP          = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPubBytes    = new Uint8Array(await crypto.subtle.exportKey("raw", asKP.publicKey));
  const uaPubKey      = await crypto.subtle.importKey("raw", uaPubBytes, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret    = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaPubKey }, asKP.privateKey, 256));

  const info = concat(enc.encode("WebPush: info\x00"), uaPubBytes, asPubBytes);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikm  = await hkdf(authSecret, ecdhSecret, info, 32);
  const cek  = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\x00"), 16);
  const nonce= await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\x00"), 12);

  const aesKey    = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, concat(plaintext, new Uint8Array([0x02]))));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  return concat(salt, rs, new Uint8Array([65]), asPubBytes, encrypted);
}

async function sendWebPush(subscription, payload, env) {
  const privateJwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const pubKey     = env.VAPID_PUBLIC_KEY;
  const subject    = env.VAPID_SUBJECT || "mailto:noreply@bookehtrim.co.uk";

  const endpointUrl = new URL(subscription.endpoint);
  const audience    = `${endpointUrl.protocol}//${endpointUrl.host}`;
  const jwt         = await vapidJwt(audience, subject, privateJwk);
  const body        = await encryptPush(subscription, payload);

  const res = await fetch(subscription.endpoint, {
    method:  "POST",
    headers: {
      "Authorization":    `vapid t=${jwt},k=${pubKey}`,
      "Content-Type":     "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL":              "86400",
    },
    body,
  });

  if (!res.ok && res.status !== 201) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Push service returned ${res.status}: ${txt}`);
  }
  return res;
}

// POST /api/send-push
// Reads the barber's push subscription from Firestore and sends a notification.
async function handleSendPush(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const { barberId, payload } = body ?? {};
  if (!barberId || !payload) return json({ error: "Missing barberId or payload" }, 400);

  if (!env.VAPID_PRIVATE_JWK) return json({ error: "VAPID not configured" }, 500);

  try {
    const base    = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);
    const fbRes   = await fetch(`${base}/barbers/${barberId}`);
    if (!fbRes.ok) return json({ error: "Barber not found" }, 404);

    const fbData      = await fbRes.json();
    const subField    = fbData.fields?.pushSubscription;
    if (!subField) return json({ error: "No push subscription found for this barber" }, 404);

    // Firestore stores the subscription as a nested map — reconstruct it
    const subFields = subField.mapValue?.fields ?? {};
    const keysFields= subFields.keys?.mapValue?.fields ?? {};
    const subscription = {
      endpoint: subFields.endpoint?.stringValue,
      keys: {
        p256dh: keysFields.p256dh?.stringValue,
        auth:   keysFields.auth?.stringValue,
      },
    };

    if (!subscription.endpoint || !subscription.keys.p256dh) {
      return json({ error: "Invalid subscription data in Firestore" }, 400);
    }

    // Merge stored sound/vibrate prefs into payload if not overridden
    const prefsFields = fbData.fields?.notificationPrefs?.mapValue?.fields ?? {};
    const mergedPayload = {
      sound:   prefsFields.sound?.booleanValue   !== false,
      vibrate: prefsFields.vibrate?.booleanValue !== false,
      ...payload,
    };

    await sendWebPush(subscription, mergedPayload, env);
    return json({ ok: true });
  } catch (err) {
    console.error("[send-push]", err);
    return json({ error: err.message }, 500);
  }
}

// ── Route handlers ────────────────────────────────────────────────────────────

// POST /api/connect
// Initiates Stripe Connect onboarding. Returns { url }.
// FIXED: return_url now uses stripeSuccess=true&acct= so the Dashboard
//        useEffect can detect the redirect and call /api/stripe/callback.
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
    const stripe  = new Stripe(env.STRIPE_SECRET_KEY);
    const origin  = env.APP_ORIGIN ?? "https://bookehtrim.co.uk";
    const base    = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);

    // Reuse an existing Stripe account if one already exists for this barber
    let accountId;
    const fbRes = await fetch(`${base}/barbers/${userId}`);
    if (fbRes.ok) {
      const fbData      = await fbRes.json();
      const existingId  = fbData.fields?.stripeAccountId?.stringValue;
      if (existingId) accountId = existingId;
    }

    if (!accountId) {
      const account = await stripe.accounts.create({
        type:  "express",
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
        business_profile: {
          name: businessName || "Barber Shop Owner",
        },
        metadata: { barberId: userId },
      });
      accountId = account.id;

      // Store account ID immediately; stripeConnected stays false until
      // /api/stripe/callback confirms charges_enabled after onboarding.
      await fetch(
        `${base}/barbers/${userId}?updateMask.fieldPaths=stripeAccountId&updateMask.fieldPaths=stripeConnected`,
        {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            fields: toFirestoreFields({ stripeAccountId: accountId, stripeConnected: false }),
          }),
        }
      );
    }

    const accountLink = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${origin}/dashboard?error=retry`,
      // FIXED: was stripe_success=true with no acct param.
      // Now uses stripeSuccess=true&acct= to match the Dashboard useEffect.
      return_url:  `${origin}/dashboard?stripeSuccess=true&acct=${accountId}`,
      type:        "account_onboarding",
    });

    return json({ url: accountLink.url });
  } catch (err) {
    console.error("[connect-error]:", err);
    return json({ error: err.message }, 500);
  }
}

// POST /api/stripe/callback
// Called by the Dashboard useEffect after Stripe redirects back.
// Verifies charges_enabled with Stripe, then writes stripeConnected:true.
// Body: { userId, stripeAccountId }
async function handleStripeCallback(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  const { userId, stripeAccountId } = body ?? {};

  if (!userId || !stripeAccountId) {
    return json({ error: "Missing userId or stripeAccountId" }, 400);
  }

  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    // Always verify with Stripe — never trust the URL param alone.
    // Prevents a spoofed ?stripeSuccess=true from marking someone as connected.
    const account    = await stripe.accounts.retrieve(stripeAccountId);
    const isComplete = account.details_submitted && account.charges_enabled;

    if (!isComplete) {
      return json({
        connected: false,
        reason:    "Onboarding incomplete — details not submitted or charges not enabled",
      });
    }

    const base = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);
    await fetch(`${base}/barbers/${userId}?updateMask.fieldPaths=stripeConnected`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ fields: toFirestoreFields({ stripeConnected: true }) }),
    });

    return json({ connected: true });
  } catch (err) {
    console.error("[stripe-callback] Error:", err);
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
      status:         session.status,
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
    const finalPrice  = calcFinalPriceGbp(tld, env.USD_TO_GBP_RATE);

    return json({ domain: clean, available: isAvailable, price: finalPrice, currency: "GBP" });
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
  const tld             = extractTLD(targetExtension);
  const finalPriceGbp   = calcFinalPriceGbp(tld, env.USD_TO_GBP_RATE);
  const priceGbpPence   = Math.round(finalPriceGbp * 100);
  const origin          = env.APP_ORIGIN ?? "https://bookehtrim.co.uk";

  try {
    const stripe  = new Stripe(env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode:                 "payment",
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
      metadata:    { type: "domain_purchase", domain, barberId },
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
    return json({ success: true, domain: clean, customHostnameId: hostnameResult.id });
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

async function handleBillingPortal(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!env.STRIPE_SECRET_KEY) {
      console.error("Missing STRIPE_SECRET_KEY");
      return json({ error: "Server not configured" }, 500);
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    let body;
    try { body = await request.json(); }
    catch { body = {}; }

    const { barberId } = body;

    if (!barberId) {
      return json({ error: "Missing barberId" }, 400);
    }

    const FIREBASE_PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID;
    if (!FIREBASE_PROJECT_ID) {
      console.error("Missing VITE_FIREBASE_PROJECT_ID");
      return json({ error: "Server not configured" }, 500);
    }

    const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

    const fbRes = await fetch(`${FIRESTORE_BASE}/barbers/${barberId}`);
    if (!fbRes.ok) {
      console.error("Barber not found:", barberId);
      return json({ error: "Barber not found" }, 404);
    }

    const fbData = await fbRes.json();
    const customerId = fbData.fields?.stripeCustomerId?.stringValue;

    if (!customerId) {
      console.error("No Stripe customer ID for barber:", barberId);
      return json({ error: "Stripe not connected. Go to Finance tab to connect Stripe." }, 404);
    }

    const host   = request.headers.get("host") || "bookehtrim.co.uk";
    const origin = host.startsWith("localhost") ? `http://${host}` : `https://${host}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${origin}/dashboard`,
    });

    return json({ url: portalSession.url });
  } catch (err) {
    console.error("[billing-portal] Error:", err.message);
    return json({ error: err.message }, 500);
  }
}

// ── Porkbun Registration Engine ───────────────────────────────────────────────

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
        nameservers:  ["byron.ns.cloudflare.com", "sierra.ns.cloudflare.com"],
      }),
    }
  );

  const nsData = await nsRes.json();
  if (!nsRes.ok || nsData.status !== "SUCCESS") {
    console.warn(`[provision-domain] Nameserver update warning: ${nsData.message || JSON.stringify(nsData)}`);
  }

  return data;
}

// ── Cloudflare Configuration Engine ──────────────────────────────────────────

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

// ── Main Worker Export ────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Global CORS Preflight
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
      case "/api/stripe/callback":
        return handleStripeCallback(request, env);
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
      case "/api/send-push":
        return handleSendPush(request, env);
      case "/api/billing-portal":
        return handleBillingPortal(request, env);

      default:
        // 3. Cloudflare SSL Challenge Bypass
        if (url.pathname.startsWith("/.well-known/cf-custom-hostname-challenge/")) {
          return fetch(request);
        }

        // 4. Multi-Tenant Proxy to Firebase
        const firebaseTargetHost = "booking-system-cdce0.web.app";
        const targetFirebaseUrl  = `https://${firebaseTargetHost}${url.pathname}${url.search}`;
        const incomingHost       = url.hostname;
        const fallbackHost       = "fallback.bookehtrim.co.uk";
        const activeTenant       = url.searchParams.get("tenant") ||
                                   (incomingHost !== fallbackHost ? incomingHost : "bookehnow.co.uk");

        const initOptions = {
          method:  request.method,
          headers: new Headers(request.headers),
        };
        if (request.method !== "GET" && request.method !== "HEAD") {
          initOptions.body = request.body;
        }

        const proxyRequest = new Request(targetFirebaseUrl, initOptions);
        proxyRequest.headers.set("Host",             firebaseTargetHost);
        proxyRequest.headers.set("X-Forwarded-Host", activeTenant);
        proxyRequest.headers.set("X-SaaS-Tenant",    activeTenant);

        let response = await fetch(proxyRequest);

        // 5. SPA Routing Fallback
        if (response.status === 404 && !url.pathname.includes(".")) {
          const fallbackRequest = new Request(
            `https://${firebaseTargetHost}/index.html`,
            { method: "GET", headers: new Headers(request.headers) }
          );
          fallbackRequest.headers.set("Host",             firebaseTargetHost);
          fallbackRequest.headers.set("X-Forwarded-Host", activeTenant);
          fallbackRequest.headers.set("X-SaaS-Tenant",    activeTenant);
          response = await fetch(fallbackRequest);
        }

        return response;
    }
  },
};