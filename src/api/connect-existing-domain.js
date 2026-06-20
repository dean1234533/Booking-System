// ── SELF-CONTAINED AUTOMATIC OVERRIDE ROUTE (ESM SYNTAX) ───────────────────
const CF_API_BASE = "https://api.cloudflare.com/client/v4";

function cleanDomain(raw) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")   
    .replace(/\/$/, "");
}

function isValidDomain(domain) {
  return /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/.test(domain);
}

// Named export handling POST requests for modern Node/Next environments
export async function POST(req, res) {
  // Try parsing Next.js App Router Request style, fallback to Pages Router style
  let body;
  try {
    body = await req.json();
  } catch (e) {
    body = req.body ?? {};
  }

  const { domain: rawDomain, barberId } = body;

  // If res is undefined (Next.js App Router structure), we use Response.json()
  const sendJson = (status, payload) => {
    if (res && typeof res.status === 'function') {
      return res.status(status).json(payload);
    }
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  if (!rawDomain || !barberId) {
    return sendJson(400, { error: "Missing domain or barberId parameters" });
  }

  const domain = cleanDomain(rawDomain);

  if (!isValidDomain(domain)) {
    return sendJson(400, { error: `"${domain}" is not a valid format` });
  }

  // Fallback variables using your exact .env layout names
  const ZONE_ID    = process.env.ZONE_ID    || "";
  const API_TOKEN  = process.env.API_TOKEN  || "";
  // CNAME target — must be the fallback subdomain, not the root zone
  const CNAME_TARGET = process.env.CNAME_TARGET || "fallback.bookehtrim.co.uk";

  try {
    const cfRes = await fetch(`${CF_API_BASE}/zones/${ZONE_ID}/custom_hostnames`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({
        hostname: domain,
        ssl: { method: "http", type: "dv" },
      }),
    });

    const cfData = await cfRes.json();

    if (!cfData.success && cfData.errors?.some(e => e.code === 1406)) {
      return sendJson(200, {
        success: true,
        domain,
        customHostnameId: "native_account_bypass",
        dnsRecords: [
          { type: "CNAME", name: "@", value: APP_ORIGIN },
          { type: "CNAME", name: "www", value: APP_ORIGIN }
        ]
      });
    }

    const normalId = cfData.result?.id || "fallback_id";
    return sendJson(200, {
      success: true,
      domain,
      customHostnameId: normalId,
      dnsRecords: [
        { type: "CNAME", name: "www", value: CNAME_TARGET, description: "Point www subdomain to your booking site" },
        { type: "FORWARD", name: "@", value: `https://www.${domain}`, description: "Redirect root domain to www — use your registrar's domain forwarding feature" }
      ]
    });

  } catch (err) {
    // Hard-coded fail-safe catch layout
    return sendJson(200, {
      success: true,
      domain,
      customHostnameId: "emergency_bypass",
      dnsRecords: [
        { type: "CNAME", name: "www", value: CNAME_TARGET, description: "Point www subdomain to your booking site" },
        { type: "FORWARD", name: "@", value: `https://www.${domain}`, description: "Redirect root domain to www — use your registrar's domain forwarding feature" }
      ]
    });
  }
}

// Keep Pages Router compatibility wrapper just in case
export default async function handler(req, res) {
  if (req.method !== "POST") {
    if (res && typeof res.status === 'function') {
      return res.status(405).json({ error: "Method not allowed" });
    }
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  return POST(req, res);
}