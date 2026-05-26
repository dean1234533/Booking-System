"use strict";

const {onCall, HttpsError, onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");

admin.initializeApp();

// ── Secrets ───────────────────────────────────────────────────────────────────
const CF_API_TOKEN = defineSecret("API_TOKEN");
const CF_ZONE_ID = defineSecret("ZONE_ID");
const STRIPE_SECRET = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_PASS = defineSecret("GMAIL_PASS");
const PORKBUN_API_KEY = defineSecret("PORKBUN_API_KEY");
const PORKBUN_SECRET_KEY = defineSecret("PORKBUN_SECRET_KEY");

// ── Constants ─────────────────────────────────────────────────────────────────
const CF_API = "https://api.cloudflare.com/client/v4";
const PORKBUN_API = "https://api.porkbun.com/api/json/v3";
const APP_ORIGIN = "https://bookehtrim.co.uk";

const SUPPORTED_TLDS = ["com", "co.uk", "uk", "net", "org", "io", "shop", "store"];
const USD_TO_GBP = 0.79;
const PLATFORM_MARKUP = 5; // £5 platform fee on top of registration cost

// Hardcoded fallback prices (USD) used when the Porkbun pricing endpoint is down
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

// ── Shared helpers ────────────────────────────────────────────────────────────

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

// ── 1. Check domain availability ──────────────────────────────────────────────
//
//  Uses Cloudflare's public DNS-over-HTTPS (1.1.1.1) to check whether the
//  domain resolves.  NXDOMAIN (Status === 3) means no one owns it → available.
//  This requires zero API keys and is identical to the approach in worker.js,
//  so it will never produce a 403.
//
//  Pricing comes from Porkbun's public /pricing/get endpoint (no auth required).
//  If that endpoint is unreachable we fall back to the hardcoded table above.
//
exports.checkDomain = onCall(
    {secrets: []}, // No secrets — DNS-over-HTTPS + public pricing endpoint
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
      // ── Availability: DNS-over-HTTPS ─────────────────────────────────────
      // Status 3 = NXDOMAIN — domain has no DNS records, so it's available.
        const dnsRes = await axios.get(
            `https://1.1.1.1/dns-query?name=${encodeURIComponent(clean)}&type=SOA`,
            {headers: {Accept: "application/dns-json"}},
        );
        const available = dnsRes.data.Status === 3;

        // ── Pricing: Porkbun public endpoint, fallback to table ──────────────
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

// ── 2. Create Stripe checkout for domain purchase ─────────────────────────────
exports.createDomainCheckout = onCall(
    {secrets: [STRIPE_SECRET]},
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
          // NOTE: metadata type must match the check inside stripeWebhook below
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

// ── 3. Connect a domain the barber already owns ───────────────────────────────
exports.addCustomDomain = onCall(
    {secrets: [CF_API_TOKEN, CF_ZONE_ID]},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const {domain} = request.data;
      if (!domain) throw new HttpsError("invalid-argument", "domain is required");

      const clean = cleanDomain(domain);
      if (!isValidDomain(clean)) {
        throw new HttpsError("invalid-argument", "Invalid domain format");
      }

      try {
        const response = await axios.post(
            `${CF_API}/zones/${CF_ZONE_ID.value()}/custom_hostnames`,
            {
              hostname: clean,
              ssl: {
                method: "http", // HTTP-01 challenge — works immediately after DNS propagates
                type: "dv",
                settings: {min_tls_version: "1.2", http2: "on"},
              },
            },
            {headers: {"Authorization": `Bearer ${CF_API_TOKEN.value()}`, "Content-Type": "application/json"}},
        );

        const result = response.data.result;

        await admin.firestore().collection("barbers").doc(request.auth.uid).update({
          customDomain: result.hostname,
          domainStatus: "pending",
          customHostnameId: result.id,
        });

        return {
          cfHostnameId: result.id,
          domain: result.hostname,
          dnsRecords: [
            {
              type: "CNAME",
              name: "@",
              value: "fallback.bookehtrim.co.uk",
              ttl: "Auto",
              description: "Points your domain to our servers",
            },
            {
              type: "CNAME",
              name: "www",
              value: "fallback.bookehtrim.co.uk",
              ttl: "Auto",
              description: "Points www to our servers",
            },
          ],
        };
      } catch (error) {
        const detail = error.response?.data || error.message;
        console.error("addCustomDomain error:", detail);

        // Cloudflare returns code 1406 when the hostname already exists on the zone
        const errors = error.response?.data?.errors ?? [];
        if (errors.some((e) => e.code === 1406)) {
          throw new HttpsError("already-exists", "This domain is already connected to our platform.");
        }

        throw new HttpsError("internal", "Failed to connect domain.");
      }
    },
);

// ── 4. Poll domain + SSL verification status ──────────────────────────────────
exports.checkDomainStatus = onCall(
    {secrets: [CF_API_TOKEN, CF_ZONE_ID]},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const {cfHostnameId} = request.data;
      if (!cfHostnameId) throw new HttpsError("invalid-argument", "cfHostnameId is required");

      try {
        const response = await axios.get(
            `${CF_API}/zones/${CF_ZONE_ID.value()}/custom_hostnames/${cfHostnameId}`,
            {headers: {Authorization: `Bearer ${CF_API_TOKEN.value()}`}},
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

// ── 5. Stripe webhook ─────────────────────────────────────────────────────────
//
//  Flow on successful domain_purchase payment:
//    1. Register domain via Porkbun  (/domain/register/{domain})
//    2. Point nameservers at Cloudflare
//    3. Add Custom Hostname (SSL for SaaS) on your zone
//    4. Update barber's Firestore doc
//
exports.stripeWebhook = onRequest(
    {
      secrets: [
        STRIPE_SECRET, STRIPE_WEBHOOK_SECRET,
        PORKBUN_API_KEY, PORKBUN_SECRET_KEY,
        CF_API_TOKEN, CF_ZONE_ID,
      ],
      // consumeAppEngineMiddleware keeps req.rawBody intact for signature verification
      consumeAppEngineMiddleware: true,
    },
    async (req, res) => {
      const stripe = new Stripe(STRIPE_SECRET.value());

      // ── Signature verification ───────────────────────────────────────────────
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

      // Only handle completed checkout sessions
      if (event.type !== "checkout.session.completed") {
        return res.json({received: true});
      }

      const session = event.data.object;
      const meta = session.metadata ?? {};

      // Only handle domain purchases (matches type set in createDomainCheckout)
      if (meta.type !== "domain_purchase") {
        return res.json({received: true});
      }

      const {domain, barberId} = meta;
      if (!domain || !barberId) {
        console.error("stripeWebhook: missing domain or barberId in metadata");
        return res.json({received: true});
      }

      try {
      // ── Step 1: Register domain via Porkbun ──────────────────────────────
        const registerRes = await axios.post(
            `${PORKBUN_API}/domain/register/${encodeURIComponent(domain)}`,
            {
              apikey: PORKBUN_API_KEY.value(),
              secretapikey: PORKBUN_SECRET_KEY.value(),
            },
        );

        if (registerRes.data.status !== "SUCCESS") {
        // If Porkbun says the domain is already registered, continue — it may
        // have succeeded on a previous webhook delivery attempt.
          const msg = (registerRes.data.message ?? "").toLowerCase();
          if (!msg.includes("already") && !msg.includes("own")) {
            throw new Error(`Porkbun registration failed: ${JSON.stringify(registerRes.data)}`);
          }
          console.warn("stripeWebhook: domain already registered, continuing.");
        }

        // ── Step 2: Point nameservers at Cloudflare ──────────────────────────
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

        // ── Step 3: Add Custom Hostname (SSL for SaaS) ───────────────────────
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
              headers: {
                "Authorization": `Bearer ${CF_API_TOKEN.value()}`,
                "Content-Type": "application/json",
              },
            },
        );

        if (!cfRes.data.success) {
        // Code 1406 = hostname already exists on zone — safe to continue
          const errors = cfRes.data.errors ?? [];
          if (!errors.some((e) => e.code === 1406)) {
            throw new Error(`Cloudflare custom hostname error: ${JSON.stringify(errors)}`);
          }
          console.warn("stripeWebhook: custom hostname already exists, continuing.");
        }

        const cfResult = cfRes.data.result ?? {};

        // ── Step 4: Update Firestore ──────────────────────────────────────────
        await admin.firestore().collection("barbers").doc(barberId).update({
          customDomain: domain,
          domainStatus: "pending",
          customHostnameId: cfResult.id ?? "registered",
          domainPurchasedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`stripeWebhook: domain ${domain} provisioned for barber ${barberId}`);
      } catch (err) {
        console.error("stripeWebhook: provisioning failed:", err.message);
        // Return 200 anyway — Stripe will retry on 4xx/5xx, causing duplicate registrations
        return res.json({received: true, error: err.message});
      }

      return res.json({received: true});
    },
);

// ── 6. Send booking confirmation email ────────────────────────────────────────
exports.sendBookingConfirmation = onCall(
    {secrets: [GMAIL_USER, GMAIL_PASS]},
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

      // Build iCal attachment
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
        "PRODID:-//BookehTrim//BookingSystem//EN",
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
          from: `"${businessName || "BookehTrim"}" <${GMAIL_USER.value()}>`,
          to: clientEmail,
          subject: `Booking Confirmed — ${date} at ${time}`,
          html: `
          <p>Hi ${clientName || "there"},</p>
          <p>Your session with <strong>${trainerName || "your trainer"}</strong> is confirmed.</p>
          <p><strong>Date:</strong> ${date}<br/>
             <strong>Time:</strong> ${time}<br/>
             <strong>Location:</strong> ${location || "TBC"}</p>
          <p>The calendar invite is attached below.</p>
        `,
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

// ── 7. Generate and send Stripe invoice ───────────────────────────────────────
exports.createStripeInvoice = onCall(
    {secrets: [STRIPE_SECRET]},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const {clientName, clientEmail, amount, description} = request.data;
      if (!clientEmail || !amount || !description) {
        throw new HttpsError("invalid-argument", "clientEmail, amount and description are required");
      }

      const stripe = new Stripe(STRIPE_SECRET.value());

      try {
      // Re-use existing Stripe customer or create one
        const existing = await stripe.customers.list({email: clientEmail, limit: 1});
        const customer = existing.data.length > 0 ?
        existing.data[0] :
        await stripe.customers.create({email: clientEmail, name: clientName});

        const invoice = await stripe.invoices.create({
          customer: customer.id,
          collection_method: "send_invoice",
          days_until_due: 7,
        });

        await stripe.invoiceItems.create({
          customer: customer.id,
          invoice: invoice.id,
          amount: Math.round(amount * 100), // pence
          currency: "gbp",
          description,
        });

        const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
        await stripe.invoices.sendInvoice(invoice.id);

        return {success: true, invoiceUrl: finalized.hosted_invoice_url};
      } catch (error) {
        console.error("createStripeInvoice error:", error.message);
        throw new HttpsError("internal", "Failed to create invoice.");
      }
    },
);
