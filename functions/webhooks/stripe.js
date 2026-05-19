/**
 * Cloudflare Pages Function: Stripe Webhook Handler
 *
 * Place this file at: functions/webhooks/stripe.js
 * It will be available at: POST /webhooks/stripe
 *
 * Required environment variables:
 * STRIPE_WEBHOOK_SECRET  – whsec_… from your Stripe Dashboard webhook endpoint
 * ACCOUNT_ID             – Cloudflare Account ID
 * API_TOKEN               – Cloudflare API Token (Pages + DNS write permissions)
 * PROJECT_NAME           – Cloudflare Pages project name
 *
 * Register your webhook in Stripe Dashboard:
 * Endpoint URL  : https://<your-domain>/webhooks/stripe
 * Events to send: checkout.session.completed
 *
 * ⚠️  Stripe signature verification uses the Web Crypto API (available in
 * Cloudflare Workers / Pages Functions natively — no Node.js needed).
 */

import { addDomainToPages } from "../_lib/cloudflare-add-domain.js";

export async function onRequestPost({ request, env }) {
  /* ------------------------------------------------------------------ */
  /* 1. Validate environment variables                                     */
  /* ------------------------------------------------------------------ */
  const requiredVars = [
    "STRIPE_WEBHOOK_SECRET",
    "ACCOUNT_ID",
    "API_TOKEN",
    "PROJECT_NAME",
  ];
  const missingVars = requiredVars.filter((k) => !env[k]);
  if (missingVars.length) {
    console.error(`[stripe-webhook] Missing env vars: ${missingVars.join(", ")}`);
    return jsonResponse({ success: false, error: "Server misconfiguration." }, 500);
  }

  /* ------------------------------------------------------------------ */
  /* 2. Read the raw request body (needed for signature verification)     */
  /* ------------------------------------------------------------------ */
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return jsonResponse(
      { success: false, error: "Missing stripe-signature header." },
      400
    );
  }

  /* ------------------------------------------------------------------ */
  /* 3. Verify the Stripe webhook signature                                */
  /* Stripe uses HMAC-SHA256: signature = HMAC(secret, timestamp.payload) */
  /* ------------------------------------------------------------------ */
  let event;
  try {
    event = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`[stripe-webhook] Signature verification failed: ${err.message}`);
    return jsonResponse(
      { success: false, error: `Webhook signature verification failed: ${err.message}` },
      400
    );
  }

  /* ------------------------------------------------------------------ */
  /* 4. Route the event                                                    */
  /* ------------------------------------------------------------------ */
  console.log(`[stripe-webhook] Received event: ${event.type} (${event.id})`);

  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(event.data.object, env);

    default:
      // Return 200 for unhandled events so Stripe doesn't retry them
      console.log(`[stripe-webhook] Unhandled event type: ${event.type} — ignoring.`);
      return jsonResponse({ success: true, message: `Event type "${event.type}" not handled.` });
  }
}

