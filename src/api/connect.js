import Stripe from "stripe";

// --- Firestore REST helpers ---
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string")       fields[key] = { stringValue: val };
    else if (typeof val === "boolean") fields[key] = { booleanValue: val };
    else if (typeof val === "number")  fields[key] = { integerValue: String(val) };
    else                               fields[key] = { nullValue: null };
  }
  return fields;
}

// Explicit conversion handles types correctly when values arrive from the REST API
function fromFirestoreFields(fields = {}) {
  const out = {};
  for (const [key, val] of Object.entries(fields)) {
    out[key] = val.stringValue ?? val.booleanValue ?? (val.integerValue ? Number(val.integerValue) : null) ?? null;
  }
  return out;
}

async function getDoc(path, firestoreBase) {
  const res = await fetch(`${firestoreBase}/${path}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.fields ? fromFirestoreFields(data.fields) : null;
}

async function updateDoc(path, obj, firestoreBase) {
  const mask = Object.keys(obj).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  await fetch(`${firestoreBase}/${path}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFirestoreFields(obj) }),
  });
}

// --- Handler ---
// FIXED: Changed function name to handleConnect and arguments to (request, env) to match src/worker.js calls
export async function handleConnect(request, env) {
  // 1. Initialize Stripe inside the handler to use env
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
    timeout: 20000,
  });

  const FIREBASE_PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID;
  const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

  try {
    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    
    // Support both historical 'userId' parameter and the signup layout 'barberId' key safely
    const userId = body.barberId || body.userId;
    const email = body.email;
    const origin = body.origin;
    const businessName = body.businessName;
    const businessType = body.businessType || "barber"; // Graceful multi-industry routing fallback

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: "Missing userId or email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Determine base URL (Cloudflare uses request.headers.get)
    const host = request.headers.get("host");
    const baseUrl = origin || `https://${host}`;

    // 4. Firestore Business Logic
    const barber = await getDoc(`barbers/${userId}`, FIRESTORE_BASE);
    const existingStripeId = barber?.stripeAccountId;

    let accountId;

    if (existingStripeId) {
      accountId = existingStripeId;
    } else {
      // 🌟 Multi-Industry Payload Validation Protection
      const account = await stripe.accounts.create({
        type: "standard",
        email,
        business_profile: {
          name: businessName || barber?.businessName || barber?.name || "Premium Business Space",
          // Map Merchant Category Codes (MCC) safely depending on user profiles
          mcc: businessType === "barber" ? "7230" : "7299", // 7230 = Barber Shops, 7299 = Misc Personal Services / Personal Trainers
          product_description: `Appointment management and booking services for ${businessName || "Professional Services"}.`
        },
        metadata: { 
          barberId: userId,
          businessType: businessType 
        },
      });
      accountId = account.id;

      await updateDoc(`barbers/${userId}`, {
        stripeAccountId: accountId,
        stripeConnected: false,
      }, FIRESTORE_BASE);
    }

    // 5. Create Account Link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard?error=retry`,
      return_url: `${baseUrl}/dashboard?stripeSuccess=true&acct=${accountId}`,
      type: "account_onboarding",
    });

    // 6. Return response
    return new Response(JSON.stringify({ url: accountLink.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("STRIPE CONNECT ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message || "Stripe connect failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}