/**
 * /api/connect-custom-domain.js
 *
 * Accepts a domain the barber already owns and links it to your Cloudflare
 * zone using the Custom Hostnames (SSL for SaaS) API.
 *
 * Flow:
 *  1. Validate the incoming domain string.
 *  2. Call Cloudflare POST /zones/{zoneId}/custom_hostnames  ← creates the hostname
 *  3. Persist { customDomain, customHostnameId, domainStatus: "provisioning" }
 *     to the barber's Firestore document.
 *  4. Return the DNS records the user must add at their registrar.
 *
 * Required environment variables:
 *   CF_ZONE_ID          — Cloudflare Zone ID for your SaaS zone
 *   CF_API_TOKEN        — Cloudflare API token (Zone:Edit permission)
 *   CF_FALLBACK_ORIGIN  — The hostname you set as the fallback origin in Cloudflare
 *                         e.g. "bookings.yoursaas.com"
 *                         Users point their CNAME here.
 *
 * Firebase Admin SDK must already be initialised elsewhere in your project
 * (e.g. in a shared firebase-admin.js / firebaseAdmin.js file).
 * Adjust the import path below to match your project layout.
 */

const { getFirestore } = require("firebase-admin/firestore");
// ↑ Adjust if you initialise admin differently, e.g.:
// const admin = require("../lib/firebaseAdmin");
// const db    = admin.firestore();

// ── Constants ─────────────────────────────────────────────────────────────────

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Strip protocol, trailing slashes, and lowercase.
 * "https://My-Shop.com/" → "my-shop.com"
 */
function cleanDomain(raw) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")   // remove any path
    .replace(/\/$/, "");
}

/**
 * Very basic domain validity check — rejects obviously malformed strings.
 */
function isValidDomain(domain) {
  // Must contain at least one dot, no spaces, and look like a real hostname
  return /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/.test(domain);
}

// ── Handler ───────────────────────────────────────────────────────────────────

module.exports = async function connectCustomDomain(req, res) {
  // ── 1. Method guard ──────────────────────────────────────────────────────
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── 2. Parse + validate body ─────────────────────────────────────────────
  const { domain: rawDomain, barberId } = req.body ?? {};

  if (!rawDomain || typeof rawDomain !== "string") {
    return res.status(400).json({ error: "Missing or invalid domain" });
  }
  if (!barberId || typeof barberId !== "string") {
    return res.status(400).json({ error: "Missing barberId" });
  }

  const domain = cleanDomain(rawDomain);

  if (!isValidDomain(domain)) {
    return res.status(400).json({ error: `"${domain}" doesn't look like a valid domain` });
  }

  // ── 3. Check env vars ────────────────────────────────────────────────────
  const {
    CF_ZONE_ID,
    CF_API_TOKEN,
    CF_FALLBACK_ORIGIN,
  } = process.env;

  if (!CF_ZONE_ID || !CF_API_TOKEN || !CF_FALLBACK_ORIGIN) {
    console.error("[connect-custom-domain] Missing Cloudflare env vars");
    return res.status(500).json({ error: "Server configuration error — please contact support" });
  }

  // ── 4. Create the Custom Hostname in Cloudflare ──────────────────────────
  let cfData;
  try {
    const cfRes = await fetch(
      `${CF_API_BASE}/zones/${CF_ZONE_ID}/custom_hostnames`,
      {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${CF_API_TOKEN}`,
        },
        body: JSON.stringify({
          hostname: domain,
          ssl: {
            method: "http",   // HTTP DCV — no TXT record needed from the user
            type:   "dv",
            settings: {
              http2:   "on",
              tls_1_3: "on",
              min_tls_version: "1.2",
            },
          },
        }),
      }
    );

    cfData = await cfRes.json();

    // Cloudflare returns success:false with errors[] on failure
    if (!cfData.success) {
      const cfError = cfData.errors?.[0];

      // Error 1406 = hostname already exists on this zone — treat as "already linked"
      if (cfError?.code === 1406) {
        return res.status(409).json({
          error: `${domain} is already connected to a booking site. If this is yours, check your dashboard.`,
        });
      }

      console.error("[connect-custom-domain] Cloudflare error:", cfData.errors);
      return res.status(502).json({
        error: cfError?.message ?? "Cloudflare rejected the domain — please try again",
      });
    }
  } catch (err) {
    console.error("[connect-custom-domain] Cloudflare fetch failed:", err);
    return res.status(502).json({ error: "Could not reach Cloudflare — please try again" });
  }

  const customHostnameId = cfData.result?.id;

  // ── 5. Persist to Firestore ──────────────────────────────────────────────
  try {
    const db = getFirestore();
    await db.collection("barbers").doc(barberId).update({
      customDomain:     domain,
      customHostnameId: customHostnameId ?? "",
      domainStatus:     "provisioning",
    });
  } catch (err) {
    console.error("[connect-custom-domain] Firestore update failed:", err);
    // Non-fatal: Cloudflare hostname was created; barber can retry or support can fix.
    // We still return success so the user gets their DNS instructions.
  }

  // ── 6. Build DNS instructions for the user ───────────────────────────────
  //
  // The user must point their domain at your CF_FALLBACK_ORIGIN via CNAME.
  // Most registrars support CNAME flattening at the apex (@), but for those
  // that don't we also provide the www variant.
  //
  const dnsRecords = [
    {
      type:  "CNAME",
      name:  "@",                   // root / apex
      value: CF_FALLBACK_ORIGIN,
    },
    {
      type:  "CNAME",
      name:  "www",
      value: CF_FALLBACK_ORIGIN,
    },
  ];

  // ── 7. Respond ───────────────────────────────────────────────────────────
  return res.status(200).json({
    success:          true,
    domain,
    customHostnameId,
    dnsRecords,
  });
};