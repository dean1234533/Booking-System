import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ─── Firebase Admin singleton ─────────────────────────────────────────────────

function getAdminDb(env) {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        // The .replace handles environment variable formatting
        privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeToMinutes = (t) => {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return h * 60 + m;
};

function groupIntoBlocks(bookings) {
  if (!bookings.length) return [];
  const sorted = [...bookings].sort(
    (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)
  );
  const blocks = [];
  let current = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const gap = timeToMinutes(sorted[i].time) - timeToMinutes(sorted[i - 1].time);
    if (gap <= 30) {
      current.push(sorted[i]);
    } else {
      blocks.push(current);
      current = [sorted[i]];
    }
  }
  blocks.push(current);
  return blocks;
}

function todayUKDate() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()).split("/").reverse().join("-");
}

function nowUKMinutes() {
  const timeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());
  return timeToMinutes(timeStr);
}

function nowUKTimeStr() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());
}

// ─── Shared Core Business Logic Handlers ─────────────────────────────────────

async function checkDomainAvailability(domainParam, env) {
  const CF_API_TOKEN  = env.API_TOKEN;
  const CF_ACCOUNT_ID = env.ACCOUNT_ID;

  if (!domainParam) {
    return new Response(JSON.stringify({ error: "domain query parameter is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const clean = domainParam.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

  const SUPPORTED_TLDS = ["com", "co.uk", "uk", "net", "org", "io", "shop", "store"];
  const extractTLD = (d) => {
    const parts = d.split(".");
    if (parts.length >= 3) return parts.slice(-2).join(".");
    return parts.slice(-1)[0];
  };
  const isValidDomain = (d) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/i.test(d);

  if (!isValidDomain(clean)) {
    return new Response(JSON.stringify({ error: "Invalid domain format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const tld = extractTLD(clean);
  if (!SUPPORTED_TLDS.includes(tld)) {
    return new Response(JSON.stringify({ error: `Unsupported TLD: .${tld}`, supported: SUPPORTED_TLDS }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/registrar/domains/${clean}/availability`,
      { headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" } }
    );

    if (!cfRes.ok) {
      return new Response(JSON.stringify({ error: "Cloudflare availability check failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await cfRes.json();
    const result = data.result ?? {};

    return new Response(JSON.stringify({
      domain:    clean,
      available: result.available ?? false,
      price:     result.price      ?? null,
      currency:  "USD",
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}

// Your native reminder function handler logic
async function processCronReminders(url, request, env) {
  // Auth: accept Bearer token from headers or ?secret= query param
  const authHeader = request.headers.get("authorization");
  const querySecret = url.searchParams.get("secret");
  const expectedSecret = env.CRON_SECRET;

  if (
    expectedSecret &&
    authHeader !== `Bearer ${expectedSecret}` &&
    querySecret !== expectedSecret
  ) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { "Content-Type": "application/json" } 
    });
  }

  try {
    const db = getAdminDb(env);
    const today = todayUKDate();
    const nowMinutes = nowUKMinutes();

    const windowStart = nowMinutes + 60;
    const windowEnd   = nowMinutes + 120;

    console.log(`[cron-reminders] ${nowUKTimeStr()} UK | window ${windowStart}-${windowEnd} mins | date ${today}`);

    const bookingsSnap = await db
      .collection("bookings")
      .where("date", "==", today)
      .where("status", "==", "confirmed")
      .get();

    if (bookingsSnap.empty) {
      return new Response(JSON.stringify({ message: "No confirmed bookings today.", date: today }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const allBookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    
    const byBarber = {};
    for (const b of allBookings) {
      if (!b.barberId) continue;
      if (!byBarber[b.barberId]) byBarber[b.barberId] = [];
      byBarber[b.barberId].push(b);
    }

    const remindersSent = [];
    const skipped = [];

    for (const [barberId, barberBookings] of Object.entries(byBarber)) {
      const barberDoc = await db.collection("barbers").doc(barberId).get();
      if (!barberDoc.exists) continue;

      const barberData   = barberDoc.data();
      const barberEmail  = barberData.email;
      const barberName   = barberData.name || barberData.displayName || "Barber";
      const brandColor   = barberData.brandColor   || "#C9A84C";
      const businessName = barberData.businessName || "Your Barbershop";

      if (!barberEmail) continue;

      const blocks = groupIntoBlocks(barberBookings);

      for (const block of blocks) {
        const firstSlotMinutes = timeToMinutes(block[0].time);

        if (firstSlotMinutes < windowStart || firstSlotMinutes > windowEnd) {
          skipped.push(`${barberId}@${block[0].time}`);
          continue;
        }

        const dedupKey  = `${barberId}_${today}_${block[0].time}`;
        const dedupRef  = db.collection("remindersSent").doc(dedupKey);
        const dedupSnap = await dedupRef.get();
        if (dedupSnap.exists) continue;

        const baseUrl = env.BASE_URL || url.origin;
        
        const emailRes = await fetch(`${baseUrl}/api/send-reminder-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barberEmail,
            barberName,
            businessName,
            brandColor,
            date: today,
            block: block.map((b) => ({
              time:       b.time,
              clientName: b.customerName || b.name || "Client",
              service:    b.serviceName  || b.haircutStyle || "—",
              phone:      b.customerPhone || b.phone || "",
              notes:      b.notes || "",
            })),
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.error(`[cron-reminders] Email failed for ${dedupKey}:`, errText);
          continue;
        }

        await dedupRef.set({
          sentAt:     new Date().toISOString(),
          barberId,
          blockStart: block[0].time,
          blockSize:  block.length,
        });

        remindersSent.push(dedupKey);
      }
    }

    return new Response(JSON.stringify({
      ok:           true,
      date:          today,
      timeUK:        nowUKTimeStr(),
      remindersSent,
      skippedCount: skipped.length,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("[cron-reminders] Fatal error:", err);
    return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
    });
  }
}

// ─── Main Cloudflare Worker Routing Entrypoint ─────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // GET /api/check-domain?domain=deansbarbershop.com
    if (url.pathname === '/api/check-domain') {
      if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
      }
      const domain = url.searchParams.get('domain');
      return await checkDomainAvailability(domain, env);
    }

    // GET /api/cron-reminders (or whatever path your cron triggers)
    if (url.pathname === '/api/cron-reminders') {
      if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
      }
      return await processCronReminders(url, request, env);
    }

    // Fallback: Serves static compiled Vite frontend files from your assets ('dist')
    return env.ASSETS.fetch(request);
  }
};