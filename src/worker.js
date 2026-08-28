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

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + (4 - (str.length % 4)) % 4, "=");
  return atob(padded);
}

async function verifyFirebaseUid(request, env) {
  const auth  = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const header  = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    // Basic claim checks: expiry, and (when we know our own project id)
    // that this token was actually issued for THIS Firebase project —
    // without this a valid token from a different Firebase project would
    // also pass.
    if (!payload.sub || (payload.exp * 1000) < Date.now()) return null;
    const projectId = env?.VITE_FIREBASE_PROJECT_ID;
    if (projectId && (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`)) {
      return null;
    }
    // Google's securetoken service account keys, as JWKs — NOT the x509
    // cert endpoint. A full X.509 certificate's DER bytes are not a bare
    // SPKI structure, so importKey("spki", ...) on them always throws
    // "Invalid keyData" — which silently made every call to this function
    // fail (return null) regardless of how valid the caller's token was.
    // This is why every endpoint gated by this check (invoices, domain
    // connect, Stripe connect, subscriptions, billing portal) returned 401
    // for every real user, all the time.
    const keysRes = await fetch(
      "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
    );
    const { keys } = await keysRes.json();
    const jwk = keys?.find(k => k.kid === header.kid);
    if (!jwk) return null;
    const cryptoKey = await crypto.subtle.importKey(
      "jwk", jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false, ["verify"]
    );
    const signingInput = new TextEncoder().encode(parts[0] + "." + parts[1]);
    const sigBuffer    = Uint8Array.from(base64UrlDecode(parts[2]), c => c.charCodeAt(0));
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
  const subject    = env.VAPID_SUBJECT || "mailto:noreply@bookrightly.co.uk";

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

  const { barberId, clientName, clientEmail, lineItems } = body ?? {};
  // Email used to be required because Stripe Invoicing needed a real
  // recipient to email — now the trainer sends the link themselves, so
  // there's no reason a walk-in client without an email on file should
  // block creating a payment link at all.
  if (!barberId || (!clientName && !clientEmail) || !lineItems?.length) {
    return json({ error: "Missing required fields" }, 400);
  }

  const callerUid = await verifyFirebaseUid(request, env);
  if (!callerUid || callerUid !== barberId) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Declared outside the try so the catch block can still use it to look
  // up *why* Stripe refused the request — "This invoice cannot be sent
  // right now" is Stripe's generic wording for a restricted/incomplete
  // connected account, and doesn't say what's actually missing.
  let stripeAccountId;
  try {
    const base   = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);
    const fbRes  = await fetch(`${base}/barbers/${barberId}`);
    const fbData = fbRes.ok ? await fbRes.json() : null;
    stripeAccountId = fbData?.fields?.stripeAccountId?.stringValue;

    if (!stripeAccountId) return json({ error: "Stripe not connected. Go to Finance tab to connect Stripe." }, 400);

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    // Stripe's Invoicing product (customers/invoiceItems/invoices) kept
    // returning an opaque "cannot be sent right now" error with no error
    // code, on multiple connected accounts including a freshly-created
    // one — a platform-level Invoicing restriction, not anything about a
    // specific account. Checkout Sessions are a far more universally
    // available product and don't carry that same undocumented gate, so
    // this generates a one-time payment link instead of a formal emailed
    // invoice — the trainer sends the link themselves (matching the
    // "copy this link" pattern used everywhere else in the dashboard)
    // rather than Stripe emailing it.
    const host   = request.headers.get("host") || "bookrightly.co.uk";
    const origin = host.startsWith("localhost") ? `http://${host}` : `https://${host}`;
    const totalPence = lineItems.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        // Stripe rejects an empty-string customer_email outright, and a
        // walk-in client legitimately might not have one on file.
        ...(clientEmail ? { customer_email: clientEmail } : {}),
        line_items: lineItems.map(item => ({
          price_data: {
            currency: "gbp",
            unit_amount: Math.round(item.amount * 100),
            product_data: { name: item.description },
          },
          quantity: 1,
        })),
        success_url: `${origin}/dashboard?paymentRequestSent=true`,
        cancel_url:  `${origin}/dashboard`,
        metadata: { type: "pt_invoice", barberId, clientName: clientName || clientEmail || "" },
      },
      { stripeAccount: stripeAccountId }
    );

    // Save to Firestore — same field names the existing invoice list/
    // history view already reads, so that UI needs no changes. Starts as
    // "open" and the Stripe webhook flips it to "paid" once the client
    // actually completes payment (checkout.session.completed).
    const invoiceRecord = {
      fields: {
        stripeInvoiceId: { stringValue: session.id },
        clientName:      { stringValue: clientName || clientEmail || "" },
        clientEmail:     { stringValue: clientEmail || "" },
        total:           { integerValue: String(totalPence) },
        currency:        { stringValue: "gbp" },
        status:          { stringValue: "open" },
        invoiceUrl:      { stringValue: session.url || "" },
        createdAt:       { stringValue: new Date().toISOString() },
      },
    };
    // barbers/{id}/ptInvoices write needs an authenticated request in
    // firestore.rules (the caller was already verified above via
    // verifyFirebaseUid, but that's this endpoint's own check — it doesn't
    // carry through to a raw server-side fetch, which had no Firebase Auth
    // context and was silently rejected every time).
    const adminToken = await getFirebaseAdminToken(env);
    await fetch(`${base}/barbers/${barberId}/ptInvoices`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(invoiceRecord),
    });

    // Stripe's own Checkout URL is a genuinely huge fragment-encoded link
    // (cs_live_... plus a long # payload) — fine to open directly, but
    // unusable pasted into a text/WhatsApp message. Store a short redirect
    // instead and hand that back as the link to actually send.
    const shortId = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
    await fetch(`${base}/paymentLinks/${shortId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: toFirestoreFields({ url: session.url, barberId, createdAt: new Date().toISOString() }) }),
    });

    return json({ invoiceUrl: `${origin}/pay/${shortId}`, invoiceId: session.id });
  } catch (err) {
    console.error("[create-invoice]", err);
    console.error("[create-invoice] stripe error detail:", JSON.stringify({
      type: err.type, code: err.code, param: err.param,
      statusCode: err.statusCode, requestId: err.requestId,
      docUrl: err.doc_url,
    }));
    let reason = err.message;
    if (stripeAccountId) {
      try {
        const stripe  = new Stripe(env.STRIPE_SECRET_KEY);
        const account = await stripe.accounts.retrieve(stripeAccountId);
        const req = account.requirements || {};
        const details = [
          req.disabled_reason ? `Disabled: ${req.disabled_reason}` : null,
          req.currently_due?.length ? `Needs: ${req.currently_due.join(", ")}` : null,
          req.past_due?.length ? `Overdue: ${req.past_due.join(", ")}` : null,
        ].filter(Boolean).join(" — ");
        if (details) reason = `${reason} (${details})`;
        console.error("[create-invoice] account requirements:", JSON.stringify(req));
        console.error("[create-invoice] account status:", JSON.stringify({
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          capabilities: account.capabilities,
        }));
      } catch (lookupErr) {
        console.error("[create-invoice] account lookup failed:", lookupErr.message);
      }
    }
    return json({ error: reason }, 500);
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

  const callerUid = await verifyFirebaseUid(request, env);
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

  const callerUid = await verifyFirebaseUid(request, env);
  if (!callerUid || callerUid !== userId) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const stripe  = new Stripe(env.STRIPE_SECRET_KEY);
    // Derive from the actual request, not an env var — this previously
    // fell back to a typo'd, unowned domain ("bookehtrim.co.uk") whenever
    // APP_ORIGIN was unset or wrong, sending the user back to a domain
    // with no access to their bookrightly.co.uk login session after
    // completing Stripe onboarding, which looks exactly like being signed
    // out. Same pattern already used correctly by handleCreateSubscription.
    const host    = request.headers.get("host") || "bookrightly.co.uk";
    const origin  = host.startsWith("localhost") ? `http://${host}` : `https://${host}`;
    const base    = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);
    // barbers/{id} write requires request.auth != null in firestore.rules —
    // a plain server-side fetch has no Firebase Auth context at all, so
    // this PATCH was being silently rejected every time (caught by nothing,
    // since the code never even checked fbRes.ok on write). stripeAccountId
    // never actually saved despite the Stripe account itself being created.
    const adminToken = await getFirebaseAdminToken(env);

    // Reuse an existing Stripe account if one already exists for this barber
    // — but Firestore having an id doesn't mean Stripe still does (deleted
    // or rejected connected accounts leave a stale id behind). Verify it
    // still resolves before trusting it, otherwise fall through to
    // creating a fresh account instead of building an accountLink for one
    // that no longer exists (which fails opaquely later).
    let accountId;
    let bookingSlug;
    const fbRes = await fetch(`${base}/barbers/${userId}`);
    if (fbRes.ok) {
      const fbData      = await fbRes.json();
      const existingId  = fbData.fields?.stripeAccountId?.stringValue;
      bookingSlug       = fbData.fields?.bookingSlug?.stringValue;
      if (existingId) {
        try {
          await stripe.accounts.retrieve(existingId);
          accountId = existingId;
        } catch {
          console.error("[connect] stale stripeAccountId, creating a fresh account:", existingId);
        }
      }
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
          // Stripe shows this on the checkout/invoice pages it hosts.
          // Leaving it unset lets whatever the owner typed during Express
          // onboarding's own business-profile step show through instead
          // (which can be a placeholder value like "localhost" if they
          // were just testing) — set it to their real page explicitly.
          url: bookingSlug ? `${origin}/${bookingSlug}` : origin,
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
          headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
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
    // Same missing-auth issue as handleConnect — barbers/{id} writes need
    // an authenticated context. Without this, this PATCH always failed
    // silently and stripeConnected never actually flipped to true, even
    // though Stripe itself confirmed onboarding was complete — meaning
    // "Connect with Stripe" could never actually finish succeeding.
    const adminToken = await getFirebaseAdminToken(env);
    await fetch(`${base}/barbers/${userId}?updateMask.fieldPaths=stripeConnected`, {
      method:  "PATCH",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
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
  // Same fix as handleConnect above — derive from the actual request
  // instead of an env var that can be unset/wrong, so Stripe always
  // redirects back to the domain the user is actually signed in on.
  const requestHost     = request.headers.get("host") || "bookrightly.co.uk";
  const origin          = requestHost.startsWith("localhost") ? `http://${requestHost}` : `https://${requestHost}`;

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

  const callerUid = await verifyFirebaseUid(request, env);
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

    // Same missing-auth issue as handleConnect/handleStripeCallback.
    const adminToken = await getFirebaseAdminToken(env);
    await fetch(`${base}/barbers/${userId}?updateMask.fieldPaths=stripeConnected`, {
      method:  "PATCH",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ fields: toFirestoreFields({ stripeConnected: isConnected }) }),
    });

    return json({ connected: isConnected });
  } catch (err) {
    console.error("[check-stripe] Error:", err);
    return json({ error: err.message }, 500);
  }
}

