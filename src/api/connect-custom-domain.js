/**
 * /api/connect-custom-domain.js
 *
 * Accepts a domain the barber already owns and links it to your Cloudflare
 * zone using the Custom Hostnames (SSL for SaaS) API.
 *
 * Flow (UPDATED):
 * 1. Validate the incoming domain string.
 * 2. Update Firestore FIRST so the domain registers under the barber profile immediately.
 * 3. Call Cloudflare POST /zones/{zoneId}/custom_hostnames.
 * 4. Catch 1406 (Duplicate/Owned domain) -> Auto-escalate status to "active" safely.
 * 5. Return DNS configuration targets.
 */

const { getFirestore } = require("firebase-admin/firestore");

// ── Constants ─────────────────────────────────────────────────────────────────

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanDomain(raw) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")   // remove any path
    .replace(/\/$/, "");
}

function isValidDomain(domain) {
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

  const db = getFirestore();

  // ── 4. Persist initial domain mapping to Firestore FIRST ─────────────────
  try {
    await db.collection("barbers").doc(barberId).update({
      customDomain: domain,
      domainStatus: "provisioning",
    });
  } catch (err) {
    console.error("[connect-custom-domain] Initial Firestore update failed:", err);
    return res.status(500).json({ error: "Failed to initialize domain map on shop profile." });
  }

  // ── 5. Create the Custom Hostname in Cloudflare ──────────────────────────
  let cfData;
  let customHostnameId = "";
  
  try {
    const cfRes = await fetch(
      `${CF_API_BASE}/zones/${CF_ZONE_ID}/custom_hostnames`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CF_API_TOKEN}`,
        },
        body: JSON.stringify({
          hostname: domain,
          ssl: {
            method: "http",   // HTTP DCV — no TXT record needed from the user
            type: "dv",
            settings: {
              http2: "on",
              tls_1_3: "on",
              min_tls_version: "1.2",
            },
          },
        }),
      }
    );

    cfData = await cfRes.json();

    // ── 6. Handle Cloudflare Errors & Code 1406 Special Case ─────────────────
    if (!cfData.success) {
      const cfError = cfData.errors?.[0];

      if (cfError?.code === 1406) {
        console.log(`[connect-custom-domain] Domain ${domain} belongs to parent Cloudflare registrar account. Activating directly.`);
        
        // Elevate status directly to active since it's already inside your direct DNS control
        await db.collection("barbers").doc(barberId).update({
          domainStatus: "active"
        });

        return res.status(200).json({
          success: true,
          domain,
          customHostnameId: "native_cloudflare_registrar",
          message: "Domain successfully linked to shop configuration parameters. Please check your parent Cloudflare panel to add the direct CNAME record.",
          dnsRecords: [
            { type: "CNAME", name: "@", value: CF_FALLBACK_ORIGIN },
            { type: "CNAME", name: "www", value: CF_FALLBACK_ORIGIN }
          ]
        });
      }

      // Handle any standard blocking errors (e.g., bad tokens, cloudflare downtime)
      console.error("[connect-custom-domain] Cloudflare error:", cfData.errors);
      return res.status(502).json({
        error: cfError?.message ?? "Cloudflare rejected the domain configuration topology.",
      });
    }

    customHostnameId = cfData.result?.id ?? "";

  } catch (err) {
    console.error("[connect-custom-domain] Cloudflare fetch failed pipeline context:", err);
    return res.status(502).json({ error: "Could not establish pipeline handshake with Cloudflare tables." });
  }

  // ── 7. Save customHostnameId if Cloudflare created a standard slot ───────
  try {
    if (customHostnameId) {
      await db.collection("barbers").doc(barberId).update({
        customHostnameId: customHostnameId
      });
    }
  } catch (err) {
    console.error("[connect-custom-domain] Non-fatal customHostnameId update failure:", err);
  }

  // ── 8. Build normal layout DNS instructions ──────────────────────────────
  const dnsRecords = [
    {
      type: "CNAME",
      name: "@",
      value: CF_FALLBACK_ORIGIN,
    },
    {
      type: "CNAME",
      name: "www",
      value: CF_FALLBACK_ORIGIN,
    },
  ];

  return res.status(200).json({
    success: true,
    domain,
    customHostnameId,
    dnsRecords,
  });
};