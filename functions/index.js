"use strict";

const {onCall, HttpsError, onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");

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
const APP_ORIGIN = "https://bookehtrim.co.uk";

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

        let priceUsd = FALLBACK_PRICES_USD[tld] ?? 12.00;
        try {
          const pricingRes = await axios.get("https://porkbun.com/api/json/v3/pricing/get");
          const pricing = pricingRes.data.pricing ?? {};
          const normalizedTld = tld.replace(/^\./, "");
          if (pricing[normalizedTld]?.registration) {
            priceUsd = parseFloat(pricing[normalizedTld].registration);
          }
        } catch (pricingErr) {
          console.warn("checkDomain: pricing fetch failed, using fallback:", pricingErr.message);
        }

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

      const {domain, barberId, priceUsd} = request.data;
      if (!domain || !barberId || !priceUsd) {
        throw new HttpsError("invalid-argument", "domain, barberId and priceUsd are required");
      }

      const stripe = new Stripe(STRIPE_SECRET.value());
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
                name: `Custom Domain: ${domain}`,
                description: `1-year registration for ${domain}`,
              },
            },
            quantity: 1,
          }],
          metadata: {
            type: "domain_purchase",
            domain,
            barberId,
            priceUsd: String(priceUsd),
          },
          success_url: `${APP_ORIGIN}/dashboard?domainSuccess=true&domain=${encodeURIComponent(domain)}`,
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

      // Strip www. prefix — we always store the bare domain
      const clean = cleanDomain(domain).replace(/^www\./, "");
      if (!isValidDomain(clean)) {
        throw new HttpsError("invalid-argument", "Invalid domain format");
      }

      // DNS records to return — works for GoDaddy and all standard registrars:
      // A records on @ (root) are universally supported; CNAME on www is also fine.
      // Cloudflare IPs resolved from fallback.bookehtrim.co.uk (Cloudflare anycast).
      const DNS_RECORDS = [
        {type: "A", name: "@", value: "104.21.47.154", ttl: "Auto", description: "Root domain — Cloudflare IP (add both A records)"},
        {type: "A", name: "@", value: "172.67.148.220", ttl: "Auto", description: "Root domain — Cloudflare IP (add both A records)"},
        {type: "CNAME", name: "www", value: "fallback.bookehtrim.co.uk", ttl: "Auto", description: "www subdomain"},
      ];

      try {
        // Register the bare domain as a Cloudflare custom hostname using TXT (DNS)
        // validation. TXT validation proves domain control via a DNS record and does
        // NOT depend on the Worker serving an HTTP /.well-known/acme-challenge path —
        // so SSL issues reliably regardless of routing.
        const response = await axios.post(
            `${CF_API}/zones/${CF_ZONE_ID.value()}/custom_hostnames`,
            {
              hostname: clean,
              ssl: {
                method: "txt",
                type: "dv",
                settings: {min_tls_version: "1.2", http2: "on"},
              },
            },
            {headers: cfAuthHeaders({"Content-Type": "application/json"})},
        );

        const result = response.data.result;

        // The TXT validation record is generated asynchronously — poll briefly for it.
        let txtRecord = null;
        for (let i = 0; i < 5; i++) {
          const vr = (result.ssl?.validation_records || [])[0];
          if (vr?.txt_name && vr?.txt_value) {
            txtRecord = {
              type: "TXT",
              name: vr.txt_name,
              value: vr.txt_value,
              description: "SSL validation — add this to activate HTTPS (can be removed once active)",
            };
            break;
          }
          await new Promise((r) => setTimeout(r, 1500));
          const detail = await axios.get(
              `${CF_API}/zones/${CF_ZONE_ID.value()}/custom_hostnames/${result.id}`,
              {headers: cfAuthHeaders()},
          );
          result.ssl = detail.data.result?.ssl || result.ssl;
        }

        // Save the bare domain — getBarberByDomain strips www before querying
        await admin.firestore().collection("barbers").doc(request.auth.uid).update({
          customDomain: clean,
          domainStatus: "pending",
          customHostnameId: result.id,
        });

        // Show the TXT validation record first, then the A/CNAME records that route traffic.
        const records = txtRecord ? [txtRecord, ...DNS_RECORDS] : DNS_RECORDS;
        return {cfHostnameId: result.id, domain: clean, dnsRecords: records};
      } catch (error) {
        const detail = error.response?.data || error.message;
        console.error("addCustomDomain error:", detail);

        const errors = error.response?.data?.errors ?? [];
        if (errors.some((e) => e.code === 1406)) {
          // Already registered with Cloudflare — update Firestore and return DNS instructions
          await admin.firestore().collection("barbers").doc(request.auth.uid).update({
            customDomain: clean,
            domainStatus: "pending",
          });
          return {
            domain: clean,
            dnsRecords: DNS_RECORDS,
          };
        }

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
      const stripe = new Stripe(STRIPE_SECRET.value());

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

      if (event.type !== "checkout.session.completed") {
        return res.json({received: true});
      }

      const session = event.data.object;
      const meta = session.metadata ?? {};

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

      const transporter = nodemailer.createTransport({
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

      const stripe = new Stripe(STRIPE_SECRET.value());

      // Route the invoice through the barber's own Stripe Connect account so
      // the money lands in their account. The platform takes 2.5% as an
      // application fee, consistent with online booking payments.
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
      const platformFee = Math.round(amountPence * 0.025); // 2.5%

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
