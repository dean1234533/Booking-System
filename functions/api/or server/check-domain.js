/**
 * GET /api/check-domain?domain=deansbarbershop.com
 *
 * Checks domain availability via the Cloudflare Registrar API.
 * All Cloudflare credentials stay strictly server-side.
 */

const CF_API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

// Simple allowlist of TLDs we support purchasing
const SUPPORTED_TLDS = ["com", "co.uk", "uk", "net", "org", "io", "shop", "store"];

function extractTLD(domain) {
  // Handles both "example.com" and "example.co.uk"
  const parts = domain.split(".");
  if (parts.length >= 3) return parts.slice(-2).join(".");
  return parts.slice(-1)[0];
}

function isValidDomain(domain) {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/i.test(domain);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { domain } = req.query;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!domain) {
    return res.status(400).json({ error: "domain query parameter is required" });
  }

  const clean = domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (!isValidDomain(clean)) {
    return res.status(400).json({ error: "Invalid domain format" });
  }

  const tld = extractTLD(clean);
  if (!SUPPORTED_TLDS.includes(tld)) {
    return res.status(400).json({
      error: `Unsupported TLD: .${tld}`,
      supported: SUPPORTED_TLDS,
    });
  }

  // ── Cloudflare Registrar availability check ───────────────────────────────
  try {
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/registrar/domains/${clean}/availability`,
      {
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!cfRes.ok) {
      const err = await cfRes.json();
      console.error("[check-domain] Cloudflare error:", err);
      return res.status(502).json({ error: "Cloudflare availability check failed" });
    }

    const data = await cfRes.json();

    // Cloudflare returns result.available (bool) and result.price (annual USD)
    const result = data.result ?? {};

    return res.status(200).json({
      domain:    clean,
      available: result.available ?? false,
      price:     result.price     ?? null, // annual price in USD
      currency:  "USD",
    });
  } catch (err) {
    console.error("[check-domain] Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}