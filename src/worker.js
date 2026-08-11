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

// ── Firebase JWT verification ─────────────────────────────────────────────────

async function verifyFirebaseUid(request) {
  const auth  = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Decode header to get kid
    const header  = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
    // Decode payload
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    // Basic expiry check
    if (!payload.sub || (payload.exp * 1000) < Date.now()) return null;
    // Fetch Google public keys (x509 PEM certs keyed by kid)
    const keysRes = await fetch(
      "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    );
    const keys    = await keysRes.json();
    const certPem = keys[header.kid];
    if (!certPem) return null;
    // Strip PEM envelope and decode DER
    const pemContents = certPem
      .replace(/-----BEGIN CERTIFICATE-----/, "")
      .replace(/-----END CERTIFICATE-----/, "")
      .replace(/\s/g, "");
    const derBuffer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "spki", derBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false, ["verify"]
    );
    // Verify signature over header.payload
    const signingInput = new TextEncoder().encode(parts[0] + "." + parts[1]);
    const sigBuffer    = Uint8Array.from(
      atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")),
      c => c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", cryptoKey, sigBuffer, signingInput
    );
    if (!valid) return null;
    return payload.sub; // verified Firebase uid
  } catch {
    return null;
  }
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

// POST /api/create-invoice
// Creates a Stripe invoice on the PT's connected account and sends it to the client.
// Body: { barberId, clientName, clientEmail, lineItems: [{ description, amount }], dueDate? }
async function handleCreateInvoice(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const { barberId, clientName, clientEmail, lineItems, dueDate } = body ?? {};
  if (!barberId || !clientEmail || !lineItems?.length) {
    return json({ error: "Missing required fields" }, 400);
  }

  const callerUid = await verifyFirebaseUid(request);
  if (!callerUid || callerUid !== barberId) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const base   = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);
    const fbRes  = await fetch(`${base}/barbers/${barberId}`);
    const fbData = fbRes.ok ? await fbRes.json() : null;
    const stripeAccountId = fbData?.fields?.stripeAccountId?.stringValue;

    if (!stripeAccountId) return json({ error: "Stripe not connected. Go to Finance tab to connect Stripe." }, 400);

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    // Find or create Stripe customer on the connected account
    const existing = await stripe.customers.list(
      { email: clientEmail, limit: 1 },
      { stripeAccount: stripeAccountId }
    );
    const customer = existing.data.length > 0
      ? existing.data[0]
      : await stripe.customers.create(
          { name: clientName || clientEmail, email: clientEmail },
          { stripeAccount: stripeAccountId }
        );

    // Add invoice items
    for (const item of lineItems) {
      await stripe.invoiceItems.create(
        { customer: customer.id, amount: Math.round(item.amount * 100), currency: "gbp", description: item.description },
        { stripeAccount: stripeAccountId }
      );
    }

    // Create, finalize and send
    const invoice = await stripe.invoices.create(
      {
        customer: customer.id,
        collection_method: "send_invoice",
        days_until_due: dueDate ? undefined : 7,
        due_date: dueDate ? Math.floor(new Date(dueDate).getTime() / 1000) : undefined,
        auto_advance: true,
      },
      { stripeAccount: stripeAccountId }
    );

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id, {}, { stripeAccount: stripeAccountId });
    await stripe.invoices.sendInvoice(finalized.id, {}, { stripeAccount: stripeAccountId });

    // Save to Firestore
    const invoiceRecord = {
      fields: {
        stripeInvoiceId: { stringValue: finalized.id },
        clientName:      { stringValue: clientName || clientEmail },
        clientEmail:     { stringValue: clientEmail },
        total:           { integerValue: String(finalized.amount_due) },
        currency:        { stringValue: finalized.currency },
        status:          { stringValue: finalized.status },
        invoiceUrl:      { stringValue: finalized.hosted_invoice_url || "" },
        createdAt:       { stringValue: new Date().toISOString() },
      },
    };
    await fetch(`${base}/barbers/${barberId}/ptInvoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoiceRecord),
    });

    return json({ invoiceUrl: finalized.hosted_invoice_url, invoiceId: finalized.id });
  } catch (err) {
    console.error("[create-invoice]", err);
    return json({ error: err.message }, 500);
  }
}

// ── Firebase Admin JWT (service account → access token for Firestore reads) ───

async function getFirebaseAdminToken(env) {
  const email = env.FIREBASE_CLIENT_EMAIL;
  const rawKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !rawKey) return null;

  const now = Math.floor(Date.now() / 1000);
  const header  = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: email, sub: email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
    scope: "https://www.googleapis.com/auth/datastore",
  };

  const b64 = obj => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const signingInput = `${b64(header)}.${b64(payload)}`;

  const pemBody = rawKey.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyBytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const jwt = `${signingInput}.${sigB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const tokenData = await tokenRes.json();
  return tokenData.access_token || null;
}

// POST /api/outlook/sync-booking — called after booking confirmed, creates Outlook event
async function handleOutlookSyncBooking(request, env) {
  if (request.method !== "POST") return json({ ok: false }, 405);
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

  const { barberId, bookingId, name, email, phone, service, date, time, notes } = body ?? {};
  if (!barberId) return json({ ok: false, error: "Missing barberId" }, 400);

  try {
    const adminToken = await getFirebaseAdminToken(env);
    if (!adminToken) return json({ ok: false, error: "No admin credentials" }, 200);

    const projectId = env.VITE_FIREBASE_PROJECT_ID;
    const integPath = `${firestoreBase(projectId)}/barbers/${barberId}/integrations/outlook`;
    const integRes  = await fetch(integPath, { headers: { Authorization: `Bearer ${adminToken}` } });
    if (!integRes.ok) return json({ ok: false, error: "Barber not connected to Outlook" }, 200);

    const integData = await integRes.json();
    const fields    = integData.fields || {};
    let accessToken  = fields.accessToken?.stringValue;
    const refreshToken = fields.refreshToken?.stringValue;
    const expiry     = Number(fields.expiry?.integerValue || 0);

    if (!accessToken) return json({ ok: false, error: "No Outlook token" }, 200);

    // Refresh if expired
    if (Date.now() > expiry - 60_000 && refreshToken) {
      const refreshParams = new URLSearchParams({
        client_id:     env.MICROSOFT_CLIENT_ID,
        client_secret: env.MICROSOFT_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type:    "refresh_token",
        scope:         "Calendars.ReadWrite offline_access",
      });
      const refreshRes = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: refreshParams.toString(),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        accessToken = refreshData.access_token;
        const newExpiry = Date.now() + refreshData.expires_in * 1000;
        // Save refreshed token back to Firestore
        await fetch(`${integPath}?updateMask.fieldPaths=accessToken&updateMask.fieldPaths=refreshToken&updateMask.fieldPaths=expiry`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ fields: {
            accessToken:  { stringValue: accessToken },
            refreshToken: { stringValue: refreshData.refresh_token || refreshToken },
            expiry:       { integerValue: String(newExpiry) },
          }}),
        });
      }
    }

    // Build calendar event
    const [year, month, day] = (date || "").split("-").map(Number);
    const [hour, minute]     = (time || "00:00").split(":").map(Number);
    const start = new Date(Date.UTC(year, month - 1, day, hour - 1, minute)); // BST offset approx
    const end   = new Date(start.getTime() + 60 * 60_000);
    const toISO = d => d.toISOString().slice(0, 19);

    const event = {
      subject: `${service || "Appointment"} — ${name || "Client"}`,
      body: { contentType: "text", content: [`Client: ${name}`, `Phone: ${phone || "N/A"}`, `Email: ${email || "N/A"}`, `Notes: ${notes || "—"}`].join("\n") },
      start: { dateTime: toISO(start), timeZone: "Europe/London" },
      end:   { dateTime: toISO(end),   timeZone: "Europe/London" },
    };

    const eventRes = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!eventRes.ok) {
      const err = await eventRes.json().catch(() => ({}));
      return json({ ok: false, error: err?.error?.message }, 200);
    }

    const eventData = await eventRes.json();

    // Mark booking as synced
    if (bookingId) {
      await fetch(`${firestoreBase(projectId)}/bookings/${bookingId}?updateMask.fieldPaths=outlookSynced&updateMask.fieldPaths=outlookEventId`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fields: {
          outlookSynced:  { booleanValue: true },
          outlookEventId: { stringValue: eventData.id || "" },
        }}),
      });
    }

    return json({ ok: true, eventId: eventData.id });
  } catch (e) {
    return json({ ok: false, error: e.message }, 200);
  }
}

