/**
 * Shared helper: link a custom domain to a Cloudflare Pages project.
 *
 * Called by both:
 *   - functions/add-custom-domain.js  (direct API endpoint)
 *   - functions/webhooks/stripe.js    (post-payment webhook)
 *
 * @param {string} domainName  - The hostname to add (e.g. "www.example.com")
 * @param {object} env         - Cloudflare Workers env bindings
 * @returns {{ success: boolean, result?: object, error?: string, details?: string }}
 */
export async function addDomainToPages(domainName, env) {
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