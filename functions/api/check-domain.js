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

// ── Cloudflare Worker Function Handler ───────────────────────────────────────
async function checkDomainAvailability(domainParam, env) {
  // Pull credentials securely from the Cloudflare Worker env context
  const CF_API_TOKEN  = env.API_TOKEN;
  const CF_ACCOUNT_ID = env.ACCOUNT_ID;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!domainParam) {
    return new Response(JSON.stringify({ error: "domain query parameter is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const clean = domainParam.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (!isValidDomain(clean)) {
    return new Response(JSON.stringify({ error: "Invalid domain format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const tld = extractTLD(clean);
  if (!SUPPORTED_TLDS.includes(tld)) {
    return new Response(JSON.stringify({
      error: `Unsupported TLD: .${tld}`,
      supported: SUPPORTED_TLDS,
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
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
      return new Response(JSON.stringify({ error: "Cloudflare availability check failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await cfRes.json();

    // Cloudflare returns result.available (bool) and result.price (annual USD)
    const result = data.result ?? {};

    return new Response(JSON.stringify({
      domain:    clean,
      available: result.available ?? false,
      price:     result.price      ?? null, // annual price in USD
      currency:  "USD",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[check-domain] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// ── Main Cloudflare Worker Routing Entrypoint ─────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // GET /api/check-domain?domain=deansbarbershop.com
    if (url.pathname === '/api/check-domain') {
      if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { 
          status: 405,
          headers: { "Content-Type": "application/json" }
        });
      }
      const domain = url.searchParams.get('domain');
      return await checkDomainAvailability(domain, env);
    }

    // Fallback: Serves static compiled Vite frontend files from your assets ('dist')
    return env.ASSETS.fetch(request);
  }
};