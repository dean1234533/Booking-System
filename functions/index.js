"use strict";

const {onCall, HttpsError, onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
// stripe, nodemailer and axios are heavy to require (~5s combined) and pushed
// cold module-load past the Cloud Functions 10s analysis timeout on deploy.
// Load them lazily. axios is wrapped in a Proxy so existing `axios.get/post/put`
// call sites keep working unchanged while deferring the require to first use.
let _axios;
const axios = new Proxy({}, {get: (_t, p) => (_axios || (_axios = require("axios")))[p]});

admin.initializeApp();

const CF_API_TOKEN = defineSecret("API_TOKEN");
const CF_ZONE_ID = defineSecret("ZONE_ID");

// Cloudflare auth headers. API_TOKEN holds a scoped API token → Bearer auth.
function cfAuthHeaders(extra = {}) {
  return {
    "Authorization": `Bearer ${CF_API_TOKEN.value()}`,
    ...extra,
  };
}
const STRIPE_SECRET = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_PASS = defineSecret("GMAIL_PASS");
const PORKBUN_API_KEY = defineSecret("PORKBUN_API_KEY");
const PORKBUN_SECRET_KEY = defineSecret("PORKBUN_SECRET_KEY");
const GOOGLE_OAUTH_CLIENT_ID = defineSecret("GOOGLE_OAUTH_CLIENT_ID");
const GOOGLE_OAUTH_CLIENT_SECRET = defineSecret("GOOGLE_OAUTH_CLIENT_SECRET");
const ADMIN_ACCESS_KEY = defineSecret("ADMIN_ACCESS_KEY");

const CF_API = "https://api.cloudflare.com/client/v4";
const PORKBUN_API = "https://api.porkbun.com/api/json/v3";
const APP_ORIGIN = "https://bookrightly.co.uk";
const ADMIN_GOOGLE_REDIRECT_URI = "https://us-central1-booking-system-cdce0.cloudfunctions.net/adminGoogleOAuthCallback";
// Full (not readonly) webmasters scope — sites.add, used to register a newly
// verified domain as a Search Console property, is a write operation and
// gets rejected as "insufficient authentication scopes" under .readonly.
const GOOGLE_ADMIN_SCOPES = "https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/siteverification.verify_only";
// Cloudflare account that owns the zones + the booking Worker.
const CF_ACCOUNT_ID = "74303e7cc790df1d034459f9cb1faf1e";
const WORKER_SERVICE = "booking-system";

const SUPPORTED_TLDS = ["com", "co.uk", "uk", "net", "org", "io", "shop", "store"];
const USD_TO_GBP = 0.79;
const PLATFORM_MARKUP = 5;

const FALLBACK_PRICES_USD = {
  "com": 11.08,
  "net": 12.52,
  "org": 10.74,
  "io": 27.12,
  "co.uk": 5.66,
  "uk": 5.66,
  "shop": 4.00,
  "store": 5.00,
};

function extractTLD(domain) {
  const parts = domain.split(".");
  return parts.length >= 3 ? parts.slice(-2).join(".") : parts[parts.length - 1];
}

function isValidDomain(domain) {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/i.test(domain);
}

function cleanDomain(raw) {
  return raw.toLowerCase().trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
}

function toGbp(priceUsd) {
  return Math.round((priceUsd * USD_TO_GBP + PLATFORM_MARKUP) * 100) / 100;
}

// Looks up the real per-TLD registration price from Porkbun, falling back to
// FALLBACK_PRICES_USD on error. This is the ONLY trustworthy source for a
// domain's price — createDomainCheckout used to take priceUsd straight from
// the client and pass it directly into the Stripe checkout's unit_amount,
// which let anyone set an arbitrary price (e.g. £0.01) for a domain the
// platform then actually pays Porkbun to register regardless of what Stripe
// collected. Always call this server-side instead of trusting client input.
async function fetchDomainPriceUsd(tld) {
  let priceUsd = FALLBACK_PRICES_USD[tld] ?? 12.00;
  try {
    const pricingRes = await axios.get("https://porkbun.com/api/json/v3/pricing/get");
    const pricing = pricingRes.data.pricing ?? {};
    const normalizedTld = tld.replace(/^\./, "");
    if (pricing[normalizedTld]?.registration) {
      priceUsd = parseFloat(pricing[normalizedTld].registration);
    }
  } catch (pricingErr) {
    console.warn("fetchDomainPriceUsd: pricing fetch failed, using fallback:", pricingErr.message);
  }
  return priceUsd;
}

exports.checkDomain = onCall(
    {secrets: [], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const {domain} = request.data;
      if (!domain) throw new HttpsError("invalid-argument", "domain is required");

      const clean = cleanDomain(domain);
      if (!isValidDomain(clean)) {
        throw new HttpsError("invalid-argument", "Invalid domain format");
      }

      const tld = extractTLD(clean);
      if (!SUPPORTED_TLDS.includes(tld)) {
        throw new HttpsError("invalid-argument", `Unsupported TLD: .${tld}`);
      }

      try {
        const dnsRes = await axios.get(
            `https://1.1.1.1/dns-query?name=${encodeURIComponent(clean)}&type=SOA`,
            {headers: {Accept: "application/dns-json"}},
        );
        const available = dnsRes.data.Status === 3;

        const priceUsd = await fetchDomainPriceUsd(tld);
        const priceGbp = toGbp(priceUsd);

        return {
          domain: clean,
          available,
          price: priceGbp,
          priceUsd,
          currency: "GBP",
        };
      } catch (error) {
        const detail = error.response?.data || error.message;
        console.error("checkDomain error:", detail);
        throw new HttpsError("internal", "Failed to check domain availability.");
      }
    },
);

exports.createDomainCheckout = onCall(
    {secrets: [STRIPE_SECRET], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      // barberId and priceUsd used to come straight from request.data — any
      // authenticated caller could set an arbitrary price (Stripe would
      // charge £0.01 while the platform still pays Porkbun full price to
      // register the domain) and an arbitrary barberId (attaching the
      // purchase, and overwriting customDomain, on a DIFFERENT user's
      // account entirely). barberId must always be the caller's own uid;
      // price must always be re-derived server-side, never trusted from the
      // client that's about to pay it.
      const barberId = request.auth.uid;
      const {domain} = request.data;
      if (!domain) throw new HttpsError("invalid-argument", "domain is required");

      const clean = cleanDomain(domain);
      if (!isValidDomain(clean)) {
        throw new HttpsError("invalid-argument", "Invalid domain format");
      }
      const tld = extractTLD(clean);
      if (!SUPPORTED_TLDS.includes(tld)) {
        throw new HttpsError("invalid-argument", `Unsupported TLD: .${tld}`);
      }

      const priceUsd = await fetchDomainPriceUsd(tld);
      const stripe = new (require("stripe"))(STRIPE_SECRET.value());
      const pricePence = Math.round(toGbp(priceUsd) * 100);

      try {
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          line_items: [{
            price_data: {
              currency: "gbp",
              unit_amount: pricePence,
              product_data: {
                name: `Custom Domain: ${clean}`,
                description: `1-year registration for ${clean}`,
              },
            },
            quantity: 1,
          }],
          metadata: {
            type: "domain_purchase",
            domain: clean,
            barberId,
            priceUsd: String(priceUsd),
          },
          success_url: `${APP_ORIGIN}/dashboard?domainSuccess=true&domain=${encodeURIComponent(clean)}`,
          cancel_url: `${APP_ORIGIN}/dashboard?domainCancelled=true`,
        });

        return {url: session.url, sessionId: session.id};
      } catch (error) {
        console.error("createDomainCheckout error:", error.message);
        throw new HttpsError("internal", "Failed to create checkout session.");
      }
    },
);

