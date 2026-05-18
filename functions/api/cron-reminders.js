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

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
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