/* -------------------------------------------------------------------- */
/* Event handler: checkout.session.completed                             */
/* -------------------------------------------------------------------- */
async function handleCheckoutCompleted(session, env) {
  const { id: sessionId, payment_status, metadata } = session;

  console.log(`[stripe-webhook] checkout.session.completed — session: ${sessionId}`);

  // Only act on paid sessions (subscriptions may briefly be "no_payment_required")
  if (payment_status !== "paid") {
    console.warn(
      `[stripe-webhook] Session ${sessionId} has payment_status="${payment_status}" — skipping domain provisioning.`
    );
    return jsonResponse({
      success: true,
      message: `Session ${sessionId} not yet paid (status: ${payment_status}). No action taken.`,
    });
  }

  // Guard: only process "custom_domain" upgrade sessions
  if (metadata?.upgradeType !== "custom_domain") {
    console.log(
      `[stripe-webhook] Session ${sessionId} is not a custom_domain upgrade — skipping.`
    );
    return jsonResponse({
      success: true,
      message: "Not a custom domain upgrade session. No action taken.",
    });
  }

  const domainName = metadata?.domainName;
  if (!domainName) {
    console.error(
      `[stripe-webhook] Session ${sessionId} is missing metadata.domainName.`
    );
    // Return 200 so Stripe doesn't retry; log for manual investigation
    return jsonResponse(
      {
        success: false,
        error: "Session metadata is missing `domainName`. Cannot provision domain.",
        sessionId,
      },
      200 // intentional — Stripe should not retry configuration errors
    );
  }

  /* ------------------------------------------------------------------ */
  /* Trigger the Cloudflare domain-linking logic                           */
  /* ------------------------------------------------------------------ */
  console.log(
    `[stripe-webhook] Provisioning domain "${domainName}" for session ${sessionId}…`
  );

  const cfResult = await addDomainToPages(domainName, env);

  if (!cfResult.success) {
    console.error(
      `[stripe-webhook] Cloudflare domain provisioning failed for "${domainName}":`,
      cfResult.error,
      cfResult.details ?? ""
    );
    // Return 500 so Stripe WILL retry — the payment succeeded but provisioning failed
    return jsonResponse(
      {
        success: false,
        error: "Payment received but domain provisioning failed. Will retry.",
        details: cfResult.details ?? cfResult.error,
        sessionId,
        domainName,
      },
      500
    );
  }

  console.log(
    `[stripe-webhook] Domain "${domainName}" successfully provisioned.`,
    cfResult.result
  );

  return jsonResponse({
    success: true,
    message: `Domain "${domainName}" has been linked to your Pages project.`,
    sessionId,
    domain: cfResult.result,
  });
}

/* -------------------------------------------------------------------- */
/* Stripe signature verification (Web Crypto — no external dependencies) */
/* -------------------------------------------------------------------- */

/**
 * Verifies the stripe-signature header and returns the parsed event object.
 *
 * Stripe's signature format:
 * t=<unix_timestamp>,v1=<hex_hmac>,v1=<hex_hmac>,...
 *
 * The signed payload is: `${timestamp}.${rawBody}`
 *
 * @throws {Error} if the signature is invalid, missing, or the timestamp is stale
 */
async function verifyStripeSignature(rawBody, signatureHeader, secret, toleranceSeconds = 300) {
  // Parse the header into { t: timestamp, v1: [sig, sig, ...] }
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key, rest.join("=")];
    })
  );

  // Stripe may include multiple v1 values; collect all of them
  const v1Signatures = signatureHeader
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));

  const timestamp = parts["t"];
  if (!timestamp || !v1Signatures.length) {
    throw new Error("Malformed stripe-signature header.");
  }

  // Replay-attack guard: reject webhooks older than toleranceSeconds
  const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (Math.abs(timestampAge) > toleranceSeconds) {
    throw new Error(
      `Webhook timestamp is stale (age: ${timestampAge}s, tolerance: ${toleranceSeconds}s).`
    );
  }

  // Compute expected HMAC-SHA256 signature
  const signedPayload = `${timestamp}.${rawBody}`;
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    keyMaterial,
    encoder.encode(signedPayload)
  );

  const expectedSig = bufferToHex(signatureBuffer);

  // Compare against all v1 signatures provided (Stripe can roll keys)
  const isValid = v1Signatures.some((sig) => timingSafeEqual(sig, expectedSig));
  if (!isValid) {
    throw new Error("No matching v1 signature found.");
  }

  // Parse and return the event now that we know it's authentic
  return JSON.parse(rawBody);
}

/** Convert an ArrayBuffer to a lowercase hex string */
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Timing-safe string comparison to prevent timing-oracle attacks.
 * Both strings must be the same length (HMAC-SHA256 hex = always 64 chars).
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/* -------------------------------------------------------------------- */
/* Helper: JSON response                                                 */
/* -------------------------------------------------------------------- */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}