exports.addCustomDomain = onCall(
    {secrets: [CF_API_TOKEN, CF_ZONE_ID], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const {domain} = request.data;
      if (!domain) throw new HttpsError("invalid-argument", "domain is required");

      // Strip www. prefix — we always store the bare domain.
      const clean = cleanDomain(domain).replace(/^www\./, "");
      if (!isValidDomain(clean)) {
        throw new HttpsError("invalid-argument", "Invalid domain format");
      }
      // The actual custom hostname is the WWW subdomain. Root/apex domains cannot
      // be CNAME'd to the SaaS fallback, so Cloudflare for SaaS can't activate them
      // via A records — but www CAN CNAME, so it validates automatically. The root
      // is handled with a registrar forward to https://www.<domain>.
      const wwwHost = `www.${clean}`;
      const FALLBACK = "fallback.bookehtrim.co.uk";

      // DNS records the user adds at their registrar.
      const DNS_RECORDS = [
        {type: "CNAME", name: "www", value: FALLBACK, ttl: "Auto", description: "Points your site to us — add this and HTTPS activates automatically"},
        {type: "FORWARD", name: "@", value: `https://${wwwHost}`, description: "Forward your root domain to www (use your registrar's domain forwarding)"},
      ];

      const base = `${CF_API}/zones/${CF_ZONE_ID.value()}/custom_hostnames`;

      try {
        let result = null;

        // If the www hostname already exists and is active, reuse it — reconnecting
        // is then idempotent and causes no downtime for an already-live domain.
        try {
          const existingWww = await axios.get(
              `${base}?hostname=${encodeURIComponent(wwwHost)}`,
              {headers: cfAuthHeaders()},
          );
          result = (existingWww.data.result || []).find((h) => h.status === "active") || null;
        } catch (e) {
          // fall through to create
        }

        if (!result) {
          // Remove any stale hostnames (failed apex attempts or non-active www),
          // then register the www subdomain fresh.
          for (const host of [clean, wwwHost]) {
            try {
              const existing = await axios.get(
                  `${base}?hostname=${encodeURIComponent(host)}`,
                  {headers: cfAuthHeaders()},
              );
              for (const h of (existing.data.result || [])) {
                await axios.delete(`${base}/${h.id}`, {headers: cfAuthHeaders()}).catch(() => {});
              }
            } catch (e) {
              // nothing to clean up
            }
          }

          // HTTP validation completes automatically once the www CNAME points to the
          // fallback — no TXT records for the user to copy.
          const response = await axios.post(
              base,
              {
                hostname: wwwHost,
                ssl: {
                  method: "http",
                  type: "dv",
                  settings: {min_tls_version: "1.2", http2: "on"},
                },
              },
              {headers: cfAuthHeaders({"Content-Type": "application/json"})},
          );
          result = response.data.result;
        }

        // Store the bare domain — getBarberByDomain strips www, so visitors on both
        // www.<domain> and the forwarded root resolve to this tenant.
        await admin.firestore().collection("barbers").doc(request.auth.uid).update({
          customDomain: clean,
          domainStatus: result.status === "active" ? "active" : "pending",
          customHostnameId: result.id,
        });

        return {cfHostnameId: result.id, domain: clean, dnsRecords: DNS_RECORDS};
      } catch (error) {
        const detail = error.response?.data || error.message;
        console.error("addCustomDomain error:", JSON.stringify(detail));
        throw new HttpsError("internal", "Failed to connect domain.");
      }
    },
);

