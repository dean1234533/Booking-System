const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");
const Stripe = require("stripe");

admin.initializeApp();

const CF_API_TOKEN = defineSecret("API_TOKEN");
const CF_ZONE_ID = defineSecret("ZONE_ID");
const CF_ACCOUNT_ID = defineSecret("ACCOUNT_ID");
const STRIPE_SECRET = defineSecret("STRIPE_SECRET_KEY");

const CF_API = "https://api.cloudflare.com/client/v4";

const SUPPORTED_TLDS = [
  "com", "co.uk", "uk", "net", "org", "io", "shop", "store",
];

const USD_TO_GBP = 0.79;
const PLATFORM_MARKUP = 5;

function extractTLD(domain) {
  const parts = domain.split(".");
  if (parts.length >= 3) return parts.slice(-2).join(".");
  return parts.slice(-1)[0];
}

function isValidDomain(domain) {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/i.test(domain);
}

// ── 1. Check domain availability ─────────────────────────────────────────────
exports.checkDomain = onCall(
    {secrets: [CF_API_TOKEN, CF_ACCOUNT_ID]},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Login required");
      }

      const {domain} = request.data;
      if (!domain) {
        throw new HttpsError("invalid-argument", "domain is required");
      }

      const clean = domain.toLowerCase().trim()
          .replace(/^https?:\/\//, "").replace(/\/$/, "");

      if (!isValidDomain(clean)) {
        throw new HttpsError("invalid-argument", "Invalid domain format");
      }

      const tld = extractTLD(clean);
      if (!SUPPORTED_TLDS.includes(tld)) {
        throw new HttpsError(
            "invalid-argument",
            `Unsupported TLD: .${tld}`,
        );
      }

      const accountId = CF_ACCOUNT_ID.value();
      const token = CF_API_TOKEN.value();

      const cfRes = await axios.get(
          `${CF_API}/accounts/${accountId}/registrar/domains/${clean}/availability`,
          {headers: {Authorization: `Bearer ${token}`}},
      );

      const result = cfRes.data.result ?? {};
      const priceUsd = result.price ?? null;
      const priceGbp = priceUsd ?
        Math.round((priceUsd * USD_TO_GBP + PLATFORM_MARKUP) * 100) / 100 :
        null;

      return {
        domain: clean,
        available: result.available ?? false,
        price: priceGbp,
        priceUsd: priceUsd,
        currency: "GBP",
      };
    },
);

// ── 2. Create Stripe checkout for domain purchase ─────────────────────────────
exports.createDomainCheckout = onCall(
    {secrets: [STRIPE_SECRET]},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Login required");
      }

      const {domain, barberId, priceUsd} = request.data;

      if (!domain || !barberId || !priceUsd) {
        throw new HttpsError(
            "invalid-argument",
            "domain, barberId and priceUsd are required",
        );
      }

      const stripe = new Stripe(STRIPE_SECRET.value());
      const priceGbp = priceUsd * USD_TO_GBP + PLATFORM_MARKUP;
      const pricePence = Math.round(priceGbp * 100);
      const origin = "https://fallback.bookehtrim.co.uk"; // ← replace with your domain

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "gbp",
              unit_amount: pricePence,
              product_data: {
                name: `Custom Domain: ${domain}`,
                description: `1-year registration for ${domain}`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          type: "domain_purchase",
          domain,
          barberId,
          priceUsd: String(priceUsd),
        },
        success_url: `${origin}/dashboard?domainSuccess=true` +
          `&domain=${encodeURIComponent(domain)}`,
        cancel_url: `${origin}/dashboard?domainCancelled=true`,
      });

      return {url: session.url, sessionId: session.id};
    },
);

