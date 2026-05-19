// 1. Core Cloudflare API Domain Helper Function
async function addDomainToPages(domainName, env) {
  const { ACCOUNT_ID, API_TOKEN, PROJECT_NAME } = env;
  const domain = domainName.trim().toLowerCase();

  const cfApiUrl =
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}` +
    `/pages/projects/${PROJECT_NAME}/domains`;

  let cfResponse;
  try {
    cfResponse = await fetch(cfApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    });
  } catch (err) {
    return {
      success: false,
      error: `Network error reaching Cloudflare API: ${err.message}`,
    };
  }

  const cfData = await cfResponse.json();

  if (!cfResponse.ok || !cfData.success) {
    const details =
      cfData.errors?.map((e) => `[${e.code}] ${e.message}`).join("; ") ??
      "Unknown error from Cloudflare API.";
    return { success: false, error: "Cloudflare API request failed.", details };
  }

  return { success: true, result: cfData.result };
}

// 2. Main Worker Fetch Request Handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route: Check Domain Availability 
    if (url.pathname === '/api/check-domain') {
      const domain = url.searchParams.get('domain');
      if (!domain) {
        return new Response(JSON.stringify({ error: 'No domain provided' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Return successful response to frontend
      return new Response(JSON.stringify({ success: true, domain }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Route: Add Custom Domain Linkage
    if (url.pathname === '/api/add-custom-domain') {
      try {
        const { domainName } = await request.json();
        const cfResult = await addDomainToPages(domainName, env);
        return new Response(JSON.stringify(cfResult), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Fallback: Serve static frontend files from Vite (dist)
    return env.ASSETS.fetch(request);
  }
};