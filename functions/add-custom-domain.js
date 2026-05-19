/**
 * Cloudflare Pages Function: Add a Custom Domain to a Pages Project
 *
 * Place this file at: functions/add-custom-domain.js
 * It will be available at: POST /add-custom-domain
 *
 * Required environment variables (set in Pages → Settings → Environment variables):
 *   ZONE_ID      – The Cloudflare Zone ID for your domain
 *   ACCOUNT_ID   – Your Cloudflare Account ID
 *   API_TOKEN    – A Cloudflare API Token with Pages and DNS write permissions
 *   PROJECT_NAME – The name of your Pages project (e.g. "my-pages-app")
 *
 * Expected request body (JSON):
 *   { "domainName": "www.example.com" }
 */

export async function onRequestPost({ request, env }) {
  /* ------------------------------------------------------------------ */
  /* 1. Validate environment variables                                    */
  /* ------------------------------------------------------------------ */
  const { ZONE_ID, ACCOUNT_ID, API_TOKEN, PROJECT_NAME } = env;

  const missingVars = ["ZONE_ID", "ACCOUNT_ID", "API_TOKEN", "PROJECT_NAME"]
    .filter((key) => !env[key]);

  if (missingVars.length > 0) {
    return jsonResponse(
      { success: false, error: `Missing environment variables: ${missingVars.join(", ")}` },
      500
    );
  }

  /* ------------------------------------------------------------------ */
  /* 2. Parse and validate the request body                               */
  /* ------------------------------------------------------------------ */
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body." }, 400);
  }

  const { domainName } = body;

  if (!domainName || typeof domainName !== "string" || !domainName.trim()) {
    return jsonResponse(
      { success: false, error: "`domainName` is required and must be a non-empty string." },
      400
    );
  }

  const domain = domainName.trim().toLowerCase();

  // Basic domain format validation (hostname only, no protocol or path)
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
  if (!domainRegex.test(domain)) {
    return jsonResponse(
      { success: false, error: `"${domain}" does not look like a valid domain name.` },
      400
    );
  }

  /* ------------------------------------------------------------------ */
  /* 3. Call the Cloudflare API                                           */
  /*    POST /accounts/:account_id/pages/projects/:project_name/domains  */
  /* ------------------------------------------------------------------ */
  const cfApiUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/domains`;

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
    return jsonResponse(
      { success: false, error: `Network error reaching Cloudflare API: ${err.message}` },
      502
    );
  }

  const cfData = await cfResponse.json();

  /* ------------------------------------------------------------------ */
  /* 4. Handle the Cloudflare API response                                */
  /* ------------------------------------------------------------------ */
  if (!cfResponse.ok || !cfData.success) {
    const errors = cfData.errors?.map((e) => `[${e.code}] ${e.message}`).join("; ")
      ?? "Unknown error from Cloudflare API.";

    return jsonResponse(
      {
        success: false,
        error: "Cloudflare API request failed.",
        details: errors,
        // Only forward the status if it's a client-side error (4xx); use 502 for everything else
        cfStatus: cfResponse.status,
      },
      cfResponse.status >= 400 && cfResponse.status < 500 ? cfResponse.status : 502
    );
  }

  /* ------------------------------------------------------------------ */
  /* 5. Return success                                                    */
  /* ------------------------------------------------------------------ */
  return jsonResponse({
    success: true,
    message: `Custom domain "${domain}" has been successfully linked to project "${PROJECT_NAME}".`,
    domain: cfData.result,
  });
}

/* -------------------------------------------------------------------- */
/* Helper: build a JSON Response                                         */
/* -------------------------------------------------------------------- */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Prevent browsers from caching API responses
      "Cache-Control": "no-store",
    },
  });
}