// POST /api/outlook/exchange — exchanges OAuth code for tokens (keeps client_secret server-side)
async function handleOutlookExchange(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const { code, redirect_uri } = body ?? {};
  if (!code || !redirect_uri) return json({ error: "Missing code or redirect_uri" }, 400);

  const params = new URLSearchParams({
    client_id:     env.MICROSOFT_CLIENT_ID,
    client_secret: env.MICROSOFT_CLIENT_SECRET,
    code,
    redirect_uri,
    grant_type:    "authorization_code",
    scope:         "Calendars.ReadWrite offline_access",
  });

  const res = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    params.toString(),
  });

  const data = await res.json();
  if (!res.ok) return json({ error: data.error_description || "Token exchange failed" }, 400);
  return json(data);
}

// POST /api/outlook/refresh — refreshes an expired access token
async function handleOutlookRefresh(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const { refresh_token } = body ?? {};
  if (!refresh_token) return json({ error: "Missing refresh_token" }, 400);

  const params = new URLSearchParams({
    client_id:     env.MICROSOFT_CLIENT_ID,
    client_secret: env.MICROSOFT_CLIENT_SECRET,
    refresh_token,
    grant_type:    "refresh_token",
    scope:         "Calendars.ReadWrite offline_access",
  });

  const res = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    params.toString(),
  });

  const data = await res.json();
  if (!res.ok) return json({ error: data.error_description || "Token refresh failed" }, 400);
  return json(data);
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

  const callerUid = await verifyFirebaseUid(request);
  if (!callerUid || callerUid !== barberId) {
    return json({ error: "Unauthorized" }, 401);
  }

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

  const callerUid = await verifyFirebaseUid(request);
  if (!callerUid || callerUid !== userId) {
    return json({ error: "Unauthorized" }, 401);
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

  const callerUid = await verifyFirebaseUid(request);
  if (!callerUid || callerUid !== barberId) {
    return json({ error: "Unauthorized" }, 401);
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

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${env.VITE_FIREBASE_PROJECT_ID}/databases/(default)/documents`;

  async function updateBarberStatus(barberId, fields) {
    const fieldPaths = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join("&");
    await fetch(`${FIRESTORE_BASE}/barbers/${barberId}?${fieldPaths}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: toFirestoreFields(fields) }),
    });
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

    if (meta.type === "platform_subscription" && meta.barberId) {
      try {
        await updateBarberStatus(meta.barberId, {
          subscriptionStatus: "active",
          stripeCustomerId:   session.customer,
        });
        console.log(`[stripe-webhook] Subscription activated for ${meta.barberId}`);
      } catch (err) {
        console.error("[stripe-webhook] Failed to activate subscription:", err.message);
      }
    }
  }

  if (event.type === "customer.subscription.updated") {
    const sub      = event.data.object;
    const barberId = sub.metadata?.barberId;
    if (barberId) {
      try {
        await updateBarberStatus(barberId, { subscriptionStatus: sub.status });
        console.log(`[stripe-webhook] Subscription status → ${sub.status} for ${barberId}`);
      } catch (err) {
        console.error("[stripe-webhook] Failed to sync subscription status:", err.message);
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub      = event.data.object;
    const barberId = sub.metadata?.barberId;
    if (!barberId) {
      console.error("[stripe-webhook] customer.subscription.deleted missing barberId in metadata");
      return json({ received: true });
    }

    try {
      await updateBarberStatus(barberId, { subscriptionStatus: "canceled" });
      console.log(`[stripe-webhook] Subscription canceled for ${barberId}`);
    } catch (err) {
      console.error("[stripe-webhook] Failed to mark canceled:", err.message);
    }

    // Auto-refund if the most recent payment was within 14 days
    const REFUND_WINDOW_DAYS = 14;
    try {
      const invoices = await stripe.invoices.list({
        customer: sub.customer,
        limit:    1,
        status:   "paid",
      });
      const lastInvoice = invoices.data[0];
      if (lastInvoice) {
        const paidAt  = lastInvoice.status_transitions?.paid_at;
        const ageMs   = Date.now() - (paidAt * 1000);
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        if (ageDays <= REFUND_WINDOW_DAYS && lastInvoice.charge) {
          const refund = await stripe.refunds.create({ charge: lastInvoice.charge });
          console.log(`[stripe-webhook] Auto-refunded £${(refund.amount / 100).toFixed(2)} for ${barberId} (paid ${ageDays.toFixed(1)} days ago)`);
        } else {
          console.log(`[stripe-webhook] No refund for ${barberId}: last payment ${ageDays.toFixed(1)} days ago`);
        }
      }
    } catch (err) {
      console.error("[stripe-webhook] Auto-refund failed for", barberId, err.message);
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

    const callerUid = await verifyFirebaseUid(request);
    if (!callerUid || callerUid !== barberId) {
      return json({ error: "Unauthorized" }, 401);
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

// ── Google Sitemap Ping ───────────────────────────────────────────────────────

async function handlePingGoogle(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const sitemapUrl = "https://bookrightly.co.uk/sitemap.xml";
  try {
    const [gRes, bRes] = await Promise.all([
      fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
      fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
    ]);
    return json({ ok: true, google: gRes.status, bing: bRes.status });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}

// ── Business SEO helpers ──────────────────────────────────────────────────────

const ROUTE_TYPE_LABEL = {
  barber:       "Barber",
  shop:         "Shop",
  "pt-book":    "Personal Trainer",
  "pt-booking": "Personal Trainer",
  hairdresser:  "Hairdresser",
  decorator:    "Decorator & Painter",
};

// Regex to detect business profile routes and extract [routeType, businessId]
const BUSINESS_ROUTE_RE = /^\/(barber|shop|pt-book|pt-booking|hairdresser|decorator)\/([^/]+)\/?$/;

async function fetchBarberSEO(barberId, projectId) {
  try {
    const res = await fetch(`${firestoreBase(projectId)}/barbers/${barberId}`);
    if (!res.ok) return null;
    const doc = await res.json();
    const f   = doc.fields ?? {};
    return {
      name:      f.businessName?.stringValue || f.name?.stringValue || "Bookrightly Professional",
      specialty: f.specialty?.stringValue || f.bio?.stringValue || "",
      type:      f.businessType?.stringValue || "",
      city:      f.city?.stringValue || f.location?.stringValue || "",
      image:     f.profileImage?.stringValue || f.logoUrl?.stringValue || "",
    };
  } catch {
    return null;
  }
}

function injectBusinessSEO(response, { name, specialty, type, city, image, canonicalUrl }) {
  const typeLabel = type || "Professional";
  const title     = city
    ? `${name} – ${typeLabel} in ${city} | Bookrightly`
    : `${name} – ${typeLabel} | Bookrightly`;
  const desc = specialty
    ? `${specialty}. Book with ${name} online via Bookrightly.`
    : `Book with ${name}${city ? ` in ${city}` : ""}. Professional ${typeLabel.toLowerCase()} services. Easy online booking via Bookrightly.`;

  const ldJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    description: desc,
    url: canonicalUrl,
    ...(image ? { image } : {}),
    ...(city  ? { address: { "@type": "PostalAddress", addressLocality: city, addressCountry: "GB" } } : {}),
  });

  return new HTMLRewriter()
    .on("title", { element: el => el.setInnerContent(title) })
    .on('meta[name="description"]',        { element: el => el.setAttribute("content", desc) })
    .on('meta[property="og:title"]',       { element: el => el.setAttribute("content", title) })
    .on('meta[property="og:description"]', { element: el => el.setAttribute("content", desc) })
    .on('meta[property="og:url"]',         { element: el => el.setAttribute("content", canonicalUrl) })
    .on('meta[property="og:image"]',       { element: el => { if (image) el.setAttribute("content", image); } })
    .on('meta[name="twitter:title"]',      { element: el => el.setAttribute("content", title) })
    .on('meta[name="twitter:description"]',{ element: el => el.setAttribute("content", desc) })
    .on("head", {
      element: el => el.append(
        `<link rel="canonical" href="${canonicalUrl}">` +
        `<script type="application/ld+json">${ldJson}</script>`,
        { html: true }
      ),
    })
    .transform(response);
}

async function handleDynamicSitemap(env) {
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  const base      = "https://bookrightly.co.uk";
  const staticUrls = [
    "/", "/login", "/signup", "/privacy", "/terms",
    "/compare", "/pricing", "/how-it-works", "/blog",
    "/fresha-alternative", "/treatwell-alternative",
    "/booking-software/barbers", "/booking-software/salons",
    "/booking-software/personal-trainers", "/booking-software/decorators",
    "/tools/no-show-calculator",
  ].map(p => `\n  <url><loc>${base}${p}</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>`).join("");

  const blogSlugs = [
    "how-to-reduce-no-shows-barber",
    "should-personal-trainers-charge-upfront",
    "how-to-get-more-bookings-instagram-barber",
    "true-cost-of-phone-only-booking-salon",
    "how-online-booking-helps-decorators-win-more-jobs",
  ];
  const blogUrls = blogSlugs.map(s => `\n  <url><loc>${base}/blog/${s}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`).join("");

  let businessUrls = "";
  if (projectId) {
    try {
      // Fetch all barber documents (up to 300 — Firestore REST default page size)
      const res  = await fetch(`${firestoreBase(projectId)}/barbers?pageSize=300`);
      const data = await res.json();
      for (const doc of data.documents ?? []) {
        const id   = doc.name.split("/").pop();
        const f    = doc.fields ?? {};
        const type = f.businessType?.stringValue?.toLowerCase() ?? "";
        const slug = type.includes("pt") || type.includes("trainer") ? "pt-book"
                   : type.includes("hair")                           ? "hairdresser"
                   : type.includes("decor")                          ? "decorator"
                   : "barber";
        businessUrls += `\n  <url><loc>${base}/${slug}/${id}</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`;
      }
    } catch { /* silently skip if Firestore unavailable */ }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${blogUrls}${businessUrls}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
  });
}

async function handleFetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Global CORS Preflight
    if (request.method === "OPTIONS") {
      const requestOrigin = request.headers.get("Origin") || "";
      const isAllowedOrigin =
        requestOrigin === "https://bookrightly.co.uk" ||
        requestOrigin.endsWith(".bookrightly.co.uk") ||
        requestOrigin === "https://booking-system.deanburt1308.workers.dev" ||
        requestOrigin === "https://bookehtrim.co.uk" ||
        requestOrigin.endsWith(".bookehtrim.co.uk");
      const corsHeaders = isAllowedOrigin
        ? {
            "Access-Control-Allow-Origin":  requestOrigin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, stripe-signature",
            "Vary": "Origin",
          }
        : {
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, stripe-signature",
          };
      return new Response(null, { status: 204, headers: corsHeaders });
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
      case "/api/create-invoice":
        return handleCreateInvoice(request, env);
      case "/api/ping-google":
        return handlePingGoogle(request, env);
      case "/api/outlook/exchange":
        return handleOutlookExchange(request, env);
      case "/api/outlook/refresh":
        return handleOutlookRefresh(request, env);
      case "/api/outlook/sync-booking":
        return handleOutlookSyncBooking(request, env);
      case "/sitemap.xml":
        return handleDynamicSitemap(env);

      case "/llms.txt":
        return new Response(`# Bookrightly

> Bookrightly is a UK booking SaaS for independent service professionals — barbers, hairdressers, personal trainers, and decorators. Each business gets their own branded public profile page, online slot booking, Stripe deposit payments, and a client dashboard. Flat monthly fee, no commission.

## Product

- [Homepage](https://bookrightly.co.uk)
- [How it works](https://bookrightly.co.uk/how-it-works)
- [Pricing](https://bookrightly.co.uk/pricing)
- [90-day free trial — no credit card required](https://bookrightly.co.uk/signup)

## Who it's for

- Barbers and barbershops
- Hairdressers and salons
- Personal trainers and fitness coaches
- Painters and decorators
- Any UK service professional (new industries available on request)

## Key features

- Branded booking page at bookrightly.co.uk/your-name
- Real-time slot availability and booking
- Stripe deposit payments (no commission, flat £10–20/month subscription)
- Client portal: PAR-Q forms, food diary, check-ins, colour approval
- Push notifications and installable PWA (works offline)
- Dashboard with day planner, client profiles, notifications

## Comparison

- [Fresha alternative](https://bookrightly.co.uk/fresha-alternative) — Bookrightly charges a flat fee; Fresha charges commission on every online payment
- [Treatwell alternative](https://bookrightly.co.uk/treatwell-alternative) — no marketplace, your own branded page
- [Barber booking software](https://bookrightly.co.uk/booking-software/barbers)
- [Salon booking software](https://bookrightly.co.uk/booking-software/salons)
- [Personal trainer booking software](https://bookrightly.co.uk/booking-software/personal-trainers)
- [Decorator booking software](https://bookrightly.co.uk/booking-software/decorators)

## Blog

- [How to reduce no-shows as a barber](https://bookrightly.co.uk/blog/how-to-reduce-no-shows-barber)
- [Should personal trainers charge upfront?](https://bookrightly.co.uk/blog/should-personal-trainers-charge-upfront)
- [How to get more bookings from Instagram](https://bookrightly.co.uk/blog/how-to-get-more-bookings-instagram-barber)
- [The true cost of phone-only booking for salons](https://bookrightly.co.uk/blog/true-cost-of-phone-only-booking-salon)
- [How online booking helps decorators win more jobs](https://bookrightly.co.uk/blog/how-online-booking-helps-decorators-win-more-jobs)

## Tools

- [No-show cost calculator](https://bookrightly.co.uk/tools/no-show-calculator)
- [Barber & salon revenue calculator](https://bookrightly.co.uk/tools/revenue-calculator)
- [Personal trainer session rate calculator](https://bookrightly.co.uk/tools/pt-rate-calculator)
- [Service pricing calculator](https://bookrightly.co.uk/tools/service-pricing-calculator)

## Demo profiles

- [Fade Factory (barber)](https://bookrightly.co.uk/barber/S5s1FWMaz1XuAEo8gDSTTIqlqgL2)
- [Luxe Hair Studio (hairdresser)](https://bookrightly.co.uk/hairdresser/xyPHCqfFgoYympmcqUAzNS37URG3)
- [Premier Painters London (decorator)](https://bookrightly.co.uk/decorator/cKyzLBNBHuYKBS439GuE74UYEUv1)
- [DB Fitness (personal trainer)](https://bookrightly.co.uk/pt-booking/Ih8OFcRzvuS3QbwtsYPeUFCnUEo1)
`, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
        });

      case "/.well-known/assetlinks.json":
        return new Response(JSON.stringify([{
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: "com.bookrightly.app",
            sha256_cert_fingerprints: [
              "C4:A4:38:9C:FF:92:1F:D9:D9:41:1D:8D:27:69:E3:C9:78:55:D3:D0:AB:96:EB:AD:1B:D0:18:BA:DA:1A:F4:4D"
            ]
          }
        }]), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });

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

        // 6. Business-page SEO injection
        const seoMatch = BUSINESS_ROUTE_RE.exec(url.pathname);
        if (seoMatch && response.headers.get("content-type")?.includes("text/html") && env.VITE_FIREBASE_PROJECT_ID) {
          const [, routeType, businessId] = seoMatch;
          const seoData = await fetchBarberSEO(businessId, env.VITE_FIREBASE_PROJECT_ID);
          if (seoData) {
            const fallbackType = ROUTE_TYPE_LABEL[routeType] ?? "Professional";
            const noCache = new Headers(response.headers);
            noCache.set("Cache-Control", "no-store, no-cache, must-revalidate");
            return injectBusinessSEO(
              new Response(response.body, { status: response.status, statusText: response.statusText, headers: noCache }),
              { ...seoData, type: seoData.type || fallbackType, canonicalUrl: `https://bookrightly.co.uk${url.pathname}` }
            );
          }
        }

        // 6b. Compare page SEO injection
        if (url.pathname === "/compare" && response.headers.get("content-type")?.includes("text/html")) {
          const title = "Bookrightly vs Fresha, Treatwell & Bark — Why UK Professionals Switch";
          const desc  = "Honest comparison: Bookrightly vs Fresha, Treatwell, Bark.com, and Mindbody. Flat £10–20/month, no commission, your own branded page, and a 90-day free trial.";
          const canon = "https://bookrightly.co.uk/compare";
          const ldJson = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: title,
            description: desc,
            url: canon,
            publisher: { "@type": "Organization", name: "Bookrightly", url: "https://bookrightly.co.uk" },
          });
          const noCache = new Headers(response.headers);
          noCache.set("Cache-Control", "no-store, no-cache, must-revalidate");
          return new HTMLRewriter()
            .on("title", { element: el => el.setInnerContent(title) })
            .on('meta[name="description"]',        { element: el => el.setAttribute("content", desc) })
            .on('meta[property="og:title"]',       { element: el => el.setAttribute("content", title) })
            .on('meta[property="og:description"]', { element: el => el.setAttribute("content", desc) })
            .on('meta[property="og:url"]',         { element: el => el.setAttribute("content", canon) })
            .on('meta[name="twitter:title"]',      { element: el => el.setAttribute("content", title) })
            .on('meta[name="twitter:description"]',{ element: el => el.setAttribute("content", desc) })
            .on("head", { element: el => el.append(`<link rel="canonical" href="${canon}"><script type="application/ld+json">${ldJson}</script>`, { html: true }) })
            .transform(new Response(response.body, { status: response.status, statusText: response.statusText, headers: noCache }));
        }

        // 6c. SEO injection for programmatic SEO pages
        const seoPages = {
          "/fresha-alternative": {
            title: "Fresha Alternative UK — Bookrightly | Keep 100% of Your Earnings",
            desc:  "Tired of Fresha's marketplace fees? Bookrightly is the Fresha alternative that gives UK professionals a branded booking page for a flat £10/month — no commission ever.",
          },
          "/treatwell-alternative": {
            title: "Treatwell Alternative UK — Stop Giving Away 30% | Bookrightly",
            desc:  "Treatwell takes 20–30% of every booking. Bookrightly charges a flat £10/month with no commission. Switch today and keep what you earn. 90-day free trial.",
          },
          "/booking-software/barbers": {
            title: "Barber Booking Software UK — Online Booking for Barbers | Bookrightly",
            desc:  "The best online booking system for UK barbers. Custom profile, Stripe deposits, real-time slots, and client reviews — all for £10/month. 90-day free trial.",
          },
          "/booking-software/salons": {
            title: "Salon Booking Software UK — Online Booking for Hair Salons | Bookrightly",
            desc:  "Online booking software for UK hair salons. Branded page, treatment menu, Stripe deposits, before & after portfolio — flat £10/month, no commission.",
          },
          "/booking-software/personal-trainers": {
            title: "Personal Trainer Booking Software UK — PAR-Q, Plans & Payments | Bookrightly",
            desc:  "Booking and client management for UK PTs. PAR-Q forms, food diary, check-ins, workout plans, Stripe payments — all for £20/month. 90-day free trial.",
          },
          "/pricing": {
            title: "Bookrightly Pricing — Flat Monthly Fee, No Commission | UK Booking Software",
            desc:  "Simple pricing for UK professionals. £10/month for barbers, hairdressers, and decorators. £20/month for personal trainers. 90-day free trial, no card needed.",
          },
          "/how-it-works": {
            title: "How Bookrightly Works — Online Booking for UK Professionals",
            desc:  "See how Bookrightly works from sign-up to first booking. Set up your branded page, add services, open your schedule, and go live in under an hour.",
          },
          "/booking-software/decorators": {
            title: "Decorator Booking Software UK — Quotes, Portfolio & Site Visits | Bookrightly",
            desc:  "Online booking software for UK decorators and tradespeople. Portfolio page, quote request form, site visit booking, colour approval — flat £10/month, no commission.",
          },
          "/blog": {
            title: "Bookrightly Blog — Advice for UK Service Professionals",
            desc:  "Practical guides on bookings, no-shows, deposits, and growing a service business in the UK. Written for barbers, salons, personal trainers, and decorators.",
          },
          "/tools/no-show-calculator": {
            title: "No-Show Cost Calculator — Free Tool for UK Service Businesses | Bookrightly",
            desc:  "Calculate exactly how much no-shows are costing your business per year, and how much a deposit system would recover. Free tool for barbers, salons, and PTs.",
          },
        };
        // Blog post SEO injection
        const blogPostMeta = {
          "how-to-reduce-no-shows-barber": { title: "How to Reduce No-Shows as a Barber | Bookrightly", desc: "No-shows cost UK barbers hundreds per month. Here's the deposit strategy that actually works — and how to explain it to clients without losing them." },
          "should-personal-trainers-charge-upfront": { title: "Should Personal Trainers Charge Upfront? | Bookrightly", desc: "Charging upfront for PT sessions reduces cancellations and protects your income. The practical guide for UK personal trainers." },
          "how-to-get-more-bookings-instagram-barber": { title: "How to Get More Bookings from Instagram as a Barber or Salon | Bookrightly", desc: "Most barbers and salons get likes but not bookings from Instagram. Here's what actually converts followers into paying clients." },
          "true-cost-of-phone-only-booking-salon": { title: "The True Cost of Phone-Only Booking for Hair Salons | Bookrightly", desc: "If your salon only takes bookings by phone or DM, you're losing clients every day without realising it. Here's what it actually costs." },
          "how-online-booking-helps-decorators-win-more-jobs": { title: "How Online Booking Helps Decorators Win More Jobs | Bookrightly", desc: "Most decorators lose jobs before the first phone call. A professional online presence with a quote request form changes who clients choose." },
        };
        if (url.pathname.startsWith("/blog/") && response.headers.get("content-type")?.includes("text/html")) {
          const slug = url.pathname.replace("/blog/", "");
          const postMeta = blogPostMeta[slug];
          if (postMeta) {
            const canon = `https://bookrightly.co.uk${url.pathname}`;
            const ldJson = JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: postMeta.title, description: postMeta.desc, url: canon, publisher: { "@type": "Organization", name: "Bookrightly", url: "https://bookrightly.co.uk" } });
            const noCache = new Headers(response.headers);
            noCache.set("Cache-Control", "no-store, no-cache, must-revalidate");
            return new HTMLRewriter()
              .on("title", { element: el => el.setInnerContent(postMeta.title) })
              .on('meta[name="description"]',        { element: el => el.setAttribute("content", postMeta.desc) })
              .on('meta[property="og:title"]',       { element: el => el.setAttribute("content", postMeta.title) })
              .on('meta[property="og:description"]', { element: el => el.setAttribute("content", postMeta.desc) })
              .on('meta[property="og:url"]',         { element: el => el.setAttribute("content", canon) })
              .on('meta[name="twitter:title"]',      { element: el => el.setAttribute("content", postMeta.title) })
              .on('meta[name="twitter:description"]',{ element: el => el.setAttribute("content", postMeta.desc) })
              .on("head", { element: el => el.append(`<link rel="canonical" href="${canon}"><script type="application/ld+json">${ldJson}</script>`, { html: true }) })
              .transform(new Response(response.body, { status: response.status, statusText: response.statusText, headers: noCache }));
          }
        }

        const seoPageData = seoPages[url.pathname];
        if (seoPageData && response.headers.get("content-type")?.includes("text/html")) {
          const { title, desc } = seoPageData;
          const canon  = `https://bookrightly.co.uk${url.pathname}`;
          const ldJson = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: title, description: desc, url: canon,
            publisher: { "@type": "Organization", name: "Bookrightly", url: "https://bookrightly.co.uk" },
          });
          const noCache = new Headers(response.headers);
          noCache.set("Cache-Control", "no-store, no-cache, must-revalidate");
          return new HTMLRewriter()
            .on("title", { element: el => el.setInnerContent(title) })
            .on('meta[name="description"]',        { element: el => el.setAttribute("content", desc) })
            .on('meta[property="og:title"]',       { element: el => el.setAttribute("content", title) })
            .on('meta[property="og:description"]', { element: el => el.setAttribute("content", desc) })
            .on('meta[property="og:url"]',         { element: el => el.setAttribute("content", canon) })
            .on('meta[name="twitter:title"]',      { element: el => el.setAttribute("content", title) })
            .on('meta[name="twitter:description"]',{ element: el => el.setAttribute("content", desc) })
            .on("head", { element: el => el.append(`<link rel="canonical" href="${canon}"><script type="application/ld+json">${ldJson}</script>`, { html: true }) })
            .transform(new Response(response.body, { status: response.status, statusText: response.statusText, headers: noCache }));
        }

        // 7. Prevent Cloudflare edge-caching sw.js and index.html so browsers
        //    always receive the latest service worker and HTML on every request.
        const path = url.pathname;
        if (path === "/sw.js" || path === "/index.html" || path === "/" || !path.includes(".")) {
          const headers = new Headers(response.headers);
          headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
          return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
        }

        return response;
    }
}

