const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");

admin.initializeApp();

const CF_API_TOKEN = defineSecret("API_TOKEN");
const CF_ZONE_ID = defineSecret("ZONE_ID");
const STRIPE_SECRET = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_PASS = defineSecret("GMAIL_PASS");
const PORKBUN_API_KEY = defineSecret("PORKBUN_API_KEY");
const PORKBUN_SECRET_KEY = defineSecret("PORKBUN_SECRET_KEY");

const CF_API = "https://api.cloudflare.com/client/v4";
const PORKBUN_API = "https://api.porkbun.com/api/json/v3";

const SUPPORTED_TLDS = ["com", "co.uk", "uk", "net", "org", "io", "shop", "store"];
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

// ── 1. Check domain availability via Porkbun ──────────────────────────────────
exports.checkDomain = onCall(
    {secrets: [PORKBUN_API_KEY, PORKBUN_SECRET_KEY]},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const {domain} = request.data;
      if (!domain) throw new HttpsError("invalid-argument", "domain is required");

      const clean = domain.toLowerCase().trim()
          .replace(/^https?:\/\//, "").replace(/\/$/, "");

      if (!isValidDomain(clean)) throw new HttpsError("invalid-argument", "Invalid domain format");

      const tld = extractTLD(clean);
      if (!SUPPORTED_TLDS.includes(tld)) {
        throw new HttpsError("invalid-argument", `Unsupported TLD: .${tld}`);
      }

      try {
        const availRes = await axios.post(
            `${PORKBUN_API}/domain/check`,
            {
              secretapikey: PORKBUN_SECRET_KEY.value(),
              apikey: PORKBUN_API_KEY.value(),
              domain: clean,
            },
        );

        const pricingRes = await axios.get("https://porkbun.com/api/json/v3/pricing/get");
        const pricing = pricingRes.data.pricing ?? {};

        const normalizedTld = tld.replace(/^\./, "");
        const priceUsd = pricing[normalizedTld]?.registration ?
          parseFloat(pricing[normalizedTld].registration) :
          null;

        const priceGbp = priceUsd ?
          Math.round((priceUsd * USD_TO_GBP + PLATFORM_MARKUP) * 100) / 100 :
          null;

        const available = availRes.data.avail === "yes";

        return {
          domain: clean,
          available,
          price: priceGbp,
          priceUsd,
          currency: "GBP",
        };
      } catch (error) {
        console.error("checkDomain error:", error.response?.data || error.message);
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
      const pricePence = Math.round((priceUsd * USD_TO_GBP + PLATFORM_MARKUP) * 100);
      const origin = "https://fallback.bookehtrim.co.uk";

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
        metadata: {type: "porkbun_domain_purchase", domain, barberId, priceUsd: String(priceUsd)},
        success_url: `${origin}/dashboard?domainSuccess=true&domain=${encodeURIComponent(domain)}`,
        cancel_url: `${origin}/dashboard?domainCancelled=true`,
      });

      return {url: session.url, sessionId: session.id};
    },
);