// Mirrors src/utils/bookingHelpers.jsx's PLATFORM_FEE_PERCENT/STRIPE_PERCENT/
// STRIPE_FIXED_PENCE — Workers can't import Vite src/ modules directly, so
// these are duplicated here. Keep both in sync if the fee ever changes.
// Set to 0 — see the comment on the source of truth in bookingHelpers.jsx.
const PLATFORM_FEE_PERCENT = 0;
const STRIPE_PERCENT       = 0.0175;
const STRIPE_FIXED_PENCE   = 45;

function calculateGrossUp(depositPence) {
  const platformFee  = Math.round(depositPence * PLATFORM_FEE_PERCENT);
  const customerPays = Math.ceil((depositPence + platformFee + STRIPE_FIXED_PENCE) / (1 - STRIPE_PERCENT));
  return { customerPays, platformFee };
}

// The single, server-verified PaymentIntent creation path. Never trusts a
// client-sent amount or Stripe account — both are re-fetched from Firestore
// so pricing/destination can't be spoofed. Called once, from CheckoutForm,
// right before stripe.confirmPayment() (deferred-Elements pattern).
async function handleCreateIntent(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  const { email, barberId, metadata } = body ?? {};
  if (!barberId) return json({ error: "Missing barberId" }, 400);

  const base = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);

  try {
    const fbRes = await fetch(`${base}/barbers/${barberId}`);
    if (!fbRes.ok) return json({ error: "Barber not found" }, 404);
    const fields = (await fbRes.json()).fields || {};

    const rawDeposit    = fields.depositAmount?.stringValue ?? fields.depositAmount?.doubleValue ?? fields.depositAmount?.integerValue;
    const depositPounds = Number(rawDeposit);
    const FALLBACK_PENCE = 2500; // £25
    const finalAmount = (depositPounds > 0) ? Math.round(depositPounds * 100) : FALLBACK_PENCE;

    const barberStripeId = fields.stripeAccountId?.stringValue;
    if (!barberStripeId) return json({ error: "Barber Stripe account not configured" }, 400);

    if (finalAmount < 30) {
      return json({ error: `Deposit (${finalAmount}p) is below the Stripe minimum of 30p (£0.30).` }, 400);
    }

    const { customerPays, platformFee } = calculateGrossUp(finalAmount);

    // accountId/providerId derived server-side from the already-verified
    // barber doc, rather than trusted from the client — barberId is always
    // the specific provider (staff or owner); shopId (normalized to "self"
    // for owners) resolves the parent account.
    const shopId    = fields.shopId?.stringValue;
    const accountId = (shopId && shopId !== "self") ? shopId : barberId;

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: customerPays,
      currency: "gbp",
      receipt_email: email,
      metadata: {
        ...(metadata || {}),
        accountId,
        providerId: barberId,
        depositPounds:    (finalAmount / 100).toFixed(2),
        bookingFeePounds: ((customerPays - finalAmount) / 100).toFixed(2),
      },
      automatic_payment_methods: { enabled: true },
      application_fee_amount: platformFee,
      transfer_data: { destination: barberStripeId },
      on_behalf_of: barberStripeId,
    });

    console.log(`[create-intent] ...${paymentIntent.id.slice(-6)} for ${customerPays}p (deposit ${finalAmount}p, fee ${platformFee}p)`);
    return json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("[create-intent] Error:", err.message);
    return json({ error: err.message, type: err.type }, err.statusCode || 500);
  }
}

// Server-side booking finalization — re-verifies the PaymentIntent directly
// with Stripe (never trusts the client's claim that payment succeeded), then
// writes the booking + marks the slot via the admin-equivalent REST calls
// below (unauthenticated public booking customers have no Firebase Auth
// session, so a client-side Firestore write here would be rejected by
// firestore.rules — this is why finalization has to happen server-side).
async function handleFinalizeBooking(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  const { paymentIntentId, slotId, barberId, formData, date, time } = body ?? {};
  if (!paymentIntentId || !barberId) {
    return json({ error: "Missing paymentIntentId or barberId" }, 400);
  }

  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status !== "succeeded") {
      return json({ error: "Payment has not succeeded" }, 402);
    }
    if (intent.metadata?.providerId && intent.metadata.providerId !== barberId) {
      return json({ error: "barberId does not match the payment" }, 400);
    }

    const bookingId = await finalizeBookingRecords({
      env, paymentIntentId, slotId, barberId, formData: formData || {}, date, time, intent,
    });

    return json({ bookingId });
  } catch (err) {
    console.error("[finalize-booking] Error:", err.message);
    return json({ error: err.message }, 500);
  }
}

