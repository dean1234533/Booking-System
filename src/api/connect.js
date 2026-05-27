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

function getFirestoreBase(env) {
  return `https://firestore.googleapis.com/v1/projects/${env.VITE_FIREBASE_PROJECT_ID}/databases/(default)/documents`;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// POST /api/stripe/connect
// Initiates Stripe Connect onboarding. Returns { url } to redirect the user.
// Body: { barberId | userId, email, origin?, businessName?, businessType? }
// ---------------------------------------------------------------------------
export async function handleConnect(request, env) {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
    timeout: 20000,
  });

  const FIRESTORE_BASE = getFirestoreBase(env);

  try {
    const body = await request.json().catch(() => ({}));

    // Support both historical 'userId' parameter and the signup layout 'barberId' key safely
    const userId       = body.barberId || body.userId;
    const email        = body.email;
    const origin       = body.origin;
    const businessName = body.businessName;
    const businessType = body.businessType || "barber"; // Graceful multi-industry routing fallback

    if (!userId || !email) {
      return jsonResponse({ error: "Missing userId or email" }, 400);
    }

    // Cloudflare Workers uses request.headers.get (not req.headers)
    const host    = request.headers.get("host");
    const baseUrl = origin || `https://${host}`;

    const barber           = await getDoc(`barbers/${userId}`, FIRESTORE_BASE);
    const existingStripeId = barber?.stripeAccountId;

    let accountId;

    if (existingStripeId) {
      // Reuse the existing Stripe account — just generate a fresh onboarding link
      accountId = existingStripeId;
    } else {
      // Multi-industry MCC routing:
      // 7230 = Barber Shops, 7299 = Misc Personal Services / Personal Trainers
      const account = await stripe.accounts.create({
        type: "standard",
        email,
        business_profile: {
          name: businessName || barber?.businessName || barber?.name || "Premium Business Space",
          mcc: businessType === "barber" ? "7230" : "7299",
          product_description: `Appointment management and booking services for ${businessName || "Professional Services"}.`,
        },
        metadata: { barberId: userId, businessType },
      });
      accountId = account.id;

      // Store the Stripe account ID immediately; stripeConnected stays false
      // until the user completes onboarding and /api/stripe/callback confirms it.
      await updateDoc(`barbers/${userId}`, {
        stripeAccountId: accountId,
        stripeConnected: false,
      }, FIRESTORE_BASE);
    }

    const accountLink = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${baseUrl}/dashboard?error=retry`,
      return_url:  `${baseUrl}/dashboard?stripeSuccess=true&acct=${accountId}`,
      type:        "account_onboarding",
    });

    return jsonResponse({ url: accountLink.url });

  } catch (error) {
    console.error("STRIPE CONNECT ERROR:", error.message);
    return jsonResponse({ error: error.message || "Stripe connect failed" }, 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/stripe/callback
// Called by the frontend when Stripe redirects back with ?stripeSuccess=true.
// Verifies onboarding is genuinely complete with Stripe, then sets
// stripeConnected: true in Firestore so the UI shows the connected state.
//
// Body: { userId, stripeAccountId }
// ---------------------------------------------------------------------------
export async function handleStripeCallback(request, env) {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
    timeout: 20000,
  });

  const FIRESTORE_BASE = getFirestoreBase(env);

  try {
    const body = await request.json().catch(() => ({}));
    const { userId, stripeAccountId } = body;

    if (!userId || !stripeAccountId) {
      return jsonResponse({ error: "Missing userId or stripeAccountId" }, 400);
    }

    // Always verify with Stripe directly — never trust the URL param alone.
    // A spoofed ?stripeSuccess=true should never mark a barber as connected.
    const account    = await stripe.accounts.retrieve(stripeAccountId);
    const isComplete = account.details_submitted && account.charges_enabled;

    if (!isComplete) {
      return jsonResponse({
        connected: false,
        reason: "Onboarding incomplete — details not yet submitted or charges not enabled",
      });
    }

    // Onboarding confirmed — mark the barber as connected in Firestore
    await updateDoc(`barbers/${userId}`, { stripeConnected: true }, FIRESTORE_BASE);

    return jsonResponse({ connected: true });

  } catch (error) {
    console.error("STRIPE CALLBACK ERROR:", error.message);
    return jsonResponse({ error: error.message || "Stripe callback failed" }, 500);
  }
}