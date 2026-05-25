const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");

admin.initializeApp();

const CF_API_TOKEN = defineSecret("API_TOKEN");
const CF_ZONE_ID = defineSecret("ZONE_ID");
const CF_ACCOUNT_ID = defineSecret("ACCOUNT_ID");
const STRIPE_SECRET = defineSecret("STRIPE_SECRET_KEY");
// FIX 1: declare STRIPE_WEBHOOK_SECRET as a proper Firebase secret
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_PASS = defineSecret("GMAIL_PASS");

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
      const origin = "https://fallback.bookehtrim.co.uk";

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
            value: "fallback.bookehtrim.co.uk",
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
// FIX 2: add STRIPE_WEBHOOK_SECRET to the secrets array so .value() works
exports.stripeWebhook = require("firebase-functions/v2/https").onRequest(
    {secrets: [STRIPE_SECRET, STRIPE_WEBHOOK_SECRET, CF_API_TOKEN, CF_ZONE_ID, CF_ACCOUNT_ID]},
    async (req, res) => {
      const stripe = new Stripe(STRIPE_SECRET.value());
      const sig = req.headers["stripe-signature"];

      let event;
      try {
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            // FIX 3: use the declared secret instead of process.env
            STRIPE_WEBHOOK_SECRET.value(),
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

// ── 6. Send booking confirmation email with .ics calendar attachment ──────────
exports.sendBookingConfirmation = onCall(
    {secrets: [GMAIL_USER, GMAIL_PASS]},
    async (request) => {
      // FIX 4: guard this callable the same as every other one
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Login required");
      }

      const {
        clientEmail,
        clientName,
        trainerName,
        businessName,
        date,
        time,
        location,
      } = request.data;

      if (!clientEmail || !date || !time) {
        throw new HttpsError(
            "invalid-argument",
            "clientEmail, date and time are required",
        );
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: GMAIL_USER.value(),
          pass: GMAIL_PASS.value(),
        },
      });

      const dateParts = date.split("-");
      const timeParts = time.split(":");
      const dateFlat = dateParts.join("");

      // FIX 5: clamp end time to 23:59 so we never produce an invalid DTEND
      // with hour=24, which violates RFC 5545
      const startHour = parseInt(timeParts[0], 10);
      const endHour = Math.min(startHour + 1, 23);
      const endMin = endHour === 23 ? "59" : timeParts[1];

      const startDt = `${dateFlat}T${timeParts[0]}${timeParts[1]}00`;
      const endDt =
        `${dateFlat}T${String(endHour).padStart(2, "0")}${endMin}00`;

      // FIX 6: add a UID field — required by RFC 5545; without it some
      // calendar clients silently discard the event
      const uid =
        `${dateFlat}-${timeParts[0]}${timeParts[1]}-` +
        `${Date.now()}@bookehtrim.co.uk`;

      const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//BookingSystem//EN",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTART:${startDt}`,
        `DTEND:${endDt}`,
        `SUMMARY:PT Session with ${trainerName || "Your Trainer"}`,
        `DESCRIPTION:Your training session with ${trainerName || "Your Trainer"}`,
        `LOCATION:${location || "TBC"}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      await transporter.sendMail({
        from: `"${businessName || "PT Booking"}" <${GMAIL_USER.value()}>`,
        to: clientEmail,
        subject: `Booking Confirmed — ${date} at ${time}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;
            margin:0 auto;padding:32px;color:#111">
            <h2 style="margin:0 0 8px;font-size:24px">
              You're booked in! 💪
            </h2>
            <p style="color:#555;margin:0 0 24px">
              Hi ${clientName || "there"}, your session is confirmed.
            </p>
            <div style="background:#f8f8f8;border-radius:12px;
              padding:24px;margin:0 0 24px">
              <table style="width:100%;border-collapse:collapse;font-size:15px">
                <tr>
                  <td style="padding:6px 0;color:#888;width:100px">Date</td>
                  <td style="padding:6px 0;font-weight:700">${date}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#888">Time</td>
                  <td style="padding:6px 0;font-weight:700">${time}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#888">Trainer</td>
                  <td style="padding:6px 0;font-weight:700">
                    ${trainerName || "Your Trainer"}
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#888">Location</td>
                  <td style="padding:6px 0;font-weight:700">
                    ${location || "TBC — trainer will confirm"}
                  </td>
                </tr>
              </table>
            </div>
            <p style="color:#555;font-size:14px">
              The .ics file attached will add this session directly
              to your calendar app.
            </p>
            <p style="color:#aaa;font-size:12px;margin-top:24px">
              To cancel or reschedule please contact your trainer directly.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: "session.ics",
            content: icsContent,
            contentType: "text/calendar",
          },
        ],
      });

      return {sent: true};
    },
);