// ── 3. Connect a domain the barber already owns ───────────────────────────────
exports.addCustomDomain = onCall(
    {secrets: [CF_API_TOKEN, CF_ZONE_ID]},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Login required");
      }

      const {domain} = request.data;
      if (!domain) {
        throw new HttpsError("invalid-argument", "domain is required");
      }

      const zoneId = CF_ZONE_ID.value();
      const token = CF_API_TOKEN.value();

      const response = await axios.post(
          `${CF_API}/zones/${zoneId}/custom_hostnames`,
          {
            hostname: domain,
            ssl: {
              method: "txt",
              type: "dv",
              settings: {min_tls_version: "1.2"},
            },
          },
          {headers: {Authorization: `Bearer ${token}`}},
      );

      const result = response.data.result;
      const cfId = result.id;
      const hostname = result.hostname;
      const ownershipName = result.ownership_verification.name;
      const ownershipVal = result.ownership_verification.value;

      await admin
          .firestore()
          .collection("barbers")
          .doc(request.auth.uid)
          .update({
            customDomain: hostname,
            domainStatus: "pending",
            customHostnameId: cfId,
          });

      return {
        cfHostnameId: cfId,
        domain: hostname,
        dnsRecords: [
          {
            type: "CNAME",
            name: hostname,
            value: "fallback.bookehtrim.co.uk", // ← replace with your CF proxied domain
            ttl: "Auto",
            description: "Points your domain to our servers",
          },
          {
            type: "TXT",
            name: ownershipName,
            value: ownershipVal,
            ttl: "Auto",
            description: "Proves you own this domain",
          },
        ],
      };
    },
);

// ── 4. Poll domain + SSL verification status ──────────────────────────────────
exports.checkDomainStatus = onCall(
    {secrets: [CF_API_TOKEN, CF_ZONE_ID]},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Login required");
      }

      const {cfHostnameId} = request.data;
      const zoneId = CF_ZONE_ID.value();
      const token = CF_API_TOKEN.value();

      const response = await axios.get(
          `${CF_API}/zones/${zoneId}/custom_hostnames/${cfHostnameId}`,
          {headers: {Authorization: `Bearer ${token}`}},
      );

      const {status, ssl} = response.data.result;
      const isVerified = status === "active";
      const sslStatus = ssl ? ssl.status : null;
      const sslReady = sslStatus === "active";

      if (isVerified && sslReady) {
        await admin
            .firestore()
            .collection("barbers")
            .doc(request.auth.uid)
            .update({
              domainStatus: "active",
              verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
      }

      return {
        domainStatus: status,
        sslStatus: sslStatus,
        isVerified: isVerified,
        sslReady: sslReady,
        isLive: isVerified && sslReady,
      };
    },
);

// ── 5. Stripe webhook — provision domain after payment ────────────────────────
exports.stripeWebhook = require("firebase-functions/v2/https").onRequest(
    {secrets: [STRIPE_SECRET, CF_API_TOKEN, CF_ZONE_ID, CF_ACCOUNT_ID]},
    async (req, res) => {
      const stripe = new Stripe(STRIPE_SECRET.value());
      const sig = req.headers["stripe-signature"];

      let event;
      try {
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET,
        );
      } catch (err) {
        console.error("Webhook signature failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      if (event.type !== "checkout.session.completed") {
        return res.json({received: true});
      }

      const session = event.data.object;
      const meta = session.metadata ?? {};

      if (meta.type !== "domain_purchase") {
        return res.json({received: true});
      }

      const {domain, barberId} = meta;
      const zoneId = CF_ZONE_ID.value();
      const token = CF_API_TOKEN.value();

      try {
        // Register the custom hostname on Cloudflare
        const cfRes = await axios.post(
            `${CF_API}/zones/${zoneId}/custom_hostnames`,
            {
              hostname: domain,
              ssl: {
                method: "txt",
                type: "dv",
                settings: {min_tls_version: "1.2"},
              },
            },
            {headers: {Authorization: `Bearer ${token}`}},
        );

        const result = cfRes.data.result;
        const ownershipName = result.ownership_verification.name;
        const ownershipVal = result.ownership_verification.value;

        await admin.firestore().collection("barbers").doc(barberId).update({
          customDomain: domain,
          domainStatus: "pending",
          customHostnameId: result.id,
          dnsRecords: [
            {type: "CNAME", name: domain, value: "fallback.bookehtrim.co.uk"},
            {type: "TXT", name: ownershipName, value: ownershipVal},
          ],
        });

        console.log(`Domain ${domain} provisioned for barber ${barberId}`);
      } catch (err) {
        console.error("Domain provisioning failed:", err.message);
      }

      return res.json({received: true});
    },
);