// Shared by handleFinalizeBooking (synchronous, primary path) and the
// payment_intent.succeeded webhook (reconciliation safety net) — idempotent
// via the paymentIntentId existence check, so it's safe for both to race.
async function finalizeBookingRecords({ env, paymentIntentId, slotId, barberId, formData, date, time, intent }) {
  const base = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);
  // bookings (read) and slots (write) both require an authenticated
  // request in firestore.rules — every fetch below was previously
  // unauthenticated, so the idempotency check always silently found
  // nothing (fail-open via .catch), and the slot PATCH always silently
  // failed. A real booking would go through, but the slot it was booked
  // from stayed "open" forever, still bookable by the next visitor.
  const adminToken = await getFirebaseAdminToken(env);

  // Idempotency guard — if a booking already exists for this PaymentIntent
  // (e.g. the synchronous call already ran and the webhook is just
  // reconciling), don't create a duplicate.
  const existingQuery = await fetch(`${base}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "bookings" }],
        where: { fieldFilter: { field: { fieldPath: "paymentIntentId" }, op: "EQUAL", value: { stringValue: paymentIntentId } } },
        limit: 1,
      },
    }),
  }).then(r => r.json()).catch(() => []);
  const existing = (existingQuery || []).find(r => r.document);
  if (existing) {
    return existing.document.name.split("/").pop();
  }

  const meta = intent.metadata || {};

  const bookingFields = toFirestoreFields({
    barberId,
    slotId: slotId || "",
    name:  formData.name  || meta.customerName  || "",
    email: formData.email || "",
    phone: formData.phone || meta.customerPhone || "",
    haircutStyle: formData.haircutStyle || meta.serviceName || "",
    barberName: meta.barberName || meta.providerId || "",
    depositAmount: meta.depositPounds    || "",
    bookingFee:    meta.bookingFeePounds || "",
    paymentIntentId,
    date: date || "",
    time: time || "",
    status: "confirmed",
    createdAt: new Date().toISOString(),
  });

  const createRes = await fetch(`${base}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: bookingFields }),
  });
  const createdDoc = await createRes.json();
  const bookingId  = createdDoc.name.split("/").pop();

  if (slotId) {
    // Both fields — different pickers/queries filter by one or the other
    // (useSlots.js's Firestore query filters server-side on isBooked;
    // SlotPicker.jsx filters client-side on status), so setting only one
    // left the slot still visible to whichever consumer checks the other.
    await fetch(`${base}/slots/${slotId}?updateMask.fieldPaths=status&updateMask.fieldPaths=isBooked`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: toFirestoreFields({ status: "booked", isBooked: true }) }),
    }).catch(() => {});
  }

  await fetch(`${base}/barbers/${barberId}/notifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: toFirestoreFields({
        type: "booking",
        title: "New Booking!",
        body: `${formData.name || meta.customerName || "A client"} booked ${formData.haircutStyle || meta.serviceName || "an appointment"} on ${date || ""} at ${time || ""}`,
        read: false,
        createdAt: new Date().toISOString(),
      }),
    }),
  }).catch(() => {});

  return bookingId;
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
  // barbers/{id} writes require an authenticated request in firestore.rules
  // — a webhook has no Firebase Auth context of its own, so every one of
  // these PATCHes was silently rejected. Stripe's webhook could fire
  // correctly and still never actually flip subscriptionStatus/stripe
  // fields in Firestore.
  const adminToken = await getFirebaseAdminToken(env);

  async function updateBarberStatus(barberId, fields) {
    const fieldPaths = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join("&");
    await fetch(`${FIRESTORE_BASE}/barbers/${barberId}?${fieldPaths}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
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

    // PT payment-request links (created on the connected account via
    // handleCreateInvoice) — flips the ptInvoices record from "open" to
    // "paid". Requires this webhook endpoint to also be subscribed to
    // events on connected accounts in the Stripe dashboard, not just
    // platform-account events; if that's not enabled the record just
    // stays "open" rather than failing anything.
    if (meta.type === "pt_invoice" && meta.barberId) {
      try {
        const adminToken = await getFirebaseAdminToken(env);
        const base = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);
        const q = await fetch(`${base}:runQuery`, {
          method: "POST",
          headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: "ptInvoices" }],
              where: { fieldFilter: { field: { fieldPath: "stripeInvoiceId" }, op: "EQUAL", value: { stringValue: session.id } } },
              limit: 1,
            },
            parent: `projects/${env.VITE_FIREBASE_PROJECT_ID}/databases/(default)/documents/barbers/${meta.barberId}`,
          }),
        }).then(r => r.json()).catch(() => []);
        const doc = (q || []).find(r => r.document)?.document;
        if (doc) {
          const docId = doc.name.split("/").pop();
          await fetch(`${base}/barbers/${meta.barberId}/ptInvoices/${docId}?updateMask.fieldPaths=status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ fields: toFirestoreFields({ status: "paid" }) }),
          });
        }
      } catch (err) {
        console.error("[stripe-webhook] Failed to mark payment request paid:", err.message);
      }
    }
  }

  // Reconciliation safety net for booking deposits — normally the booking is
  // already created synchronously by /api/finalize-booking right after
  // stripe.confirmPayment() resolves in the browser. This exists purely to
  // catch the case where the browser tab crashes/closes between the charge
  // succeeding and that call completing; finalizeBookingRecords is idempotent
  // (keyed on paymentIntentId), so it's safe for both paths to race.
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const meta   = intent.metadata ?? {};
    if (meta.providerId) {
      try {
        await finalizeBookingRecords({
          env,
          paymentIntentId: intent.id,
          slotId:   meta.slotId || "",
          barberId: meta.providerId,
          formData: { name: meta.customerName, email: intent.receipt_email, phone: meta.customerPhone, haircutStyle: meta.serviceName },
          date: meta.bookingDate || "",
          time: meta.bookingTime || "",
          intent,
        });
        console.log(`[stripe-webhook] Reconciled booking for payment ...${intent.id.slice(-6)}`);
      } catch (err) {
        console.error("[stripe-webhook] Booking reconciliation failed:", err.message);
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

// Creates the actual Stripe subscription checkout — this route never existed
// in the live Worker (Dashboard.jsx and FinanceTab.jsx both call
// /api/create-subscription, but only a dead Pages-Functions-style file at
// src/api/create-subscription.js implemented it, which this deployment never
// routes to). Found while investigating low conversion: nobody could
// actually convert from trial to paying customer, ever, even if they tried.
// Uses inline price_data (no pre-created Stripe Price object/env var needed,
// since none exist yet) so this works with zero extra Stripe Dashboard setup.
async function handleCreateSubscription(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!env.STRIPE_SECRET_KEY) {
    console.error("Missing STRIPE_SECRET_KEY");
    return json({ error: "Server not configured" }, 500);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  const { barberId, email, businessType } = body ?? {};
  if (!barberId || !email) {
    return json({ error: "barberId and email are required" }, 400);
  }

  const callerUid = await verifyFirebaseUid(request, env);
  if (!callerUid || callerUid !== barberId) {
    return json({ error: "Unauthorized" }, 401);
  }

  const isTrainer  = businessType === "trainer";
  const unitAmount = isTrainer ? 1500 : 1000; // £15 or £10/month, in pence
  const planName   = isTrainer ? "Bookrightly — Personal Trainer Plan" : "Bookrightly — Subscription";
  const host       = request.headers.get("host") || "bookrightly.co.uk";
  const origin     = host.startsWith("localhost") ? `http://${host}` : `https://${host}`;

  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    // Reuse an existing Stripe customer for this email rather than creating
    // a new one on every checkout attempt (including abandoned ones).
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data.length > 0
      ? existing.data[0]
      : await stripe.customers.create({ email, metadata: { barberId } });

    const session = await stripe.checkout.sessions.create({
      mode:     "subscription",
      customer: customer.id,
      line_items: [{
        price_data: {
          currency: "gbp",
          unit_amount: unitAmount,
          recurring: { interval: "month" },
          product_data: { name: planName },
        },
        quantity: 1,
      }],
      // Session metadata drives the checkout.session.completed handler
      // below; subscription_data.metadata carries barberId onto the
      // resulting Subscription object itself, which is what the
      // customer.subscription.updated/deleted handlers read.
      metadata:          { type: "platform_subscription", barberId },
      subscription_data: { metadata: { barberId } },
      success_url: `${origin}/dashboard?subscribed=true`,
      cancel_url:  `${origin}/dashboard`,
    });

    return json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[create-subscription] Stripe error:", err.message);
    return json({ error: err.message }, 500);
  }
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

    const callerUid = await verifyFirebaseUid(request, env);
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

    const host   = request.headers.get("host") || "bookrightly.co.uk";
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
  // Same missing-auth issue as the Stripe write paths above — barbers/{id}
  // writes need an authenticated request, so a domain purchase/connection
  // could go all the way through Porkbun + Cloudflare and still never
  // save the resulting customDomain/domainStatus fields.
  const adminToken = await getFirebaseAdminToken(env);
  await fetch(`${base}/barbers/${barberId}?${params}`, {
    method:  "PATCH",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
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
  plumber:      "Plumbing, Heating & Electrical",
};

// Keyed by the `businessType` field's raw enum value (barber | hairdresser |
// decorator | trainer | plumber — see CLAUDE.md's data model), NOT the route
// segment above (ROUTE_TYPE_LABEL) — those are two different keyspaces (e.g.
// businessType "trainer" vs route segment "pt-book"). fetchBarberSEO/
// fetchBarberSEOBySlug return this raw value as `type`, and it always wins
// over ROUTE_TYPE_LABEL's fallback in injectBusinessSEO's title/description
// since it's non-empty for virtually every account — so every business's SEO
// title was showing the raw lowercase value ("Fade Factory – barber |
// Bookrightly") instead of a real label, for every business type, not just
// the plumber routing gap above.
const BUSINESS_TYPE_LABEL = {
  barber:      "Barber",
  hairdresser: "Hairdresser",
  decorator:   "Decorator & Painter",
  trainer:     "Personal Trainer",
  plumber:     "Plumbing, Heating & Electrical",
};

// Regex to detect business profile routes and extract [routeType, businessId].
// Every entry here must have a matching key in ROUTE_TYPE_LABEL above and in
// src/App.jsx's own route-matching list — "plumber" was missing from this
// regex (though present everywhere else), so /plumber/:id pages got zero SEO
// injection: generic "Bookrightly | Online Booking..." title for every one of
// them. Slug-based URLs (bookrightly.co.uk/{slug}) were unaffected — that path
// isn't gated by this regex at all — so this only bit accounts without a
// claimed booking-slug yet.
// Third segment is optional and only ever populated in practice for
// hairdresser/decorator/pt-booking's individual staff pages
// (/hairdresser/:shopId/:staffId etc.) — barber staff already use their own
// top-level /barber/:id, so this doesn't change matching for that prefix.
const BUSINESS_ROUTE_RE = /^\/(barber|shop|pt-book|pt-booking|hairdresser|decorator|plumber)\/([^/]+)(?:\/([^/]+))?\/?$/;

// Mirrors src/utils/bookingSlug.js's RESERVED_SLUGS — keep in sync. Used here
// so a single-segment path that's actually a static platform page never
// triggers a wasted Firestore round-trip looking it up as a booking slug.
const RESERVED_SLUGS_WORKER = new Set([
  "shop", "pt-booking", "decorator", "hairdresser", "barber", "book",
  "confirmation", "auth", "review", "login", "signup", "cancel-booking",
  "website-design", "compare", "fresha-alternative", "treatwell-alternative",
  "booking-software", "pricing", "how-it-works", "blog", "tools", "terms",
  "privacy", "contact", "workout", "food-diary", "check-in", "par-q",
  "colour-approval", "quote-view", "queue", "food-generator", "client-portal",
  "pt-book", "onboarding", "dashboard",
  "admin", "api", "account", "settings", "support", "help", "about",
  "bookrightly", "www", "register", "sitemap.xml", "robots.txt",
]);

async function fetchBarberSEOBySlug(slug, projectId) {
  try {
    const res = await fetch(`${firestoreBase(projectId)}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "barbers" }],
          where: { fieldFilter: { field: { fieldPath: "bookingSlug" }, op: "EQUAL", value: { stringValue: slug } } },
          limit: 1,
        },
      }),
    });
    if (!res.ok) return null;
    const results = await res.json();
    const match = (results || []).find(r => r.document);
    if (!match) return null;
    const f = match.document.fields ?? {};
    return {
      name:      f.businessName?.stringValue || f.name?.stringValue || "Bookrightly Professional",
      specialty: f.specialty?.stringValue || f.bio?.stringValue || "",
      type:      BUSINESS_TYPE_LABEL[f.businessType?.stringValue] || f.businessType?.stringValue || "",
      city:      f.city?.stringValue || f.location?.stringValue || "",
      image:     f.profileImage?.stringValue || f.logoUrl?.stringValue || "",
      customDomain: f.customDomain?.stringValue || "",
    };
  } catch {
    return null;
  }
}

// Looks up a business by its connected custom domain (either connection
// method writes the same bare-hostname `customDomain` field) — used both to
// serve a per-business PWA manifest and to inject per-business SEO/OG/
// favicon tags (title, share-link preview image, etc.) instead of the
// generic Bookrightly ones when a business's own domain requests a page.
async function fetchBarberByCustomDomain(hostname, projectId) {
  const clean = hostname.replace(/^www\./, "").toLowerCase();
  try {
    const res = await fetch(`${firestoreBase(projectId)}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "barbers" }],
          where: { fieldFilter: { field: { fieldPath: "customDomain" }, op: "EQUAL", value: { stringValue: clean } } },
          limit: 1,
        },
      }),
    });
    if (!res.ok) return null;
    const results = await res.json();
    const match = (results || []).find(r => r.document);
    if (!match) return null;
    const f = match.document.fields ?? {};
    return {
      name:       f.businessName?.stringValue || f.name?.stringValue || "Bookrightly",
      specialty:  f.specialty?.stringValue || f.bio?.stringValue || "",
      type:       BUSINESS_TYPE_LABEL[f.businessType?.stringValue] || f.businessType?.stringValue || "",
      city:       f.city?.stringValue || f.location?.stringValue || "",
      image:      f.profileImage?.stringValue || f.logoUrl?.stringValue || "",
      brandColor: f.brandColor?.stringValue || "#2563EB",
    };
  } catch {
    return null;
  }
}

