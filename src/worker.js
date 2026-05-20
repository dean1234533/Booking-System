// ── Helper Logic (Kept exactly from your code) ───────────────────────────────
const SUPPORTED_TLDS = ["com", "co.uk", "uk", "net", "org", "io", "shop", "store"];

function extractTLD(domain) {
  const parts = domain.split(".");
  if (parts.length >= 3) return parts.slice(-2).join(".");
  return parts.slice(-1)[0];
}

function isValidDomain(domain) {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/i.test(domain);
}

// ── Cloudflare Registrar availability check logic ───────────────────────────────
async function checkDomainAvailability(domainQuery, env) {
  // Cloudflare Workers use 'env' bindings instead of process.env
  const CF_API_TOKEN = env.API_TOKEN; 
  const CF_ACCOUNT_ID = env.ACCOUNT_ID;

  if (!domainQuery) {
    return new Response(JSON.stringify({ error: "domain query parameter is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const clean = domainQuery.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

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
      // UPDATED LOG: Stringifies the error object so the exact Cloudflare reason is printed to your dashboard logs
      console.error("[check-domain] Cloudflare error payload:", JSON.stringify(err));
      return new Response(JSON.stringify({ error: "Cloudflare availability check failed", details: err }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await cfRes.json();
    const result = data.result ?? {};

    return new Response(JSON.stringify({
      domain:    clean,
      available: result.available ?? false,
      price:     result.price      ?? null,
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

// ── Main Cloudflare Worker Core Routing ──────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Route match for checking a domain availability
    if (url.pathname === '/api/check-domain') {
      if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
      }
      const domainParam = url.searchParams.get('domain');
      return await checkDomainAvailability(domainParam, env);
    }

    // 2. Fallback: If it's not an API call, serve the compiled Vite client assets
    return fetch(request);
  }
};