exports.checkDomainStatus = onCall(
    {secrets: [CF_API_TOKEN, CF_ZONE_ID], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const {cfHostnameId} = request.data;
      if (!cfHostnameId) throw new HttpsError("invalid-argument", "cfHostnameId is required");

      try {
        const response = await axios.get(
            `${CF_API}/zones/${CF_ZONE_ID.value()}/custom_hostnames/${cfHostnameId}`,
            {headers: cfAuthHeaders()},
        );

        const {status, ssl} = response.data.result;
        const isVerified = status === "active";
        const sslStatus = ssl?.status ?? "initializing";
        const sslReady = sslStatus === "active";
        const isLive = isVerified && sslReady;

        if (isLive) {
          await admin.firestore().collection("barbers").doc(request.auth.uid).update({
            domainStatus: "active",
            verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        return {domainStatus: status, sslStatus, isVerified, sslReady, isLive};
      } catch (error) {
        const detail = error.response?.data || error.message;
        console.error("checkDomainStatus error:", detail);
        throw new HttpsError("internal", "Failed to fetch domain status.");
      }
    },
);

// ── Automatic domain connection via nameserver delegation ────────────────────
// The customer changes their domain's nameservers to Cloudflare once; after that
// the platform owns the zone and provisions everything (records, routing, SSL)
// automatically — no manual DNS records to copy.

exports.connectDomainAuto = onCall(
    {secrets: [CF_API_TOKEN, CF_ZONE_ID], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const {domain} = request.data;
      if (!domain) throw new HttpsError("invalid-argument", "domain is required");

      const clean = cleanDomain(domain).replace(/^www\./, "");
      if (!isValidDomain(clean)) {
        throw new HttpsError("invalid-argument", "Invalid domain format");
      }

      // Clean up any leftover custom_hostname record on the PLATFORM's shared
      // zone from a previous addCustomDomain (CNAME method) attempt at this
      // exact domain. The two connection methods are mutually exclusive, and
      // a record left behind by the other one doesn't just sit inert — it
      // does something: Cloudflare keeps retrying its HTTP validation
      // forever (it will never succeed once the domain's own nameservers
      // point elsewhere), and those retries land on THIS domain's own Worker
      // once its nameservers are delegated, hitting an unrelated code path
      // and timing out. Found + fixed 2026-08-21 after exactly this left a
      // customer's domain generating repeated 522s post-connection.
      for (const host of [clean, `www.${clean}`]) {
        try {
          const existing = await axios.get(
              `${CF_API}/zones/${CF_ZONE_ID.value()}/custom_hostnames?hostname=${encodeURIComponent(host)}`,
              {headers: cfAuthHeaders()},
          );
          for (const h of (existing.data.result || [])) {
            await axios.delete(
                `${CF_API}/zones/${CF_ZONE_ID.value()}/custom_hostnames/${h.id}`,
                {headers: cfAuthHeaders()},
            ).catch(() => {});
          }
        } catch (e) {
          // nothing to clean up
        }
      }

      try {
        // Create a full zone for the domain (this is the nameserver-delegation model).
        const createRes = await axios.post(
            `${CF_API}/zones`,
            {name: clean, account: {id: CF_ACCOUNT_ID}, type: "full"},
            {headers: cfAuthHeaders({"Content-Type": "application/json"})},
        ).catch((e) => e.response);

        let zone;
        if (createRes && createRes.data && createRes.data.success) {
          zone = createRes.data.result;
        } else {
          // Zone likely already exists in the account — fetch it.
          const existing = await axios.get(
              `${CF_API}/zones?name=${encodeURIComponent(clean)}`,
              {headers: cfAuthHeaders()},
          );
          zone = (existing.data.result || [])[0];
          if (!zone) {
            const errs = createRes?.data?.errors || [];
            console.error("connectDomainAuto create failed:", JSON.stringify(errs));
            throw new HttpsError("internal", errs[0]?.message || "Could not create a zone for that domain.");
          }
        }

        const nameservers = zone.name_servers || [];

        await admin.firestore().collection("barbers").doc(request.auth.uid).update({
          customDomain: clean,
          cfZoneId: zone.id,
          nameservers,
          connectMethod: "delegation",
          domainStatus: zone.status === "active" ? "pending" : "pending_ns",
        });

        return {zoneId: zone.id, domain: clean, nameservers, zoneStatus: zone.status};
      } catch (error) {
        if (error instanceof HttpsError) throw error;
        const detail = error.response?.data || error.message;
        console.error("connectDomainAuto error:", detail);
        throw new HttpsError("internal", "Failed to start domain connection.");
      }
    },
);

exports.checkDomainAuto = onCall(
    {secrets: [CF_API_TOKEN], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const {zoneId, domain} = request.data;
      if (!zoneId || !domain) {
        throw new HttpsError("invalid-argument", "zoneId and domain are required");
      }
      const clean = cleanDomain(domain).replace(/^www\./, "");

      try {
        const zoneRes = await axios.get(
            `${CF_API}/zones/${zoneId}`,
            {headers: cfAuthHeaders()},
        );
        const status = zoneRes.data.result?.status;
        const isActive = status === "active";

        if (isActive) {
          // Nameservers are delegated — attach the booking Worker to the apex and
          // www. A Worker custom domain auto-creates the proxied DNS record, the
          // route and the SSL certificate. PUT is idempotent, so re-runs are safe.
          for (const host of [clean, `www.${clean}`]) {
            await axios.put(
                `${CF_API}/accounts/${CF_ACCOUNT_ID}/workers/domains`,
                {zone_id: zoneId, hostname: host, service: WORKER_SERVICE, environment: "production"},
                {headers: cfAuthHeaders({"Content-Type": "application/json"})},
            ).catch((e) => {
              const errs = e.response?.data?.errors || [];
              console.warn(`workers/domains ${host}:`, JSON.stringify(errs));
            });
          }

          await admin.firestore().collection("barbers").doc(request.auth.uid).update({
            domainStatus: "active",
            verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        return {zoneStatus: status, isLive: isActive};
      } catch (error) {
        const detail = error.response?.data || error.message;
        console.error("checkDomainAuto error:", detail);
        throw new HttpsError("internal", "Failed to check domain status.");
      }
    },
);

// ── Self-serve TXT records for auto-connected (nameserver-delegation) domains ─
// Once a domain's nameservers point at us, its DNS lives entirely in our
// Cloudflare account and the owner has no registrar panel of their own to add
// records to — e.g. a Google Search Console or email (SPF/DKIM) verification
// TXT record. These let an owner manage TXT records on their own zone only;
// scoped to the caller's own barber doc → cfZoneId, so one account can never
// touch another's zone. Restricted to TXT (not A/CNAME/etc.) so this can't be
// used to break the Worker routing that already owns the domain's other records.

async function requireDelegatedZone(uid) {
  const snap = await admin.firestore().collection("barbers").doc(uid).get();
  const data = snap.data();
  if (!data || data.connectMethod !== "delegation" || !data.cfZoneId) {
    throw new HttpsError("failed-precondition", "No auto-connected domain found for this account.");
  }
  return data;
}

exports.listDomainDnsRecords = onCall(
    {secrets: [CF_API_TOKEN], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
      const {cfZoneId} = await requireDelegatedZone(request.auth.uid);

      try {
        const res = await axios.get(
            `${CF_API}/zones/${cfZoneId}/dns_records?type=TXT&per_page=100`,
            {headers: cfAuthHeaders()},
        );
        return {records: (res.data.result || []).map((r) => ({id: r.id, name: r.name, content: r.content}))};
      } catch (error) {
        console.error("listDomainDnsRecords error:", error.response?.data || error.message);
        throw new HttpsError("internal", "Failed to list DNS records.");
      }
    },
);

exports.addDomainDnsRecord = onCall(
    {secrets: [CF_API_TOKEN], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const name = String(request.data?.name || "").trim();
      const content = String(request.data?.content || "").trim().replace(/^"+|"+$/g, "");
      if (!name || !content) {
        throw new HttpsError("invalid-argument", "name and content are required");
      }
      if (content.length > 2048) {
        throw new HttpsError("invalid-argument", "TXT value is too long");
      }

      const {cfZoneId, customDomain} = await requireDelegatedZone(request.auth.uid);
      const cleanName = name.toLowerCase().replace(/\.$/, "");
      const isOwn = cleanName === "@" || cleanName === customDomain || cleanName.endsWith(`.${customDomain}`);
      if (!isOwn) {
        throw new HttpsError("invalid-argument", `Record name must be within ${customDomain}`);
      }

      try {
        const res = await axios.post(
            `${CF_API}/zones/${cfZoneId}/dns_records`,
            {type: "TXT", name: cleanName === "@" ? customDomain : cleanName, content, ttl: 1},
            {headers: cfAuthHeaders({"Content-Type": "application/json"})},
        );
        return {record: res.data.result};
      } catch (error) {
        const errs = error.response?.data?.errors || [];
        console.error("addDomainDnsRecord error:", JSON.stringify(errs) || error.message);
        throw new HttpsError("internal", errs[0]?.message || "Failed to add DNS record.");
      }
    },
);

exports.deleteDomainDnsRecord = onCall(
    {secrets: [CF_API_TOKEN], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
      const recordId = String(request.data?.recordId || "");
      if (!recordId) throw new HttpsError("invalid-argument", "recordId is required");

      const {cfZoneId} = await requireDelegatedZone(request.auth.uid);

      try {
        await axios.delete(
            `${CF_API}/zones/${cfZoneId}/dns_records/${recordId}`,
            {headers: cfAuthHeaders()},
        );
        return {success: true};
      } catch (error) {
        console.error("deleteDomainDnsRecord error:", error.response?.data || error.message);
        throw new HttpsError("internal", "Failed to delete DNS record.");
      }
    },
);

// ── Google Search Console (platform-owned) ────────────────────────────────────
// Rather than each customer connecting their own Google account — which would
// mean every one of them hitting Google's "unverified app" warning (or being
// blocked outright) until this app goes through Google's public verification
// review — Bookrightly's own Google account is added as a verified owner of
// each connected domain's Search Console property via a DNS TXT record, and
// that ONE account is used server-side to read traffic for every customer's
// domain. No customer ever sees a Google consent screen; the only OAuth grant
// is the one-off admin connection below, done once by the platform owner.

async function googleTokenRequest(params) {
  const res = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        client_id: GOOGLE_OAUTH_CLIENT_ID.value(),
        client_secret: GOOGLE_OAUTH_CLIENT_SECRET.value(),
        ...params,
      }).toString(),
      {headers: {"Content-Type": "application/x-www-form-urlencoded"}},
  );
  return res.data;
}

async function getAdminAccessToken() {
  const ref = admin.firestore().collection("platformConfig").doc("googleSearchConsole");
  const snap = await ref.get();
  const doc = snap.data();
  if (!doc?.refreshToken) {
    throw new HttpsError("failed-precondition", "Google Search Console isn't connected on the platform yet.");
  }
  if (doc.accessToken && doc.accessTokenExpiry > Date.now() + 60000) {
    return doc.accessToken;
  }
  try {
    const tokens = await googleTokenRequest({refresh_token: doc.refreshToken, grant_type: "refresh_token"});
    await ref.update({accessToken: tokens.access_token, accessTokenExpiry: Date.now() + tokens.expires_in * 1000});
    return tokens.access_token;
  } catch (error) {
    console.error("getAdminAccessToken error:", error.response?.data || error.message);
    throw new HttpsError("internal", "Google connection needs reconnecting on the platform side.");
  }
}

// Step 1 of the ONE-TIME admin connection — visited directly in a browser by
// the platform owner (not through the customer dashboard), gated by a secret
// key rather than Firebase Auth since this isn't tied to any barber account.
exports.adminGoogleAuthStart = onRequest(
    {secrets: [GOOGLE_OAUTH_CLIENT_ID, ADMIN_ACCESS_KEY], invoker: "public"},
    async (req, res) => {
      if (req.query.key !== ADMIN_ACCESS_KEY.value()) {
        return res.status(403).send("Forbidden");
      }
      const url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
        client_id: GOOGLE_OAUTH_CLIENT_ID.value(),
        redirect_uri: ADMIN_GOOGLE_REDIRECT_URI,
        response_type: "code",
        scope: GOOGLE_ADMIN_SCOPES,
        access_type: "offline",
        prompt: "consent",
        state: ADMIN_ACCESS_KEY.value(),
      }).toString();
      res.redirect(url);
    },
);

// Step 2 — Google redirects here with ?code&state. The admin key doubles as
// the state token so this doesn't need any Firestore lookup to trust it.
exports.adminGoogleOAuthCallback = onRequest(
    {secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, ADMIN_ACCESS_KEY], invoker: "public"},
    async (req, res) => {
      const {code, state, error} = req.query;
      if (error) return res.status(400).send(`Google returned an error: ${error}`);
      if (state !== ADMIN_ACCESS_KEY.value()) return res.status(403).send("Forbidden");
      if (!code) return res.status(400).send("Missing code");

      try {
        const tokens = await googleTokenRequest({
          code: String(code),
          redirect_uri: ADMIN_GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        });
        if (!tokens.refresh_token) {
          return res.status(400).send(
              "Google didn't return a refresh token — this usually means Bookrightly already has a prior " +
              "grant on file. Revoke access at https://myaccount.google.com/permissions and try again.",
          );
        }
        await admin.firestore().collection("platformConfig").doc("googleSearchConsole").set({
          refreshToken: tokens.refresh_token,
          accessToken: tokens.access_token,
          accessTokenExpiry: Date.now() + tokens.expires_in * 1000,
          connectedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
        return res.send("Connected. You can close this tab.");
      } catch (err) {
        console.error("adminGoogleOAuthCallback error:", err.response?.data || err.message);
        return res.status(500).send("Something went wrong connecting Google — check the function logs.");
      }
    },
);

// Requests the DNS TXT verification token for the caller's own connected
// domain from Google, then tries to complete verification right away. For an
// auto-connected (nameserver delegation) domain we control the DNS ourselves
// via Cloudflare, so this adds the record and verifies in one call — no
// customer action needed. For a manually-connected domain (DNS lives at the
// owner's own registrar), the record is handed back for them to add
// themselves, and calling this again afterwards completes it.
exports.verifyDomainForSearchConsole = onCall(
    {secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, CF_API_TOKEN], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
      const uid = request.auth.uid;

      const barberSnap = await admin.firestore().collection("barbers").doc(uid).get();
      const barber = barberSnap.data();
      const domain = barber?.customDomain;
      const bookingSlug = barber?.bookingSlug;
      if (!domain && !bookingSlug) throw new HttpsError("failed-precondition", "No booking page found.");

      const accessToken = await getAdminAccessToken();
      const privateRef = admin.firestore().collection("barbers").doc(uid)
          .collection("private").doc("searchConsole");

      // No custom domain — the booking page lives at bookrightly.co.uk/{slug}.
      // bookrightly.co.uk itself is already a verified Domain property under
      // this account, and Search Console automatically extends that
      // verification to any URL-prefix property beneath it, so this can just
      // register the property directly with no DNS/token dance at all.
      if (!domain) {
        const siteUrl = `https://bookrightly.co.uk/${bookingSlug}`;
        try {
          await axios.put(
              `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}`,
              {},
              {headers: {"Authorization": `Bearer ${accessToken}`}},
          );
          await privateRef.set({status: "verified", verifiedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
          return {verified: true};
        } catch (err) {
          console.error("verifyDomainForSearchConsole sites.add (slug) error:", err.response?.data || err.message);
          throw new HttpsError("internal", "Couldn't register your booking page with Search Console.");
        }
      }

      let token;
      try {
        const tokenRes = await axios.post(
            "https://www.googleapis.com/siteVerification/v1/token",
            {site: {type: "INET_DOMAIN", identifier: domain}, verificationMethod: "DNS_TXT"},
            {headers: {"Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json"}},
        );
        token = tokenRes.data.token;
      } catch (err) {
        console.error("verifyDomainForSearchConsole getToken error:", err.response?.data || err.message);
        throw new HttpsError("internal", "Couldn't get a verification token from Google.");
      }

      if (barber.connectMethod === "delegation" && barber.cfZoneId) {
        try {
          await axios.post(
              `${CF_API}/zones/${barber.cfZoneId}/dns_records`,
              {type: "TXT", name: domain, content: token, ttl: 1},
              {headers: cfAuthHeaders({"Content-Type": "application/json"})},
          );
        } catch (err) {
          // Likely already added by a previous attempt at this same token — fine.
          console.warn("verifyDomainForSearchConsole dns add:", err.response?.data || err.message);
        }
      }

      try {
        await axios.post(
            "https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=DNS_TXT",
            {site: {type: "INET_DOMAIN", identifier: domain}},
            {headers: {"Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json"}},
        );
        // Ownership verification (above) and being registered as a Search
        // Console property are two separate things in Google's system — this
        // second call is what actually makes searchAnalytics.query work for
        // the domain. PUT is idempotent, safe to call even if already added.
        await axios.put(
            `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(`sc-domain:${domain}`)}`,
            {},
            {headers: {"Authorization": `Bearer ${accessToken}`}},
        );
        await privateRef.set({status: "verified", verifiedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
        return {verified: true};
      } catch (err) {
        const manual = barber.connectMethod !== "delegation";
        await privateRef.set({status: "pending", txtRecordName: "@", txtRecordValue: token}, {merge: true});
        return {
          verified: false,
          txtRecord: manual ? {name: "@", value: token} : null,
          message: manual ?
            "Add this TXT record at your domain's DNS, then try again." :
            "DNS is still updating — try again in a minute.",
        };
      }
    },
);

exports.getSearchConsoleTraffic = onCall(
    {secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
      const uid = request.auth.uid;

      const barber = (await admin.firestore().collection("barbers").doc(uid).get()).data();
      const domain = barber?.customDomain;
      const bookingSlug = barber?.bookingSlug;
      if (!domain && !bookingSlug) throw new HttpsError("failed-precondition", "No booking page found.");
      const siteUrl = domain ? `sc-domain:${domain}` : `https://bookrightly.co.uk/${bookingSlug}`;
      const displayName = domain || `bookrightly.co.uk/${bookingSlug}`;

      const privateSnap = await admin.firestore().collection("barbers").doc(uid)
          .collection("private").doc("searchConsole").get();
      if (privateSnap.data()?.status !== "verified") {
        throw new HttpsError("failed-precondition", "not_verified");
      }

      const accessToken = await getAdminAccessToken();

      // Self-heals accounts marked "verified" before sites.add existed here —
      // idempotent, safe to call every time.
      await axios.put(
          `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}`,
          {},
          {headers: {"Authorization": `Bearer ${accessToken}`}},
      ).catch((err) => console.warn("getSearchConsoleTraffic sites.add:", err.response?.data || err.message));

      // Search Console data typically lags 2-3 days; a 28-day window ending
      // 3 days ago mirrors what the Search Console UI itself shows by default.
      const end = new Date();
      end.setDate(end.getDate() - 3);
      const start = new Date(end);
      start.setDate(start.getDate() - 27);
      const fmt = (d) => d.toISOString().slice(0, 10);

      try {
        const res = await axios.post(
            `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
            {startDate: fmt(start), endDate: fmt(end), dimensions: ["date"], rowLimit: 1000},
            {headers: {"Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json"}},
        );
        const rows = res.data.rows || [];
        const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0);
        const totalImpressions = rows.reduce((sum, r) => sum + r.impressions, 0);
        return {
          domain: displayName,
          startDate: fmt(start),
          endDate: fmt(end),
          rows: rows.map((r) => ({date: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position})),
          totals: {
            clicks: totalClicks,
            impressions: totalImpressions,
            ctr: totalImpressions ? totalClicks / totalImpressions : 0,
            position: rows.length ? rows.reduce((sum, r) => sum + r.position * r.impressions, 0) / (totalImpressions || 1) : 0,
          },
        };
      } catch (err) {
        console.error("getSearchConsoleTraffic error:", err.response?.data || err.message);
        throw new HttpsError("internal", "Failed to fetch traffic data.");
      }
    },
);

// verifyDomainForSearchConsole registers a property (sites.add/webResource)
// but nothing ever removed one — deleting an account or disconnecting a
// custom domain left its Search Console property registered under the
// platform's Google account forever, with no way for the customer to remove
// it themselves (it's the platform's own Google account that owns it, not
// theirs). resetDomainConnection (below) already deleted the *local*
// barbers/{uid}/private/searchConsole tracking doc on disconnect, which gave
// the impression of cleanup without ever actually releasing the property on
// Google's side. Best-effort: a property that's already gone, or a token/API
// failure, must never block account deletion or a domain disconnect.
async function releaseSearchConsoleProperty(barberData) {
  const domain = barberData?.customDomain;
  const bookingSlug = barberData?.bookingSlug;
  if (!domain && !bookingSlug) return {removed: false, reason: "no_property"};

  const siteUrl = domain ? `sc-domain:${domain}` : `https://bookrightly.co.uk/${bookingSlug}`;

  try {
    const accessToken = await getAdminAccessToken();
    await axios.delete(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}`,
        {headers: {"Authorization": `Bearer ${accessToken}`}},
    );
    return {removed: true};
  } catch (err) {
    // 404 means it's already gone — not an error from the caller's POV.
    if (err.response?.status === 404) return {removed: true};
    console.error("releaseSearchConsoleProperty error:", err.response?.data || err.message);
    return {removed: false, reason: "api_error"};
  }
}

// Callable wrapper — used from account deletion, where the barber doc is
// about to be deleted client-side and there's no other server-side hook to
// run cleanup from.
exports.removeSearchConsoleProperty = onCall(
    {secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
      const barber = (await admin.firestore().collection("barbers").doc(request.auth.uid).get()).data();
      return releaseSearchConsoleProperty(barber);
    },
);

// ── Bookrightly booking-link slugs (bookrightly.co.uk/{slug}) ────────────────
// Mirrors src/utils/bookingSlug.js — Cloud Functions can't import Vite src/
// modules directly. Keep both in sync if this list/logic ever changes.
const RESERVED_SLUGS = new Set([
  "shop", "pt-booking", "decorator", "hairdresser", "plumber", "barber", "book",
  "confirmation", "auth", "review", "login", "signup", "cancel-booking",
  "website-design", "compare", "fresha-alternative", "treatwell-alternative",
  "booking-software", "pricing", "how-it-works", "blog", "tools", "terms",
  "privacy", "contact", "workout", "food-diary", "check-in", "par-q",
  "colour-approval", "quote-view", "queue", "food-generator", "client-portal",
  "pt-book", "onboarding", "dashboard", "starter-pack",
  "admin", "api", "account", "settings", "support", "help", "about",
  "bookrightly", "www", "register", "sitemap.xml", "robots.txt",
]);

function sanitizeSlug(raw) {
  return String(raw || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "");
}

function isValidSlugFormat(slug) {
  return /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/.test(slug) && slug.length >= 3 && slug.length <= 30;
}

// Releases whatever Cloudflare resources are tied to the caller's own custom
// domain, called by deleteBarberAccountData before it wipes the account.
// Without this, deleting an account left its domain connection dangling
// forever: a full-delegation zone (connectDomainAuto) keeps its Worker
// routing and DNS alive indefinitely with nothing in Firestore pointing to
// it anymore, and a CNAME-method custom_hostname record on the platform's
// own zone sits there unused. Neither is a security problem (the domain just
// falls back to showing the generic marketplace once unclaimed), but it's a
// real resource leak an owner has no way to clean up themselves. Read
// server-side via the caller's own uid rather than trusting anything from
// the client, matching every other domain-touching function here.
// Shared Cloudflare-side cleanup for whichever domain-connect method the
// caller used — deletes the delegated zone (auto method, which takes its
// DNS, Worker custom domain attachment and certificate with it in one step)
// or the custom_hostname records on the platform's shared zone (manual/
// CNAME method). Doesn't touch Firestore — callers decide what to do there.
async function releaseDomainResources(data) {
  const domain = data.customDomain;
  if (!domain) return;
  if (data.connectMethod === "delegation" && data.cfZoneId) {
    await axios.delete(
        `${CF_API}/zones/${data.cfZoneId}`,
        {headers: cfAuthHeaders()},
    ).catch(() => {});
  } else {
    for (const host of [domain, `www.${domain}`]) {
      const existing = await axios.get(
          `${CF_API}/zones/${CF_ZONE_ID.value()}/custom_hostnames?hostname=${encodeURIComponent(host)}`,
          {headers: cfAuthHeaders()},
      ).catch(() => null);
      for (const h of (existing?.data?.result || [])) {
        await axios.delete(
            `${CF_API}/zones/${CF_ZONE_ID.value()}/custom_hostnames/${h.id}`,
            {headers: cfAuthHeaders()},
        ).catch(() => {});
      }
    }
  }
}

exports.releaseCustomDomain = onCall(
    {secrets: [CF_API_TOKEN, CF_ZONE_ID, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
      const ref = admin.firestore().collection("barbers").doc(request.auth.uid);

      // Runs unconditionally (not just when a domain is connected) since this
      // is also the step account deletion calls to clean up everything
      // domain-related before wiping the doc — a subcollection like this one
      // isn't deleted automatically just because its parent doc is, and
      // there's no client-side rule letting the owner delete it themselves.
      await ref.collection("private").doc("searchConsole").delete().catch(() => {});

      const snap = await ref.get();
      if (!snap.exists) return {released: false};
      const data = snap.data();

      // Releases the account's Search Console property (custom domain or
      // bookrightly.co.uk/{slug}) regardless of whether a custom domain is
      // connected — deleting the Firestore doc's own record of it (just
      // above) never actually removed it from Google's side, leaving it
      // registered under the platform's Google account forever with no way
      // for the customer to remove it themselves.
      await releaseSearchConsoleProperty(data).catch((e) =>
        console.error("releaseCustomDomain search console cleanup error:", e.message));

      // Uniqueness for bookrightly.co.uk/{slug} is enforced by a *separate*
      // bookingSlugs/{slug} doc (claimBookingSlug), not the bookingSlug field
      // on this doc — client rules block writing it directly (write: false,
      // only this admin-SDK path can touch it), so deleting the account
      // doc alone never freed it. Deleted outright (not the "released, 7-day
      // reclaim cooldown" pattern claimBookingSlug uses when someone just
      // changes their slug) since there's no still-existing owner here who'd
      // want a window to reclaim it.
      if (data.bookingSlug) {
        await admin.firestore().doc(`bookingSlugs/${data.bookingSlug}`).delete().catch((e) =>
          console.error("releaseCustomDomain slug release error:", e.message));
      }

      // Claiming a staff invite creates a *second*, top-level barbers/{uid}
      // doc for that team member (needed so they get their own individual
      // /barber/{uid} booking page) alongside the barbers/{ownerUid}/
      // staff/{uid} subcollection entry. The client-side deletion flow can
      // only delete that subcollection entry (its own doc's own rules) — a
      // staff member's separate top-level doc, and their separate login,
      // both require this same admin-privileged step to clean up, or they're
      // orphaned forever with a shopId pointing at a now-deleted shop.
      try {
        const staffSnap = await ref.collection("staff").get();
        for (const staffDoc of staffSnap.docs) {
          const staffId = staffDoc.id;
          await admin.firestore().doc(`barbers/${staffId}`).delete().catch((e) =>
            console.error(`releaseCustomDomain staff doc cleanup (${staffId}):`, e.message));
          await admin.auth().deleteUser(staffId).catch((e) => {
            if (e.code !== "auth/user-not-found") {
              console.error(`releaseCustomDomain staff auth cleanup (${staffId}):`, e.message);
            }
          });
        }
      } catch (e) {
        console.error("releaseCustomDomain staff cleanup error:", e.message);
      }

      if (!data.customDomain) return {released: false};

      try {
        await releaseDomainResources(data);
      } catch (e) {
        console.error("releaseCustomDomain error:", e.message);
      }
      return {released: true};
    },
);

// Lets an owner abandon a domain connection they got wrong (e.g. typed the
// wrong TLD, so it can never activate) and start over — without waiting out
// a connection that will never complete, or needing support to fix it by
// hand. Unlike releaseCustomDomain above (only safe to leave Firestore
// untouched there because the whole doc is deleted immediately after by the
// caller), this clears the domain fields on the owner's own doc too, so the
// dashboard resets back to the "connect a domain" form.
exports.resetDomainConnection = onCall(
    {secrets: [CF_API_TOKEN, CF_ZONE_ID, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
      const ref = admin.firestore().collection("barbers").doc(request.auth.uid);
      const snap = await ref.get();
      const data = snap.data();
      if (!data?.customDomain) return {reset: true};

      try {
        await releaseDomainResources(data);
      } catch (e) {
        console.error("resetDomainConnection cleanup error:", e.message);
      }

      // Actually releases the property on Google's side — deleting only the
      // local tracking doc below (as this used to do) just hid the leftover
      // property from our own UI without ever removing it from Search Console.
      await releaseSearchConsoleProperty(data).catch((e) =>
        console.error("resetDomainConnection search console cleanup error:", e.message));

      await ref.update({
        customDomain: admin.firestore.FieldValue.delete(),
        cfZoneId: admin.firestore.FieldValue.delete(),
        nameservers: admin.firestore.FieldValue.delete(),
        connectMethod: admin.firestore.FieldValue.delete(),
        domainStatus: admin.firestore.FieldValue.delete(),
        customHostnameId: admin.firestore.FieldValue.delete(),
        verifiedAt: admin.firestore.FieldValue.delete(),
      });
      await ref.collection("private").doc("searchConsole").delete().catch(() => {});

      return {reset: true};
    },
);

// Finishes claiming an owner-issued staff invite link. The client already
// created its own auth account and its own barbers/{shopId}/staff/{uid} doc
// by this point (both self-writes, fine under firestore.rules). What's left —
// deleting the OLD placeholder doc (barbers/{shopId}/staff/{staffId}, a
// DIFFERENT id than the caller's own uid) and re-pointing any slots the owner
// pre-generated against that placeholder id — can't be expressed as a plain
// per-document ownership rule, since it's one user's auth deleting another
// document's id. Firestore rules used to just allow any authenticated user to
// create/delete ANY staff doc under ANY shop to make this possible client-
// side, which let anyone sabotage another business's team listing. Doing the
// cross-id part here instead (Admin SDK bypasses rules) lets firestore.rules
// go back to a normal ownership check for staff create/delete.
exports.finalizeStaffInviteClaim = onCall({invoker: "public"}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  const uid = request.auth.uid;

  const {shopId, staffId} = request.data || {};
  if (!shopId || !staffId) {
    throw new HttpsError("invalid-argument", "shopId and staffId are required");
  }

  const db = admin.firestore();
  const placeholderRef = db.doc(`barbers/${shopId}/staff/${staffId}`);
  const ownRef = db.doc(`barbers/${shopId}/staff/${uid}`);

  const [placeholderSnap, ownSnap] = await Promise.all([placeholderRef.get(), ownRef.get()]);

  // Only ever deletes a doc the CALLER already has a matching, freshly-created
  // claim for — not an arbitrary staff id — so this can't be used to remove
  // someone else's staff member.
  if (!ownSnap.exists) {
    throw new HttpsError("failed-precondition", "Your staff profile hasn't been created yet.");
  }
  if (placeholderSnap.exists && placeholderSnap.data().hasLogin) {
    throw new HttpsError("already-exists", "This invite has already been claimed.");
  }

  if (placeholderSnap.exists && staffId !== uid) {
    await placeholderRef.delete();
  }

  const slotsSnap = await db.collection("slots").where("barberId", "==", staffId).get();
  if (!slotsSnap.empty) {
    const batch = db.batch();
    slotsSnap.docs.forEach((d) => batch.update(d.ref, {barberId: uid}));
    await batch.commit();
  }

  return {success: true};
});

// Claims (or changes) the caller's booking-link slug. This is the ONLY place
// bookingSlug is ever written — never directly from client updateDoc calls,
// which would bypass uniqueness entirely (barbers/{uid} is owner-writable by
// firestore.rules, same as any other profile field). Race-safe via a
// Firestore transaction against a bookingSlugs/{slug} sentinel doc (Firestore
// has no native unique-constraint mechanism, and a plain query-then-write
// from the client would be racy under concurrent claims of the same slug).
exports.claimBookingSlug = onCall({invoker: "public"}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
  const uid = request.auth.uid;

  const slug = sanitizeSlug(request.data && request.data.slug);
  if (!isValidSlugFormat(slug)) {
    throw new HttpsError("invalid-argument", "Use 3-30 lowercase letters, numbers, or hyphens.");
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new HttpsError("already-exists", "This link is reserved.");
  }

  const db = admin.firestore();
  const slugRef = db.doc(`bookingSlugs/${slug}`);
  const barberRef = db.doc(`barbers/${uid}`);
  const RECLAIM_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  return db.runTransaction(async (tx) => {
    const [slugSnap, barberSnap] = await Promise.all([tx.get(slugRef), tx.get(barberRef)]);
    if (!barberSnap.exists) throw new HttpsError("not-found", "Account not found.");

    if (slugSnap.exists) {
      const data = slugSnap.data();
      const isOwnCurrentSlug = data.barberId === uid;
      const isReleasedLongEnoughAgo = !data.barberId && data.releasedAt &&
        (Date.now() - data.releasedAt.toMillis()) > RECLAIM_COOLDOWN_MS;
      if (!isOwnCurrentSlug && !isReleasedLongEnoughAgo) {
        throw new HttpsError("already-exists", "This link is already taken.");
      }
    }

    const prevSlug = barberSnap.data().bookingSlug;
    if (prevSlug && prevSlug !== slug) {
      tx.set(db.doc(`bookingSlugs/${prevSlug}`), {
        barberId: null,
        releasedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      tx.update(barberRef, {
        previousBookingSlugs: admin.firestore.FieldValue.arrayUnion(prevSlug),
      });
    }

    tx.set(slugRef, {barberId: uid, claimedAt: admin.firestore.FieldValue.serverTimestamp()});
    tx.update(barberRef, {bookingSlug: slug});
    return {slug};
  });
});

// Concierge onboarding — Dean sets up a live account on a prospect's behalf
// (business profile + a working booking link already claimed) instead of
// asking a cold contact to sit through signup + onboarding themselves. Gated
// by ADMIN_ACCESS_KEY rather than request.auth (same pattern as the Google
// OAuth admin routes above) since this is a one-person internal tool, not a
// user-facing feature — no Firebase Auth session is expected to exist yet.
exports.adminCreateAccount = onCall(
    {secrets: [ADMIN_ACCESS_KEY], invoker: "public"},
    async (request) => {
      const {adminKey, businessName, businessType, ownerName, email, phone, plan} = request.data || {};
      if (adminKey !== ADMIN_ACCESS_KEY.value()) {
        throw new HttpsError("permission-denied", "Invalid admin key.");
      }
      if (!businessName || !ownerName || !email) {
        throw new HttpsError("invalid-argument", "businessName, ownerName and email are required.");
      }

      const db = admin.firestore();

      let userRecord;
      try {
        userRecord = await admin.auth().createUser({
          email,
          displayName: ownerName,
          emailVerified: false,
        });
      } catch (err) {
        if (err.code === "auth/email-already-exists") {
          throw new HttpsError("already-exists", "An account with this email already exists.");
        }
        throw new HttpsError("internal", err.message);
      }
      const uid = userRecord.uid;

      // Claim a booking slug from the business name up front, so the account
      // is genuinely live and shareable the moment it's handed over — not
      // something the owner still has to do themselves on first login.
      const baseSlug = sanitizeSlug(businessName) || sanitizeSlug(ownerName) || "business";
      let slug = baseSlug;
      let claimed = false;
      for (let suffix = 1; suffix <= 50 && !claimed; suffix++) {
        const candidate = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`.slice(0, 30);
        const validCandidate = isValidSlugFormat(candidate) && !RESERVED_SLUGS.has(candidate);
        if (!validCandidate) {
          continue;
        }
        const slugSnap = await db.doc(`bookingSlugs/${candidate}`).get();
        if (!slugSnap.exists) {
          slug = candidate;
          claimed = true;
        }
      }
      if (!claimed) {
        slug = `${baseSlug}-${uid.slice(0, 6)}`.slice(0, 30);
      }
      await db.doc(`bookingSlugs/${slug}`).set({
        barberId: uid,
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Mirrors src/firebase/auth.jsx's signUpBarber — same shape as a normal
      // owner signup, so nothing downstream has to special-case this account.
      // Previously collapsed "basic"/"free" (then "mini") down to "full" here
      // — a real bug, since an admin picking Basic or Free from the dropdown
      // above got a Full account instead. Fixed to keep every plan distinct,
      // matching src/config/plans.js.
      const resolvedPlan = ["widget", "basic", "free"].includes(plan) ? plan : "full";
      const isFreePlan = resolvedPlan === "free";
      await db.doc(`barbers/${uid}`).set({
        uid,
        displayName: ownerName,
        name: ownerName,
        email,
        phone: phone || "",
        role: "owner",
        shopId: uid,
        businessType: businessType || "barber",
        businessName,
        services: [],
        photoURL: "",
        brandColor: "#2563EB",
        plan: resolvedPlan,
        // Free has no trial to start — it's free forever from day one.
        subscriptionStatus: isFreePlan ? "free" : "trialing",
        ...(isFreePlan ? {} : {
          trialEndsAt: admin.firestore.Timestamp.fromDate(
              new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          ),
        }),
        bookingSlug: slug,
        marketingOptIn: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        setupByAdmin: true,
      });

      // No password is ever set by this flow — the owner's first action is
      // always to set their own. Using the public Identity Toolkit REST API
      // (same one the client SDK's sendPasswordResetEmail calls, keyed by
      // the project's public Web API key — not a secret, already shipped in
      // the client bundle) instead of admin.auth().generatePasswordResetLink(),
      // which needs the Cloud Function's runtime service account to hold
      // "Service Account Token Creator" on itself (a signBlob permission
      // 2nd-gen functions don't get by default) — unnecessary friction, and
      // Firebase sends its own reset email directly this way, no link to
      // relay through a second email ourselves.
      const FIREBASE_WEB_API_KEY = "AIzaSyAG17iGR4EKlJO2I1L2Yn0S2jGQGBEtSVY";
      await axios.post(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_WEB_API_KEY}`,
          {requestType: "PASSWORD_RESET", email},
      );

      // Routed through the Worker's Resend setup so this sends from a real
      // info@bookrightly.co.uk address instead of Dean's personal Gmail —
      // Resend + the verified sending domain are only configured there.
      // Best-effort: the account is already fully live even if this fails.
      try {
        await axios.post(
            "https://bookrightly.co.uk/api/admin-send-account-email",
            {adminKey, email, businessName, slug},
        );
      } catch (err) {
        console.error("adminCreateAccount: welcome email failed:", err.message);
      }

      return {uid, slug, email};
    },
);

exports.stripeWebhook = onRequest(
    {
      secrets: [
        STRIPE_SECRET, STRIPE_WEBHOOK_SECRET,
        PORKBUN_API_KEY, PORKBUN_SECRET_KEY,
        CF_API_TOKEN, CF_ZONE_ID,
      ],
      consumeAppEngineMiddleware: true,
    },
    async (req, res) => {
      const stripe = new (require("stripe"))(STRIPE_SECRET.value());

      let event;
      try {
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            req.headers["stripe-signature"],
            STRIPE_WEBHOOK_SECRET.value(),
        );
      } catch (err) {
        console.error("stripeWebhook: signature failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Subscription lifecycle — this is the actual registered webhook
      // endpoint (Stripe dashboard config), so the equivalent logic already
      // sitting in src/worker.js's own handleStripeWebhook was never being
      // called for any of this; ported here instead of relying on it.
      if (event.type === "customer.subscription.updated") {
        const sub = event.data.object;
        const barberId = sub.metadata?.barberId;
        if (barberId) {
          try {
            await admin.firestore().collection("barbers").doc(barberId).update({
              subscriptionStatus: sub.status,
            });
            console.log(`stripeWebhook: subscription status -> ${sub.status} for ${barberId}`);
          } catch (err) {
            console.error("stripeWebhook: failed to sync subscription status:", err.message);
          }
        }
        return res.json({received: true});
      }

      if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object;
        const barberId = sub.metadata?.barberId;
        if (barberId) {
          try {
            await admin.firestore().collection("barbers").doc(barberId).update({
              subscriptionStatus: "canceled",
            });
            console.log(`stripeWebhook: subscription canceled for ${barberId}`);
          } catch (err) {
            console.error("stripeWebhook: failed to mark canceled:", err.message);
          }
        }
        return res.json({received: true});
      }

      if (event.type !== "checkout.session.completed") {
        return res.json({received: true});
      }

      const session = event.data.object;
      const meta = session.metadata ?? {};

      if (meta.type === "platform_subscription" && meta.barberId) {
        try {
          await admin.firestore().collection("barbers").doc(meta.barberId).update({
            subscriptionStatus: "active",
            stripeCustomerId: session.customer,
          });
          console.log(`stripeWebhook: subscription activated for ${meta.barberId}`);
        } catch (err) {
          console.error("stripeWebhook: failed to activate subscription:", err.message);
        }
        return res.json({received: true});
      }

      if (meta.type !== "domain_purchase") {
        return res.json({received: true});
      }

      const {domain, barberId} = meta;
      if (!domain || !barberId) {
        console.error("stripeWebhook: missing domain or barberId in metadata");
        return res.json({received: true});
      }

      try {
        const registerRes = await axios.post(
            `${PORKBUN_API}/domain/register/${encodeURIComponent(domain)}`,
            {
              apikey: PORKBUN_API_KEY.value(),
              secretapikey: PORKBUN_SECRET_KEY.value(),
            },
        );

        if (registerRes.data.status !== "SUCCESS") {
          const msg = (registerRes.data.message ?? "").toLowerCase();
          if (!msg.includes("already") && !msg.includes("own")) {
            throw new Error(`Porkbun registration failed: ${JSON.stringify(registerRes.data)}`);
          }
          console.warn("stripeWebhook: domain already registered, continuing.");
        }

        const nsRes = await axios.post(
            `${PORKBUN_API}/domain/updateNameservers/${encodeURIComponent(domain)}`,
            {
              apikey: PORKBUN_API_KEY.value(),
              secretapikey: PORKBUN_SECRET_KEY.value(),
              nameservers: [
                "byron.ns.cloudflare.com",
                "sierra.ns.cloudflare.com",
              ],
            },
        );
        if (nsRes.data.status !== "SUCCESS") {
          console.warn("stripeWebhook: nameserver update warning:", nsRes.data.message);
        }

        const cfRes = await axios.post(
            `${CF_API}/zones/${CF_ZONE_ID.value()}/custom_hostnames`,
            {
              hostname: domain,
              ssl: {
                method: "http",
                type: "dv",
                settings: {min_tls_version: "1.2", http2: "on"},
              },
            },
            {
              headers: cfAuthHeaders({"Content-Type": "application/json"}),
            },
        );

        if (!cfRes.data.success) {
          const errors = cfRes.data.errors ?? [];
          if (!errors.some((e) => e.code === 1406)) {
            throw new Error(`Cloudflare custom hostname error: ${JSON.stringify(errors)}`);
          }
          console.warn("stripeWebhook: custom hostname already exists, continuing.");
        }

        const cfResult = cfRes.data.result ?? {};

        await admin.firestore().collection("barbers").doc(barberId).update({
          customDomain: domain,
          domainStatus: "pending",
          customHostnameId: cfResult.id ?? "registered",
          domainPurchasedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`stripeWebhook: domain ${domain} provisioned for barber ${barberId}`);
      } catch (err) {
        console.error("stripeWebhook: provisioning failed:", err.message);
        return res.json({received: true, error: err.message});
      }

      return res.json({received: true});
    },
);

exports.sendBookingConfirmation = onCall(
    {secrets: [GMAIL_USER, GMAIL_PASS], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const {
        clientEmail, clientName, trainerName,
        businessName, date, time, location,
      } = request.data;

      if (!clientEmail || !date || !time) {
        throw new HttpsError("invalid-argument", "clientEmail, date and time are required");
      }

      const transporter = require("nodemailer").createTransport({
        service: "gmail",
        auth: {user: GMAIL_USER.value(), pass: GMAIL_PASS.value()},
      });

      const dateParts = date.split("-");
      const timeParts = time.split(":");
      const dateFlat = dateParts.join("");
      const startHour = parseInt(timeParts[0], 10);
      const endHour = Math.min(startHour + 1, 23);
      const endMin = endHour === 23 ? "59" : timeParts[1];
      const startDt = `${dateFlat}T${timeParts[0]}${timeParts[1]}00`;
      const endDt = `${dateFlat}T${String(endHour).padStart(2, "0")}${endMin}00`;
      const uid = `${dateFlat}-${timeParts[0]}${timeParts[1]}-${Date.now()}@bookehtrim.co.uk`;

      const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Bookrty//BookingSystem//EN",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTART:${startDt}`,
        `DTEND:${endDt}`,
        `SUMMARY:Session with ${trainerName || "Your Trainer"}`,
        `LOCATION:${location || "TBC"}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      try {
        await transporter.sendMail({
          from: `"${businessName || "Bookrty"}" <${GMAIL_USER.value()}>`,
          to: clientEmail,
          subject: `Booking Confirmed — ${date} at ${time}`,
          html: `<p>Hi ${clientName || "there"},</p><p>Your session with <strong>${trainerName || "your trainer"}</strong> is confirmed.</p><p><strong>Date:</strong> ${date}<br/><strong>Time:</strong> ${time}<br/><strong>Location:</strong> ${location || "TBC"}</p><p>The calendar invite is attached below.</p>`,
          attachments: [{
            filename: "session.ics",
            content: icsContent,
            contentType: "text/calendar",
          }],
        });

        return {sent: true};
      } catch (error) {
        console.error("sendBookingConfirmation error:", error.message);
        throw new HttpsError("internal", "Failed to send confirmation email.");
      }
    },
);

exports.createStripeInvoice = onCall(
    {secrets: [STRIPE_SECRET], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const {clientName, clientEmail, amount, description} = request.data;
      if (!clientEmail || !amount || !description) {
        throw new HttpsError("invalid-argument", "clientEmail, amount and description are required");
      }

      const stripe = new (require("stripe"))(STRIPE_SECRET.value());

      // Route the invoice through the barber's own Stripe Connect account so
      // the money lands in their account. No platform fee — mirrors
      // src/utils/bookingHelpers.jsx's PLATFORM_FEE_PERCENT (set to 0, keep
      // in sync): "no commission, ever" is the actual pricing model now, not
      // just marketing copy.
      const barberSnap = await admin.firestore()
          .collection("barbers").doc(request.auth.uid).get();
      const stripeAccountId = barberSnap.data()?.stripeAccountId;

      if (!stripeAccountId) {
        throw new HttpsError(
            "failed-precondition",
            "Connect your Stripe account in the Finance tab before sending invoices.",
        );
      }

      const connectOpts = {stripeAccount: stripeAccountId};
      const amountPence = Math.round(amount * 100);
      const platformFee = 0;

      try {
        // Customer must exist on the connected account, not the platform account
        const existing = await stripe.customers.list(
            {email: clientEmail, limit: 1}, connectOpts,
        );
        const customer = existing.data.length > 0 ?
          existing.data[0] :
          await stripe.customers.create(
              {email: clientEmail, name: clientName || clientEmail}, connectOpts,
          );

        // Create the invoice on the connected account with the platform fee
        const invoice = await stripe.invoices.create({
          customer: customer.id,
          collection_method: "send_invoice",
          days_until_due: 7,
          application_fee_amount: platformFee,
        }, connectOpts);

        await stripe.invoiceItems.create({
          customer: customer.id,
          invoice: invoice.id,
          amount: amountPence,
          currency: "gbp",
          description,
        }, connectOpts);

        const finalized = await stripe.invoices.finalizeInvoice(
            invoice.id, {}, connectOpts,
        );
        await stripe.invoices.sendInvoice(invoice.id, {}, connectOpts);

        return {success: true, invoiceUrl: finalized.hosted_invoice_url};
      } catch (error) {
        console.error("createStripeInvoice error:", error.message);
        throw new HttpsError("internal", "Failed to create invoice: " + error.message);
      }
    },
);

// ── Trial expiry — DISABLED as of the Free-plan restructure ──────────────────
// This used to flip subscriptionStatus to "past_due" on trial end, which
// took the public site offline (see App.jsx's isTenantOffline) until the
// business subscribed. Bookrightly no longer locks anyone out on trial end —
// src/worker.js's handleTrialLifecycle (run from the Worker's own daily cron,
// alongside booking reminders) now downgrades an unconverted trial to the
// Free plan instead, keeping the page live. Left in place, disabled, rather
// than deleted, so the history and reasoning stay visible; safe to remove
// entirely in a future cleanup once the new path has been running a while.
exports.checkTrialExpiry = onSchedule(
    {schedule: "every 24 hours", timeZone: "UTC", secrets: []},
    async () => {
      console.log("checkTrialExpiry: disabled — trial-end handling now lives in src/worker.js's handleTrialLifecycle");
    },
);