// ── 3. Connect a domain the barber already owns ───────────────────────────────
exports.addCustomDomain = onCall(
    {secrets: [CF_API_TOKEN, CF_ZONE_ID]},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const {domain} = request.data;
      if (!domain) throw new HttpsError("invalid-argument", "domain is required");

      const response = await axios.post(
          `${CF_API}/zones/${CF_ZONE_ID.value()}/custom_hostnames`,
          {hostname: domain, ssl: {method: "txt", type: "dv", settings: {min_tls_version: "1.2"}}},
          {headers: {Authorization: `Bearer ${CF_API_TOKEN.value()}`}},
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
            name: result.hostname,
            value: "fallback.bookehtrim.co.uk",
            ttl: "Auto",
            description: "Points your domain to our servers",
          },
          {
            type: "TXT",
            name: result.ownership_verification.name,
            value: result.ownership_verification.value,
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
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const {cfHostnameId} = request.data;

      const response = await axios.get(
          `${CF_API}/zones/${CF_ZONE_ID.value()}/custom_hostnames/${cfHostnameId}`,
          {headers: {Authorization: `Bearer ${CF_API_TOKEN.value()}`}},
      );

      const {status, ssl} = response.data.result;
      const isVerified = status === "active";
      const sslStatus = ssl ? ssl.status : null;
      const sslReady = sslStatus === "active";

      if (isVerified && sslReady) {
        await admin.firestore().collection("barbers").doc(request.auth.uid).update({
          domainStatus: "active",
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return {domainStatus: status, sslStatus, isVerified, sslReady, isLive: isVerified && sslReady};
    },
);

// ── 5. Stripe webhook ────────────────────────────────────────────────────────
exports.stripeWebhook = require("firebase-functions/v2/https").onRequest(
    {
      secrets: [STRIPE_SECRET, STRIPE_WEBHOOK_SECRET, PORKBUN_API_KEY, PORKBUN_SECRET_KEY, CF_API_TOKEN, CF_ZONE_ID],
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
        console.error("Webhook signature failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      if (event.type !== "checkout.session.completed") return res.json({received: true});

      const session = event.data.object;
      const meta = session.metadata ?? {};

      if (meta.type !== "porkbun_domain_purchase") return res.json({received: true});

      const {domain, barberId} = meta;

      try {
        const registerRes = await axios.post(`${PORKBUN_API}/domain/create`, {
          secretapikey: PORKBUN_SECRET_KEY.value(),
          apikey: PORKBUN_API_KEY.value(),
          domain,
          years: 1,
        });

        if (registerRes.data.status !== "SUCCESS") {
          throw new Error(`Porkbun registration failed: ${JSON.stringify(registerRes.data)}`);
        }

        const cfRes = await axios.post(
            `${CF_API}/zones/${CF_ZONE_ID.value()}/custom_hostnames`,
            {hostname: domain, ssl: {method: "txt", type: "dv", settings: {min_tls_version: "1.2"}}},
            {headers: {Authorization: `Bearer ${CF_API_TOKEN.value()}`}},
        );

        const result = cfRes.data.result;

        await admin.firestore().collection("barbers").doc(barberId).update({
          customDomain: domain,
          domainStatus: "pending",
          customHostnameId: result.id,
          dnsRecords: [
            {type: "CNAME", name: domain, value: "fallback.bookehtrim.co.uk"},
            {type: "TXT", name: result.ownership_verification.name, value: result.ownership_verification.value},
          ],
        });
      } catch (err) {
        console.error("Domain registration/provisioning failed:", err.message);
      }

      return res.json({received: true});
    },
);

// ── 6. Send booking confirmation ─────────────────────────────────────────────
exports.sendBookingConfirmation = onCall(
    {secrets: [GMAIL_USER, GMAIL_PASS]},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const {clientEmail, clientName, trainerName, businessName, date, time, location} = request.data;

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
        "PRODID:-//BookingSystem//EN",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTART:${startDt}`,
        `DTEND:${endDt}`,
        `SUMMARY:PT Session with ${trainerName || "Your Trainer"}`,
        `LOCATION:${location || "TBC"}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      await transporter.sendMail({
        from: `"${businessName || "PT Booking"}" <${GMAIL_USER.value()}>`,
        to: clientEmail,
        subject: `Booking Confirmed — ${date} at ${time}`,
        html: `<p>Hi ${clientName || "there"}, your session is confirmed for ${date} at ${time}.</p>`,
        attachments: [{filename: "session.ics", content: icsContent, contentType: "text/calendar"}],
      });

      return {sent: true};
    },
);

// ── 7. Generate and send Stripe invoice ───────────────────────────────────────
exports.createStripeInvoice = onCall(
    {secrets: [STRIPE_SECRET]},
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Login required");

      const {clientName, clientEmail, amount, description} = request.data;
      if (!clientEmail || !amount || !description) {
        throw new HttpsError("invalid-argument", "Missing required fields");
      }

      const stripe = new Stripe(STRIPE_SECRET.value());
      const customers = await stripe.customers.list({email: clientEmail, limit: 1});
      const customer = customers.data.length > 0 ? customers.data[0] : await stripe.customers.create({email: clientEmail, name: clientName});

      const invoice = await stripe.invoices.create({
        customer: customer.id,
        collection_method: "send_invoice",
        days_until_due: 7,
      });

      await stripe.invoiceItems.create({
        customer: customer.id,
        invoice: invoice.id,
        amount: Math.round(amount * 100),
        currency: "gbp",
        description: description,
      });

      const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
      await stripe.invoices.sendInvoice(invoice.id);

      return {success: true, invoiceUrl: finalized.hosted_invoice_url};
    },
);
