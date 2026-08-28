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

const CF_API = "https://api.cloudflare.com/client/v4";
const PORKBUN_API = "https://api.porkbun.com/api/json/v3";
const APP_ORIGIN = "https://bookrightly.co.uk";
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
  "pt-book", "onboarding", "dashboard",
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
exports.releaseCustomDomain = onCall(
    {secrets: [CF_API_TOKEN, CF_ZONE_ID], invoker: "public"},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
      const uid = request.auth.uid;

      const snap = await admin.firestore().collection("barbers").doc(uid).get();
      if (!snap.exists) return {released: false};
      const data = snap.data();
      const domain = data.customDomain;
      if (!domain) return {released: false};

      try {
        if (data.connectMethod === "delegation" && data.cfZoneId) {
          // Deleting the zone takes its DNS, Worker custom domain
          // attachment and certificates with it in one step.
          await axios.delete(
              `${CF_API}/zones/${data.cfZoneId}`,
              {headers: cfAuthHeaders()},
          ).catch(() => {});
        } else {
          // CNAME method — a custom_hostname record on the platform's own
          // shared zone, not a dedicated zone of its own.
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
      } catch (e) {
        console.error("releaseCustomDomain error:", e.message);
      }
      return {released: true};
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

// ── Trial expiry — runs daily at 02:00 UTC ────────────────────────────────────
// Finds any barber whose 30-day trial has ended and flips subscriptionStatus
// from "trialing" to "past_due", which takes their public site offline until
// they subscribe.
exports.checkTrialExpiry = onSchedule(
    {schedule: "every 24 hours", timeZone: "UTC", secrets: []},
    async () => {
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();

      const snap = await db
          .collection("barbers")
          .where("subscriptionStatus", "==", "trialing")
          .where("trialEndsAt", "<=", now)
          .get();

      if (snap.empty) {
        console.log("checkTrialExpiry: no expired trials found");
        return;
      }

      const batch = db.batch();
      snap.docs.forEach((doc) => {
        batch.update(doc.ref, {subscriptionStatus: "past_due"});
      });
      await batch.commit();

      console.log(`checkTrialExpiry: flipped ${snap.size} trial(s) to past_due`);
    },
);
