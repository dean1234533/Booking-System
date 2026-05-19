import { addDomainToPages } from './addDomainHelper.js'; // Adjust path if needed

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Intercept your backend API routes explicitly
    if (url.pathname === '/api/check-domain') {
      const domain = url.searchParams.get('domain');
      if (!domain) {
        return new Response(JSON.stringify({ error: 'No domain provided' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Add your check-domain lookup or Cloudflare check logic here
      // Example response:
      return new Response(JSON.stringify({ success: true, domain }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/add-custom-domain') {
      const { domainName } = await request.json();
      const cfResult = await addDomainToPages(domainName, env);
      return new Response(JSON.stringify(cfResult), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Fallback: If it's not an API route, serve the frontend asset
    return env.ASSETS.fetch(request);
  }
};