/**
 * provision-domain.js
 *
 * Called INTERNALLY by the Stripe webhook after a confirmed domain_purchase payment.
 * Never expose this as a raw public endpoint — always gate it behind the webhook signature.
 *
 * Steps:
 *  1. Register the domain via Cloudflare Registrar
 *  2. Add it as a Custom Hostname (SSL for SaaS) on your main zone
 *  3. Update the barber's Firestore document with their new customDomain
 */

import admin from "firebase-admin";

// Lazily initialise Firebase Admin (idempotent)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
  });
}
const db = admin.firestore();

const CF_API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_ZONE_ID    = process.env.CLOUDFLARE_ZONE_ID;   // Your main SaaS zone

// ── Cloudflare helpers ────────────────────────────────────────────────────────

/**
 * Step 1 — Register the domain with Cloudflare Registrar.
 * Returns the registrar result object.
 */
async function registerDomain(domain) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/registrar/domains`,
    {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name:            domain,
        auto_renew:      true,
        years:           1,
        // Cloudflare uses WHOIS privacy by default — no extra config needed
      }),
    }
  );

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(
      `Registrar failed: ${JSON.stringify(data.errors ?? data)}`
    );
  }
  return data.result;
}

/**
 * Step 2 — Add domain as a Custom Hostname under your main zone (SSL for SaaS).
 * This creates a TLS certificate and sets the fallback origin automatically
 * (the fallback origin must already be configured in your CF dashboard).
 */
async function addCustomHostname(domain) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/custom_hostnames`,
    {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hostname: domain,
        ssl: {
          method: "http",       // HTTP-01 challenge — easiest for newly registered domains
          type:   "dv",
          settings: {
            min_tls_version: "1.2",
            http2:           "on",
          },
        },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(
      `Custom Hostname creation failed: ${JSON.stringify(data.errors ?? data)}`
    );
  }
  return data.result; // includes .id (custom hostname id) and .ssl.status
}

/**
 * Step 3 — Write the custom domain back to the barber's Firestore document.
 */
async function updateFirestore(barberId, domain, customHostnameId) {
  await db.collection("barbers").doc(barberId).update({
    customDomain:      domain,
    customHostnameId,              // Useful if you ever need to delete/renew it
    domainStatus:      "pending",  // "pending" → "active" once CF finishes cert issuance
    domainConnectedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Orchestrates all three provisioning steps.
 * Call this from your Stripe webhook, not directly from a public API route.
 *
 * @param {string} domain   - e.g. "deansbarbershop.com"
 * @param {string} barberId - Firestore document ID
 */
export async function provisionDomain(domain, barberId) {
  console.log(`[provision-domain] Starting for ${domain} / barber ${barberId}`);

  // 1. Register
  let registrarResult;
  try {
    registrarResult = await registerDomain(domain);
    console.log(`[provision-domain] Registered:`, registrarResult?.name);
  } catch (err) {
    // If the domain was already registered (e.g. retry), log but don't throw
    if (err.message.includes("already")) {
      console.warn("[provision-domain] Domain already registered, continuing.");
    } else {
      throw err;
    }
  }

  // 2. SSL for SaaS custom hostname
  const hostnameResult = await addCustomHostname(domain);
  console.log(`[provision-domain] Custom hostname created:`, hostnameResult?.id);

  // 3. Firestore
  await updateFirestore(barberId, domain, hostnameResult.id);
  console.log(`[provision-domain] Firestore updated for barber ${barberId}`);

  return {
    domain,
    customHostnameId: hostnameResult.id,
    sslStatus:        hostnameResult.ssl?.status ?? "initializing",
  };
}