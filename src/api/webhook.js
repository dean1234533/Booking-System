import Stripe from "stripe";

const FIRESTORE_HEADERS = { "Content-Type": "application/json" };

// ── Firestore REST helpers ────────────────────────────────────────────────────
function toFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string")       fields[key] = { stringValue: val };
    else if (typeof val === "boolean") fields[key] = { booleanValue: val };
    else if (typeof val === "number")  fields[key] = { integerValue: String(val) };
  }
  return fields;
}

async function updateDoc(path, obj, base) {
  const mask = Object.keys(obj)
    .map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const res = await fetch(`${base}/${path}?${mask}`, {
    method:  "PATCH",
    headers: FIRESTORE_HEADERS,
    body:    JSON.stringify({ fields: toFields(obj) }),
  });
  return res.ok;
}

// Look up a barber document by a string field value (e.g. stripeCustomerId)
async function findBarberByField(field, value, base) {
  const res = await fetch(`${base}:runQuery`, {
    method:  "POST",
    headers: FIRESTORE_HEADERS,
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "barbers" }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op:    "EQUAL",
            value: { stringValue: value },
          },
        },
        limit: 1,
      },
    }),
  });
  if (!res.ok) return null;
  const results = await res.json();
  const hit = results.find(r => r.document);
  if (!hit) return null;
  return hit.document.name.split("/").pop(); // returns barberId
}

// ── Webhook handler ───────────────────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;

  const stripe         = new Stripe(env.STRIPE_SECRET_KEY);
  const signature      = request.headers.get("stripe-signature");
  const webhookSecret  = env.STRIPE_WEBHOOK_SECRET;

  const FIREBASE_PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID;
  const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

  const rawBody = await request.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {

      // ── Booking payment ──────────────────────────────────────────────────
      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const { slotId } = intent.metadata || {};
        if (slotId) {
          await updateDoc(`slots/${slotId}`, { status: "booked" }, FIRESTORE_BASE);
        }
        break;
      }

      // ── Platform subscription checkout completed ──────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object;
        const meta    = session.metadata || {};
        if (meta.type !== "platform_subscription") break;

        const { barberId } = meta;
        if (!barberId) break;

        await updateDoc(`barbers/${barberId}`, {
          subscriptionStatus:   "active",
          stripeCustomerId:     session.customer     || "",
          stripeSubscriptionId: session.subscription || "",
        }, FIRESTORE_BASE);
        console.log(`Subscription activated for barber ${barberId}`);
        break;
      }

      // ── Payment succeeded on a subscription invoice (restores active) ────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        if (invoice.billing_reason === "subscription_cycle" || invoice.billing_reason === "subscription_create") {
          const barberId = await findBarberByField("stripeCustomerId", invoice.customer, FIRESTORE_BASE);
          if (barberId) {
            await updateDoc(`barbers/${barberId}`, { subscriptionStatus: "active" }, FIRESTORE_BASE);
          }
        }
        break;
      }

      // ── Payment failed on subscription invoice ────────────────────────────
      case "invoice.payment_failed": {
        const invoice  = event.data.object;
        const barberId = await findBarberByField("stripeCustomerId", invoice.customer, FIRESTORE_BASE);
        if (barberId) {
          await updateDoc(`barbers/${barberId}`, { subscriptionStatus: "past_due" }, FIRESTORE_BASE);
          console.log(`Subscription past_due for barber ${barberId}`);
        }
        break;
      }

      // ── Subscription status changed ───────────────────────────────────────
      case "customer.subscription.updated": {
        const sub      = event.data.object;
        const barberId = await findBarberByField("stripeCustomerId", sub.customer, FIRESTORE_BASE);
        if (!barberId) break;

        const statusMap = {
          active:    "active",
          past_due:  "past_due",
          canceled:  "canceled",
          unpaid:    "past_due",
          paused:    "past_due",
        };
        const newStatus = statusMap[sub.status];
        if (newStatus) {
          await updateDoc(`barbers/${barberId}`, { subscriptionStatus: newStatus }, FIRESTORE_BASE);
        }
        break;
      }

      // ── Subscription deleted/cancelled ───────────────────────────────────
      case "customer.subscription.deleted": {
        const sub      = event.data.object;
        const barberId = await findBarberByField("stripeCustomerId", sub.customer, FIRESTORE_BASE);
        if (barberId) {
          await updateDoc(`barbers/${barberId}`, { subscriptionStatus: "canceled" }, FIRESTORE_BASE);
          console.log(`Subscription cancelled for barber ${barberId}`);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error [${event.type}]:`, err.message);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
