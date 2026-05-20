async function registerDomain(domain, env) {
  // 1. Buy the domain instantly via the API
  const regRes = await fetch(`https://api.porkbun.com/api/json/v3/domain/register/${encodeURIComponent(domain)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: env.PORKBUN_API_KEY,
      secretapikey: env.PORKBUN_SECRET_KEY
    })
  });

  const regData = await regRes.json();
  if (!regRes.ok || regData.status !== "SUCCESS") {
    throw new Error(`Porkbun API automated registration failure: ${regData.message || JSON.stringify(regData)}`);
  }

  console.log(`[provision-domain] Purchased ${domain} successfully. Updating nameservers next...`);

  // 2. FORCE the specific domain to use Cloudflare Nameservers immediately
  const nsRes = await fetch(`https://api.porkbun.com/api/json/v3/domain/updateNameservers/${encodeURIComponent(domain)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: env.PORKBUN_API_KEY,
      secretapikey: env.PORKBUN_SECRET_KEY,
      nameservers: [
        "alice.ns.cloudflare.com", // Swap with your exact Cloudflare nameserver 1
        "bob.ns.cloudflare.com"    // Swap with your exact Cloudflare nameserver 2
      ]
    })
  });

  const nsData = await nsRes.json();
  if (!nsRes.ok || nsData.status !== "SUCCESS") {
    console.warn(`[provision-domain] Nameserver force-update warning: ${nsData.message || JSON.stringify(nsData)}`);
  } else {
    console.log(`[provision-domain] Nameservers successfully pointed to Cloudflare for ${domain}`);
  }

  return regData;
}