// Scoped to what this app actually loads and VERIFIED against a live headless
// run of the real deployed site (checking the browser console for CSP
// violations, not just guessing from source) — a wrong CSP silently breaks
// Firebase Auth, Firestore, Stripe Elements/Checkout, or web fonts, so each
// entry below corresponds to a real, confirmed integration:
//  - js.stripe.com / hooks.stripe.com / *.stripe.com: Stripe.js + Payment/Checkout Elements
//  - *.googleapis.com: Firebase Auth (identitytoolkit/securetoken), Firestore
//    (experimentalForceLongPolling — plain HTTPS, no websocket needed), Storage
//  - *.firebaseapp.com: Firebase Auth's authDomain (popup/redirect flows)
//  - fonts.bunny.net: the actual font provider used (index.html's <link> —
//    NOT Google Fonts, confirmed by a live CSP-violation check that caught
//    an earlier, wrong assumption here), for both the CSS and the font files
//  - the sha256 hash: index.html's one inline <script> (captures the PWA
//    install prompt before React mounts) — allowed by exact hash rather
//    than 'unsafe-inline' so this stays real XSS protection, not theatre
const CSP =
  "default-src 'self'; " +
  "script-src 'self' https://js.stripe.com 'sha256-/l4ajQ/L5o91xPlHq4mEOMH1ogoGzmHPkFKthjI+yCE='; " +
  "style-src 'self' 'unsafe-inline' https://fonts.bunny.net; " +
  "font-src 'self' https://fonts.bunny.net data:; " +
  "img-src 'self' data: https:; " +
  "connect-src 'self' https://*.googleapis.com https://firebasestorage.googleapis.com https://api.stripe.com https://m.stripe.network https://q.stripe.com; " +
  "frame-src https://js.stripe.com https://hooks.stripe.com https://*.firebaseapp.com; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'";

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": CSP,
};

export default {
  async fetch(request, env, ctx) {
    const response = await handleFetch(request, env, ctx);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      if (!headers.has(key)) headers.set(key, value);
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};