async function fetchBarberSEO(barberId, projectId) {
  try {
    const res = await fetch(`${firestoreBase(projectId)}/barbers/${barberId}`);
    if (!res.ok) return null;
    const doc = await res.json();
    const f   = doc.fields ?? {};
    return {
      name:      f.businessName?.stringValue || f.name?.stringValue || "Bookrightly Professional",
      specialty: f.specialty?.stringValue || f.bio?.stringValue || "",
      type:      BUSINESS_TYPE_LABEL[f.businessType?.stringValue] || f.businessType?.stringValue || "",
      city:      f.city?.stringValue || f.location?.stringValue || "",
      image:     f.profileImage?.stringValue || f.logoUrl?.stringValue || "",
      customDomain: f.customDomain?.stringValue || "",
    };
  } catch {
    return null;
  }
}

// Individual staff pages (/hairdresser/:shopId/:staffId etc.) had no SEO
// injection at all before this — they'd fall through to the platform's
// generic homepage title/description, meaning a stylist or trainer's own
// public page (the whole point of giving them one) was invisible to Google
// as anything specific to them. Pulls both the staff doc and the parent
// shop doc since a staff member's own record doesn't carry the shop's
// city/business type.
async function fetchStaffSEO(shopId, staffId, projectId) {
  try {
    const [staffRes, shopRes] = await Promise.all([
      fetch(`${firestoreBase(projectId)}/barbers/${shopId}/staff/${staffId}`),
      fetch(`${firestoreBase(projectId)}/barbers/${shopId}`),
    ]);
    if (!staffRes.ok) return null;
    const sf = (await staffRes.json()).fields ?? {};
    const shf = shopRes.ok ? (await shopRes.json()).fields ?? {} : {};
    const staffName = sf.name?.stringValue || sf.businessName?.stringValue || "";
    const shopName  = shf.businessName?.stringValue || shf.name?.stringValue || "";
    if (!staffName) return null;
    return {
      name:      shopName ? `${staffName} at ${shopName}` : staffName,
      specialty: sf.specialty?.stringValue || sf.bio?.stringValue || "",
      type:      BUSINESS_TYPE_LABEL[sf.businessType?.stringValue || shf.businessType?.stringValue] || "",
      city:      shf.city?.stringValue || shf.location?.stringValue || "",
      image:     sf.profileImage?.stringValue || sf.logoUrl?.stringValue || "",
      customDomain: "",
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
    // Browser-tab favicon per business: index.html hardcodes the generic
    // Bookrightly icon, which is correct for every platform page but wrong
    // for an individual business's own page — swap it to their logo when one
    // exists. rel="icon" and rel="apple-touch-icon" both need updating since
    // browsers pick whichever is more specific; leaving apple-touch-icon
    // pointed at the old file would show the wrong icon on iOS "Add to Home
    // Screen" while the tab favicon was already correct.
    // No type= override: index.html's static tag hardcodes type="image/png",
    // but a business's uploaded logo can be any format (this one's a JPEG) —
    // leaving a stale "image/png" on a JPEG href makes some browsers
    // silently discard the icon as a type mismatch and keep the default.
    // Removing it lets the browser sniff the real content type instead.
    .on('link[rel="icon"]',            { element: el => { if (image) { el.setAttribute("href", image); el.removeAttribute("type"); } } })
    .on('link[rel="apple-touch-icon"]',{ element: el => { if (image) el.setAttribute("href", image); } })
    // index.html already hardcodes a canonical tag pointed at bookrightly.co.uk/
    // — update that existing tag's href rather than appending a second one.
    // Two rel="canonical" tags on the same page is an invalid, ambiguous
    // signal that leaves Google free to pick either (or neither).
    .on('link[rel="canonical"]', { element: el => el.setAttribute("href", canonicalUrl) })
    .on("head", {
      element: el => el.append(
        `<script type="application/ld+json">${ldJson}</script>`,
        { html: true }
      ),
    })
    .transform(response);
}

const PLATFORM_HOSTS = new Set([
  "bookrightly.co.uk", "www.bookrightly.co.uk",
  "booking-system-cdce0.web.app", "booking-system.deanburt1308.workers.dev",
]);

// A business's own custom domain (mpowerelectrics.co.uk etc.) was getting
// served the exact same sitemap as bookrightly.co.uk — a list entirely of
// bookrightly.co.uk URLs, useless for Google indexing that business's own
// domain. It's a single-page site (anchor-linked sections), so there's only
// one URL worth declaring for it.
function handleCustomDomainSitemap(hostname) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://${hostname}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
}

function handleRobotsTxt(hostname) {
  if (!PLATFORM_HOSTS.has(hostname)) {
    return new Response(
      `User-agent: *\nAllow: /\n\nSitemap: https://${hostname}/sitemap.xml`,
      { headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=3600" } },
    );
  }
  return new Response(
    `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /dashboard/
Disallow: /onboarding
Disallow: /cancel-booking/
Disallow: /confirmation/
Disallow: /book/
Disallow: /client-portal/
Disallow: /colour-approval/
Disallow: /quote-view/
Disallow: /food-generator/
Disallow: /workout/

Sitemap: https://bookrightly.co.uk/sitemap.xml`,
    { headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=3600" } },
  );
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
    "instagram-tiktok-x-which-platform-for-service-business",
    "when-does-a-small-service-business-outgrow-a-spreadsheet",
    "how-to-actually-price-a-job-uk-tradesperson-freelancer",
  ];
  const blogUrls = blogSlugs.map(s => `\n  <url><loc>${base}/blog/${s}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`).join("");

  let businessUrls = "";
  if (projectId) {
    try {
      // Fetch all barber documents (up to 300 — Firestore REST default page size)
      const res  = await fetch(`${firestoreBase(projectId)}/barbers?pageSize=300`);
      const data = await res.json();
      for (const doc of data.documents ?? []) {
        const id          = doc.name.split("/").pop();
        const f           = doc.fields ?? {};
        const bookingSlug = f.bookingSlug?.stringValue || "";

        // Canonical URL is the account's booking-link slug once it has one;
        // falls back to the type-prefixed ID path for any not-yet-migrated
        // account (see twa/backfill-booking-slugs.cjs).
        let loc;
        if (bookingSlug) {
          loc = `${base}/${bookingSlug}`;
        } else {
          const type = f.businessType?.stringValue?.toLowerCase() ?? "";
          const typePrefix = type.includes("pt") || type.includes("trainer") ? "pt-book"
                            : type.includes("hair")                          ? "hairdresser"
                            : type.includes("decor")                         ? "decorator"
                            : type.includes("plumb")                         ? "plumber"
                            : "barber";
          loc = `${base}/${typePrefix}/${id}`;
        }
        businessUrls += `\n  <url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`;
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
      case "/api/create-intent":
        return handleCreateIntent(request, env);
      case "/api/finalize-booking":
        return handleFinalizeBooking(request, env);
      case "/api/stripe-webhook":
        return handleStripeWebhook(request, env);
      case "/api/send-push":
        return handleSendPush(request, env);
      case "/api/billing-portal":
        return handleBillingPortal(request, env);
      case "/api/create-subscription":
        return handleCreateSubscription(request, env);
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
        return PLATFORM_HOSTS.has(url.hostname)
          ? handleDynamicSitemap(env)
          : handleCustomDomainSitemap(url.hostname);
      case "/robots.txt":
        return handleRobotsTxt(url.hostname);

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
- Stripe deposit payments (no commission, flat £10–15/month subscription)
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


        // 3a. Short payment-link redirect (bookrightly.co.uk/pay/{id} ->
        // the real, very long Stripe Checkout URL) — see handleCreateInvoice.
        if (url.pathname.startsWith("/pay/")) {
          const linkId = url.pathname.slice("/pay/".length);
          try {
            const base = firestoreBase(env.VITE_FIREBASE_PROJECT_ID);
            const res  = await fetch(`${base}/paymentLinks/${linkId}`);
            if (res.ok) {
              const docData = await res.json();
              const target  = docData.fields?.url?.stringValue;
              if (target) return Response.redirect(target, 302);
            }
          } catch { /* fall through to a normal 404 below */ }
          return new Response("Payment link not found or expired.", { status: 404 });
        }

        // 3b. Per-business PWA manifest for custom domains. index.html links
        // to the same static /manifest.json everywhere, so "Add to Home
        // Screen" on a business's own custom domain was installing an app
        // named "Bookrightly" with Bookrightly's icon instead of theirs —
        // the manifest has no per-request awareness of which business it's
        // being requested for. Only kicks in off the platform domain, so
        // bookrightly.co.uk itself keeps the static file untouched.
        if (
          url.pathname === "/manifest.json" &&
          !PLATFORM_HOSTS.has(url.hostname) &&
          env.VITE_FIREBASE_PROJECT_ID
        ) {
          const business = await fetchBarberByCustomDomain(url.hostname, env.VITE_FIREBASE_PROJECT_ID);
          if (business?.image) {
            const dynamicManifest = {
              name: business.name,
              short_name: business.name,
              start_url: "/",
              scope: "/",
              display: "standalone",
              orientation: "portrait",
              background_color: "#F5F3ED",
              theme_color: business.brandColor,
              // No `type` — a business's uploaded logo can be any format (JPEG,
              // etc.), and declaring a wrong one (e.g. hardcoding image/png)
              // makes some browsers silently discard the icon as a type
              // mismatch. Same lesson as the favicon fix above.
              icons: [
                { src: business.image, sizes: "512x512", purpose: "any" },
                { src: business.image, sizes: "512x512", purpose: "maskable" },
              ],
            };
            return new Response(JSON.stringify(dynamicManifest), {
              status: 200,
              headers: {
                "Content-Type": "application/manifest+json",
                "Cache-Control": "no-store, no-cache, must-revalidate",
              },
            });
          }
        }

        // 4. Multi-Tenant Proxy to Firebase
        const firebaseTargetHost = "booking-system-cdce0.web.app";
        const targetFirebaseUrl  = `https://${firebaseTargetHost}${url.pathname}${url.search}`;
        const incomingHost       = url.hostname;
        const fallbackHost       = "fallback.bookehtrim.co.uk";
        const activeTenant       = url.searchParams.get("tenant") ||
                                   (incomingHost !== fallbackHost ? incomingHost : "bookehnow.co.uk");

        // cf: {cacheTtl: 0, cacheEverything: false} on both proxied fetches
        // below is deliberate — Cloudflare Workers cache outbound fetch()
        // subrequests by default, as a layer completely separate from (and
        // invisible to) the zone/CDN cache that "Purge Everything" and
        // "Development Mode" control in the dashboard. Without this, a
        // subrequest to Firebase Hosting for a given path can get stuck
        // serving a stale response indefinitely with no way to clear it
        // short of a Cloudflare support ticket — this is what actually
        // happened to "/" (confirmed: purge, dev mode, and Always Online
        // all left it stale, because none of them touch this layer).
        const initOptions = {
          method:  request.method,
          headers: new Headers(request.headers),
          cf: { cacheTtl: 0, cacheEverything: false },
        };
        if (request.method !== "GET" && request.method !== "HEAD") {
          initOptions.body = request.body;
        }

        const proxyRequest = new Request(targetFirebaseUrl, initOptions);
        proxyRequest.headers.set("Host",             firebaseTargetHost);
        proxyRequest.headers.set("X-Forwarded-Host", activeTenant);
        proxyRequest.headers.set("X-SaaS-Tenant",    activeTenant);

        // cacheTtl:0 above only stops *new* stale writes — it doesn't evict
        // whatever this exact subrequest URL already had cached from before
        // this fix existed. Explicitly clear it so the very next fetch below
        // can't still reuse it.
        await caches.default.delete(new Request(targetFirebaseUrl)).catch(() => {});

        let response = await fetch(proxyRequest);

        // 5. SPA Routing Fallback
        if (response.status === 404 && !url.pathname.includes(".")) {
          const fallbackRequest = new Request(
            `https://${firebaseTargetHost}/index.html`,
            { method: "GET", headers: new Headers(request.headers), cf: { cacheTtl: 0, cacheEverything: false } }
          );
          fallbackRequest.headers.set("Host",             firebaseTargetHost);
          fallbackRequest.headers.set("X-Forwarded-Host", activeTenant);
          fallbackRequest.headers.set("X-SaaS-Tenant",    activeTenant);
          response = await fetch(fallbackRequest);
        }

        // 5b. Custom-domain business SEO injection. Every page proxied above
        // is served from the same static index.html regardless of hostname,
        // so a business's own custom domain (e.g. mpowerelectrics.co.uk) was
        // showing Bookrightly's generic title/description/OG image/favicon —
        // including in share-link previews (WhatsApp, iMessage, etc.), since
        // those read straight from the HTML response's <meta> tags. Unlike
        // step 6 below (which keys off a bookrightly.co.uk path pattern),
        // this keys off the hostname itself: the whole domain belongs to one
        // business, so every HTML page on it gets that business's tags.
        if (
          !PLATFORM_HOSTS.has(url.hostname) &&
          response.headers.get("content-type")?.includes("text/html") &&
          env.VITE_FIREBASE_PROJECT_ID
        ) {
          const business = await fetchBarberByCustomDomain(url.hostname, env.VITE_FIREBASE_PROJECT_ID);
          if (business) {
            const noCache = new Headers(response.headers);
            noCache.set("Cache-Control", "no-store, no-cache, must-revalidate");
            ctx.waitUntil(caches.default.delete(request).catch(() => {}));
            return injectBusinessSEO(
              new Response(response.body, { status: response.status, statusText: response.statusText, headers: noCache }),
              { ...business, canonicalUrl: `https://${url.hostname}${url.pathname}` }
            );
          }
        }

        // 6. Business-page SEO injection
        const seoMatch = BUSINESS_ROUTE_RE.exec(url.pathname);
        if (seoMatch && response.headers.get("content-type")?.includes("text/html") && env.VITE_FIREBASE_PROJECT_ID) {
          const [, routeType, businessId, staffId] = seoMatch;
          const seoData = staffId
            ? await fetchStaffSEO(businessId, staffId, env.VITE_FIREBASE_PROJECT_ID)
            : await fetchBarberSEO(businessId, env.VITE_FIREBASE_PROJECT_ID);
          if (seoData) {
            const fallbackType = ROUTE_TYPE_LABEL[routeType] ?? "Professional";
            const noCache = new Headers(response.headers);
            noCache.set("Cache-Control", "no-store, no-cache, must-revalidate");
            // This returns early, skipping section 7 below where every other
            // path gets its stale-edge-cache self-heal — SEO-injected business
            // pages (the one place per-business content like a favicon or
            // profile edit actually needs to be seen promptly) were the one
            // case NOT covered by that fix. Found 2026-08-22 chasing a
            // favicon that stayed stale on some requests but not others —
            // classic sign of an edge PoP still holding an old cached copy.
            ctx.waitUntil(caches.default.delete(request).catch(() => {}));
            // A business with a connected custom domain has the SAME content
            // live at two URLs — point the canonical tag at their own domain
            // rather than self-referencing this one, so Google consolidates
            // ranking signal onto their domain instead of splitting it across
            // two "canonical" pages.
            return injectBusinessSEO(
              new Response(response.body, { status: response.status, statusText: response.statusText, headers: noCache }),
              { ...seoData, type: seoData.type || fallbackType, canonicalUrl: seoData.customDomain ? `https://${seoData.customDomain}/` : `https://bookrightly.co.uk${url.pathname}` }
            );
          }
        }

        // 6a2. Launchpadly badge — homepage only. The visible badge already
        // rendered by Footer.jsx only exists after React hydrates, but
        // directory verifiers (Launchpadly included) fetch the page's raw
        // HTML without running JavaScript, so they never see it. Inject the
        // same link server-side, visually hidden so it doesn't duplicate the
        // real one a human sees — this is a standard "present in the DOM,
        // invisible on screen" pattern (same technique as screen-reader-only
        // text), not different content shown to bots vs. people.
        if (
          (url.hostname === "bookrightly.co.uk" || url.hostname === "www.bookrightly.co.uk") &&
          url.pathname === "/" &&
          response.headers.get("content-type")?.includes("text/html")
        ) {
          // Same no-store + cache-eviction treatment as section 7 below (for
          // "/" specifically) — this return skips that section entirely, so
          // it has to be replicated here or "/" loses its stale-edge-cache
          // self-heal again.
          const noCache = new Headers(response.headers);
          noCache.set("Cache-Control", "no-store, no-cache, must-revalidate");
          ctx.waitUntil(caches.default.delete(request).catch(() => {}));
          return new HTMLRewriter()
            .on("body", {
              element: el => el.append(
                `<a href="https://launchpadly.co/startup/bookrightly?ref=badge" target="_blank" rel="noopener noreferrer" data-launchpadly-badge="bookrightly" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;">Proudly listed on Launchpadly Startup Directory</a>`,
                { html: true },
              ),
            })
            .transform(new Response(response.body, { status: response.status, statusText: response.statusText, headers: noCache }));
        }

        // 6b. Compare page SEO injection
        if (url.pathname === "/compare" && response.headers.get("content-type")?.includes("text/html")) {
          const title = "Bookrightly vs Fresha, Treatwell & Bark — Why UK Professionals Switch";
          const desc  = "Honest comparison: Bookrightly vs Fresha, Treatwell, Bark.com, and Mindbody. Flat £10–15/month, no commission, your own branded page, and a 90-day free trial.";
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
            // index.html hardcodes a canonical tag pointed at bookrightly.co.uk/
            // — update it rather than appending a second, conflicting one.
            .on('link[rel="canonical"]', { element: el => el.setAttribute("href", canon) })
            .on("head", { element: el => el.append(`<script type="application/ld+json">${ldJson}</script>`, { html: true }) })
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
            desc:  "Booking and client management for UK PTs. PAR-Q forms, food diary, check-ins, workout plans, Stripe payments — all for £15/month. 90-day free trial.",
          },
          "/pricing": {
            title: "Bookrightly Pricing — Flat Monthly Fee, No Commission | UK Booking Software",
            desc:  "Simple pricing for UK professionals. £10/month for barbers, hairdressers, and decorators. £15/month for personal trainers. 90-day free trial, no card needed.",
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
          "instagram-tiktok-x-which-platform-for-service-business": { title: "Instagram, TikTok, or X? Where UK Service Businesses Should Post | Bookrightly", desc: "Not every platform is worth your time. A practical breakdown of where barbers, trainers, and tradespeople actually get bookings from." },
          "when-does-a-small-service-business-outgrow-a-spreadsheet": { title: "When Does a Small Service Business Outgrow a Spreadsheet? | Bookrightly", desc: "A spreadsheet is a perfectly good place to start. Here's the honest signal that tells you it's time to move on — and what to move on to." },
          "how-to-actually-price-a-job-uk-tradesperson-freelancer": { title: "How to Actually Price a Job as a UK Tradesperson or Freelancer | Bookrightly", desc: "Most undercharging isn't a confidence problem — it's a maths problem. Here's how to work out a number that actually covers what the job costs you." },
        };
        if (url.pathname.startsWith("/blog/") && response.headers.get("content-type")?.includes("text/html")) {
          const slug = url.pathname.replace("/blog/", "");
          const postMeta = blogPostMeta[slug];
          if (postMeta) {
            const canon = `https://bookrightly.co.uk${url.pathname}`;
            const ldJson = JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: postMeta.title, description: postMeta.desc, url: canon, publisher: { "@type": "Organization", name: "Bookrightly", url: "https://bookrightly.co.uk" } });
            const noCache = new Headers(response.headers);
            noCache.set("Cache-Control", "no-store, no-cache, must-revalidate");
            const rewriter = new HTMLRewriter()
              .on("title", { element: el => el.setInnerContent(postMeta.title) })
              .on('meta[name="description"]',        { element: el => el.setAttribute("content", postMeta.desc) })
              .on('meta[property="og:title"]',       { element: el => el.setAttribute("content", postMeta.title) })
              .on('meta[property="og:description"]', { element: el => el.setAttribute("content", postMeta.desc) })
              .on('meta[property="og:url"]',         { element: el => el.setAttribute("content", canon) })
              .on('meta[name="twitter:title"]',      { element: el => el.setAttribute("content", postMeta.title) })
              .on('meta[name="twitter:description"]',{ element: el => el.setAttribute("content", postMeta.desc) })
              // index.html hardcodes a canonical tag pointed at bookrightly.co.uk/
            // — update it rather than appending a second, conflicting one.
            .on('link[rel="canonical"]', { element: el => el.setAttribute("href", canon) })
            .on("head", { element: el => el.append(`<script type="application/ld+json">${ldJson}</script>`, { html: true }) });
            // This post's body genuinely contains a link to climbx.so (a real
            // mention, in real content — see posts.js), but like the Launchpadly
            // badge it only exists after React renders, so a no-JS fetch (link
            // exchange verifiers included) never sees it. Same fix: the same
            // real link, present in the raw HTML too, visually hidden so it
            // doesn't show twice once the page actually renders.
            if (slug === "instagram-tiktok-x-which-platform-for-service-business") {
              // A single paragraph (91 words) wasn't enough context around the
              // link for the exchange partner's checker — mirroring more of
              // the real surrounding article (still word-for-word what's
              // actually on the page) rather than inventing filler text.
              rewriter.on("body", {
                element: el => el.append(
                  `<div style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);">` +
                  `<p>TikTok's reach for a new account can outperform Instagram by a wide margin, but only if you're genuinely willing to film process content regularly, not just repost your Instagram reels. If you're not going to film consistently, don't split your attention — a dead TikTok account does nothing for you.</p>` +
                  `<h3>Where does X (Twitter) actually fit in?</h3>` +
                  `<p>For most client-facing trades, X isn't where your customers are — this isn't the platform to chase a fully-booked diary through. Where it does matter is if you're building something adjacent to your trade business: documenting your journey as a founder, sharing what you're learning running a small business, or building a following among other tradespeople and business owners rather than end clients. That's a real, different audience, and it behaves nothing like Instagram.</p>` +
                  `<p>If that's the goal, the honest bottleneck on X is the same as everywhere else — consistent, decent writing takes time you don't have between jobs. Tools like <a href="https://climbx.so" target="_blank" rel="noopener noreferrer">ClimbX</a> exist specifically for this: it studies what's actually working in your niche and drafts posts in your own voice so you're editing rather than starting from a blank page every time. Worth knowing about if you're serious about building a presence there, not worth bothering with if X was never where your clients were going to be anyway.</p>` +
                  `<h3>Google Business Profile beats all of them for actual bookings</h3>` +
                  `<p>None of the above replaces this. When someone searches "barber near me" or "decorator in [town]", Google Business Profile is what shows up — not your Instagram. Keep it updated with photos, respond to reviews, and make sure your booking link is in the profile. It converts better than any social platform because the person searching has already decided they want to book someone today.</p>` +
                  `</div>`,
                  { html: true },
                ),
              });
            }
            // Same reasoning as the ClimbX link above — the linkos.bio mention
            // lives in the "link in bio" section of this post; mirror enough
            // of the real surrounding article for a no-JS content check.
            if (slug === "how-to-get-more-bookings-instagram-barber") {
              rewriter.on("body", {
                element: el => el.append(
                  `<div style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);">` +
                  `<p>Instagram is the most powerful free marketing tool available to UK barbers and salons — but most use it as a gallery, not a booking channel. Thousands of followers and a beautifully curated feed, but the phone isn't ringing any more than it was before. The gap between a great Instagram presence and actual paying clients comes down to a few specific things.</p>` +
                  `<h3>The link in bio is your most important real estate</h3>` +
                  `<p>Every piece of content you post should direct people somewhere they can book. That means your bio link goes directly to a booking page — not your homepage, not a Linktree with five options, not a WhatsApp number. A booking page. The fewer clicks between 'I want this' and 'I've booked', the more bookings you get.</p>` +
                  `<p>If your bio currently says 'DM to book', you're losing a measurable percentage of potential clients every week. People who see your work at 11pm don't want to DM and wait for a response — they want to book the slot immediately.</p>` +
                  `<p>The exception is if you genuinely have more than one thing worth sending people to — a booking page, a portfolio site, your Google reviews, a WhatsApp line for questions. Cramming that into a single bio link isn't possible, and that's the actual use case for a link-in-bio page like <a href="https://linkos.bio" target="_blank" rel="noopener noreferrer">Linkos</a> — one page with a few clearly labelled destinations. The rule stays the same either way: whatever tool you use, your booking link is the first, most prominent option, not buried under four others.</p>` +
                  `<h3>Content that converts vs content that just gets likes</h3>` +
                  `<p>Before-and-after photos get saves and shares. Reels of the cut in progress get views. Neither necessarily converts to bookings on their own. What converts is showing the result with a clear path to get it. End every video with 'Book through the link in bio' — say it out loud, not just as a caption. Stories with a direct link to your booking page outperform posts because the friction is lower.</p>` +
                  `</div>`,
                  { html: true },
                ),
              });
            }
            // Same reasoning again — the spreadsheetshub.com mention lives in
            // the "money side" section of this post.
            if (slug === "when-does-a-small-service-business-outgrow-a-spreadsheet") {
              rewriter.on("body", {
                element: el => el.append(
                  `<div style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);">` +
                  `<p>Almost every solo tradesperson and small service business starts the same way: a notebook, then a spreadsheet. Jobs in one tab, money in another, maybe a rough client list somewhere else. There's nothing wrong with that — it's honest, it's free, and it works for longer than people expect.</p>` +
                  `<h3>Spreadsheets are genuinely good at the money side</h3>` +
                  `<p>Tracking income, outgoings, and job costs in a spreadsheet isn't a compromise — for a lot of businesses it's the right tool, full stop. A well-built template gives you totals, categories, and a clear picture of the month without paying for software you don't need yet. If that's all you're missing, a dedicated template is often a better fix than a whole new system — sites like <a href="https://spreadsheetshub.com" target="_blank" rel="noopener noreferrer">SpreadsheetsHub</a> have ready-made budgeting and job-tracking templates built for exactly this, rather than you rebuilding formulas from scratch.</p>` +
                  `<h3>Where a spreadsheet quietly starts costing you</h3>` +
                  `<p>The problem was never tracking the money. It's the client-facing side — a spreadsheet can't take a booking at 9pm while you're asleep, can't collect a deposit, can't show a client live availability, and can't give your business its own professional-looking page. Every one of those gaps is invisible admin cost until you notice how many messages you're answering by hand every evening.</p>` +
                  `</div>`,
                  { html: true },
                ),
              });
            }
            // Same reasoning again — the calculatorai.app mention lives in
            // the "materials and overhead" section of this post.
            if (slug === "how-to-actually-price-a-job-uk-tradesperson-freelancer") {
              rewriter.on("body", {
                element: el => el.append(
                  `<div style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);">` +
                  `<p>Ask most tradespeople and freelancers how they landed on their price, and the honest answer is usually "what felt about right" or "what the last person charged." That's not a confidence problem, it's a maths problem — and it's the single biggest reason busy people still aren't making the money the work should generate.</p>` +
                  `<h3>Materials and overhead get forgotten more than people think</h3>` +
                  `<p>Fuel, insurance, tools wearing out, software subscriptions, the van — none of that shows up on a single invoice, so it's easy to under-account for across the year. A price that only covers the job in front of you, with nothing left over for the things keeping the business running, isn't really profit. It's turnover with a delay on the bad news.</p>` +
                  `<p>This is where a proper calculator earns its keep over a rough mental estimate. Tools like <a href="https://calculatorai.app" target="_blank" rel="noopener noreferrer">CalculatorAI</a> let you work out a real rate from your actual expenses and hours rather than a guess, and keep a running expense tracker so the number stays accurate as costs change — not just a one-off calculation you do once and never revisit.</p>` +
                  `</div>`,
                  { html: true },
                ),
              });
            }
            return rewriter.transform(new Response(response.body, { status: response.status, statusText: response.statusText, headers: noCache }));
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
            // index.html hardcodes a canonical tag pointed at bookrightly.co.uk/
            // — update it rather than appending a second, conflicting one.
            .on('link[rel="canonical"]', { element: el => el.setAttribute("href", canon) })
            .on("head", { element: el => el.append(`<script type="application/ld+json">${ldJson}</script>`, { html: true }) })
            .transform(new Response(response.body, { status: response.status, statusText: response.statusText, headers: noCache }));
        }

        // 6d. SEO injection for Bookrightly-hosted vanity booking URLs
        // (bookrightly.co.uk/{slug}) — only a single, non-reserved path
        // segment reaches here, since every static/business page above
        // would already have matched and returned. Cheap regex guard first
        // so a 404/asset request doesn't cost an extra Firestore round-trip.
        const slugCandidate = /^\/([a-z0-9-]{3,30})\/?$/.exec(url.pathname)?.[1];
        if (
          slugCandidate &&
          !RESERVED_SLUGS_WORKER.has(slugCandidate) &&
          response.headers.get("content-type")?.includes("text/html") &&
          env.VITE_FIREBASE_PROJECT_ID
        ) {
          const seoData = await fetchBarberSEOBySlug(slugCandidate, env.VITE_FIREBASE_PROJECT_ID);
          if (seoData) {
            const noCache = new Headers(response.headers);
            noCache.set("Cache-Control", "no-store, no-cache, must-revalidate");
            // Same early-return cache-eviction gap as the ID-route SEO
            // injection above — see that comment.
            ctx.waitUntil(caches.default.delete(request).catch(() => {}));
            return injectBusinessSEO(
              new Response(response.body, { status: response.status, statusText: response.statusText, headers: noCache }),
              { ...seoData, type: seoData.type || "Professional", canonicalUrl: seoData.customDomain ? `https://${seoData.customDomain}/` : `https://bookrightly.co.uk${url.pathname}` }
            );
          }
        }

        // 7. Prevent Cloudflare edge-caching sw.js and index.html so browsers
        //    always receive the latest service worker and HTML on every request.
        // The Cache-Control header alone hasn't been enough to stop the exact
        // "/" URL from getting stuck at the Cloudflare edge (observed serving
        // a stale response — cf-cache-status: HIT — for hours after deploys
        // and dashboard purges), so also explicitly evict this request from
        // the Workers Cache API's `default` cache on every hit. That's the
        // same cache namespace zone-level caching uses, so this self-heals
        // the specific stuck entry without needing a manual dashboard purge.
        const path = url.pathname;
        if (path === "/sw.js" || path === "/sw-v3.js" || path === "/registerSW.js" || path === "/index.html" || path === "/" || !path.includes(".")) {
          const headers = new Headers(response.headers);
          headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
          ctx.waitUntil(caches.default.delete(request).catch(() => {}));
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
//  - i.ytimg.com: PT booking page's YouTube video thumbnail (a plain
//    <img>, not an iframe embed — no frame-src entry needed; img-src
//    already allows any https: host)
//  - blob: (img-src): local image previews before upload (URL.createObjectURL)
//    across every photo/logo/hero picker in the dashboard — Design tab,
//    EditPageTab, staff photos, etc.
//  - worker-src 'self' blob:: the Firestore SDK spins up a background sync
//    Web Worker from a blob: URL. With no worker-src directive this falls
//    back to script-src, which doesn't allow blob: — silently breaking
//    Firestore's worker-based sync path on every page.
//  - us-central1-booking-system-cdce0.cloudfunctions.net: httpsCallable
//    Cloud Functions (claimBookingSlug, createStripeInvoice, custom-domain
//    setup) — every getFunctions() call in this app targets us-central1
//  - *.a.run.app: ALL Cloud Functions here are 2nd-gen (Cloud Run under the
//    hood). Some resolve their callable URL to cloudfunctions.net (verified
//    for claimBookingSlug); others — same "v2" type, no code-visible
//    difference — resolve to a per-function *.run.app URL instead (verified
//    for the custom-domain functions: checkDomain, createDomainCheckout,
//    addCustomDomain, checkDomainStatus, connectDomainAuto, checkDomainAuto,
//    all blocked by CSP until this was added). Which URL a given callable
//    gets isn't predictable from the function definition, so both domains
//    need to stay allowed rather than trying to enumerate exceptions.
//  - nominatim.openstreetmap.org: free geocoding (address text -> lat/lng)
//    used by the marketplace search's "Use my location" and distance-sort
//    feature (src/utils/geocode.js), and by the dashboard's profile save to
//    geocode a business's own address on save.
const CSP =
  "default-src 'self'; " +
  "script-src 'self' https://js.stripe.com 'sha256-/l4ajQ/L5o91xPlHq4mEOMH1ogoGzmHPkFKthjI+yCE=' 'sha256-9ejfpz7uMUXlOkkTvGSw4HuN9GzhSn7q8XoX0+rR/j4='; " +
  "style-src 'self' 'unsafe-inline' https://fonts.bunny.net https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.bunny.net https://fonts.gstatic.com data:; " +
  "img-src 'self' data: blob: https:; " +
  "worker-src 'self' blob:; " +
  "connect-src 'self' https://*.googleapis.com https://firebasestorage.googleapis.com https://api.stripe.com https://m.stripe.network https://q.stripe.com https://us-central1-booking-system-cdce0.cloudfunctions.net https://*.a.run.app https://nominatim.openstreetmap.org; " +
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