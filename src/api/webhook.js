import Stripe from 'stripe';

// --- Firestore REST helper ---
async function updateDoc(path, obj, firestoreBase) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string") fields[key] = { stringValue: val };
    else if (typeof val === "boolean") fields[key] = { booleanValue: val };
    else if (typeof val === "number") fields[key] = { integerValue: String(val) };
  }

  const mask = Object.keys(obj).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  
  const res = await fetch(`${firestoreBase}/${path}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  return res.ok;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  const FIREBASE_PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID;
  const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

  // 1. Read the raw body for signature verification
  const rawBody = await request.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error(`❌ Signature Verification Failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 2. Handle the event
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const { slotId } = intent.metadata;

    if (slotId) {
      try {
        // Update slot status to booked using REST API
        const success = await updateDoc(`slots/${slotId}`, { status: 'booked' }, FIRESTORE_BASE);
        
        if (success) {
          console.log(`✅ Updated slot ${slotId} to booked`);
        } else {
          console.error(`⚠️ Firestore update returned non-OK status for slot ${slotId}`);
        }
      } catch (dbErr) {
        console.error("❌ Firestore Update Failed:", dbErr.message);
        return new Response("Database Error", { status: 500 });
      }
    }
  }

  // 3. Return 200 to Stripe
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}