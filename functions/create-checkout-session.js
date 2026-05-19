/**
 * Cloudflare Pages Function: Create a Stripe Checkout Session
 *
 * Place this file at: functions/create-checkout-session.js
 * It will be available at: POST /create-checkout-session
 *
 * Required environment variables:
 *   STRIPE_SECRET_KEY          – sk_live_… or sk_test_…
 *   STRIPE_ONE_TIME_PRICE_ID   – price_… for the one-time payment product
 *   STRIPE_YEARLY_PRICE_ID     – price_… for the yearly subscription product
 *   DASHBOARD_URL              – Base URL of your dashboard (e.g. https://app.example.com)
 *
 * Expected request body (JSON):
 *   {
 *     "domainName":  "www.example.com",   // required — stored in metadata
 *     "paymentType": "one_time" | "yearly" // required
 *   }
 *
 * On success the browser is redirected to:
 *   {DASHBOARD_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}
 */

export async function onRequestPost({ request, env }) {
  /* ------------------------------------------------------------------ */
  /* 1. Validate environment variables                                    */
  /* ------------------------------------------------------------------ */
  const requiredVars = [
    "STRIPE_SECRET_KEY",
    "STRIPE_ONE_TIME_PRICE_ID",
    "STRIPE_YEARLY_PRICE_ID",
    "DASHBOARD_URL",
  ];
  const missingVars = requiredVars.filter((k) => !env[k]);
  if (missingVars.length) {
    return jsonResponse(
      { success: false, error: `Missing environment variables: ${missingVars.join(", ")}` },
      500
    );
  }

  const {
    STRIPE_SECRET_KEY,
    STRIPE_ONE_TIME_PRICE_ID,
    STRIPE_YEARLY_PRICE_ID,
    DASHBOARD_URL,
  } = env;

  /* ------------------------------------------------------------------ */
  /* 2. Parse and validate the request body                               */
  /* ------------------------------------------------------------------ */
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body." }, 400);
  }

  const { domainName, paymentType } = body;

  if (!domainName || typeof domainName !== "string" || !domainName.trim()) {
    return jsonResponse(
      { success: false, error: "`domainName` is required and must be a non-empty string." },
      400
    );
  }

  if (!["one_time", "yearly"].includes(paymentType)) {
    return jsonResponse(
      { success: false, error: '`paymentType` must be either "one_time" or "yearly".' },
      400
    );
  }

  const domain = domainName.trim().toLowerCase();

  // Basic domain format validation
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
  if (!domainRegex.test(domain)) {
    return jsonResponse(
      { success: false, error: `"${domain}" does not look like a valid domain name.` },
      400
    );
  }

  /* ------------------------------------------------------------------ */
  /* 3. Build the Stripe Checkout Session payload                         */
  /* ------------------------------------------------------------------ */
  const isSubscription = paymentType === "yearly";
  const priceId = isSubscription ? STRIPE_YEARLY_PRICE_ID : STRIPE_ONE_TIME_PRICE_ID;

  // success_url receives the Stripe session ID so your dashboard can verify the payment
  const successUrl =
    `${DASHBOARD_URL.replace(/\/$/, "")}/dashboard` +
    `?session_id={CHECKOUT_SESSION_ID}&domain=${encodeURIComponent(domain)}`;

  const cancelUrl =
    `${DASHBOARD_URL.replace(/\/$/, "")}/dashboard?checkout=cancelled`;

  const sessionPayload = {
    mode: isSubscription ? "subscription" : "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Store the domain in metadata so the webhook can act on it
    metadata: {
      domainName: domain,
      paymentType,
      upgradeType: "custom_domain",
    },
    // For subscriptions, also attach metadata to the subscription object
    ...(isSubscription && {
      subscription_data: {
        metadata: {
          domainName: domain,
          paymentType,
          upgradeType: "custom_domain",
        },
      },
    }),
  };

  /* ------------------------------------------------------------------ */
  /* 4. Call the Stripe API                                               */
  /* ------------------------------------------------------------------ */
  let stripeResponse;
  try {
    stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: toStripeFormEncoded(sessionPayload),
    });
  } catch (err) {
    return jsonResponse(
      { success: false, error: `Network error reaching Stripe API: ${err.message}` },
      502
    );
  }

  const stripeData = await stripeResponse.json();

  if (!stripeResponse.ok) {
    return jsonResponse(
      {
        success: false,
        error: "Stripe API request failed.",
        details: stripeData.error?.message ?? "Unknown Stripe error.",
      },
      stripeResponse.status >= 400 && stripeResponse.status < 500
        ? stripeResponse.status
        : 502
    );
  }

  /* ------------------------------------------------------------------ */
  /* 5. Return the Checkout URL                                           */
  /* ------------------------------------------------------------------ */
  return jsonResponse({
    success: true,
    sessionId: stripeData.id,
    checkoutUrl: stripeData.url, // redirect your client to this URL
  });
}

/* -------------------------------------------------------------------- */
/* Helpers                                                               */
/* -------------------------------------------------------------------- */

/**
 * Stripe's REST API requires application/x-www-form-urlencoded with
 * bracket notation for nested objects and arrays, e.g.:
 *   line_items[0][price]=price_xxx&line_items[0][quantity]=1
 */
function toStripeFormEncoded(obj, prefix = "") {
  const parts = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;

    if (value === null || value === undefined) continue;

    if (typeof value === "object" && !Array.isArray(value)) {
      parts.push(toStripeFormEncoded(value, fullKey));
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === "object") {
          parts.push(toStripeFormEncoded(item, `${fullKey}[${index}]`));
        } else {
          parts.push(`${encodeURIComponent(`${fullKey}[${index}]`)}=${encodeURIComponent(item)}`);
        }
      });
    } else {
      parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(value)}`);
    }
  }

  return parts.join("&");
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}