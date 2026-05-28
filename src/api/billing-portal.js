import Stripe from "stripe";

// ── Firestore REST helper (same pattern as connect.js) ───────────────────────
function fromFields(fields = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = v.stringValue ?? v.booleanValue ?? (v.integerValue != null ? Number(v.integerValue) : null);
  }
  return out;
}

async function getDoc(path, base) {
  const res = await fetch(`${base}/${path}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.fields ? fromFields(data.fields) : null;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  const body = await request.json().catch(() => ({}));
  const { barberId } = body;

  if (!barberId) {
    return new Response(JSON.stringify({ error: "Missing barberId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const FIREBASE_PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID;
  const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

  try {
    const barber = await getDoc(`barbers/${barberId}`, FIRESTORE_BASE);
    const customerId = barber?.stripeCustomerId;

    if (!customerId) {
      return new Response(JSON.stringify({ error: "No subscription found for this account" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const host   = request.headers.get("host") || "bookehtrim.co.uk";
    const origin = host.startsWith("localhost") ? `http://${host}` : `https://${host}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${origin}/dashboard`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("billing-portal error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
