import Stripe from "stripe";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";

export async function onRequestPost(context) {
  const { request, env } = context;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  const body = await request.json().catch(() => ({}));
  const { barberId, email, clientCount } = body;

  if (!barberId || !email || clientCount === undefined) {
    return new Response(
      JSON.stringify({ error: "Missing barberId, email, or clientCount" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Find the Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) {
      return new Response(
        JSON.stringify({ error: "Customer not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const customer = customers.data[0];

    // Get the subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });

    if (!subscriptions.data.length) {
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const subscription = subscriptions.data[0];

    // Only report usage for PT subscriptions
    const businessType = subscription.metadata?.businessType;
    if (businessType !== "trainer") {
      return new Response(
        JSON.stringify({ message: "Usage reporting not applicable for this business type" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Calculate overage clients (over 10 free)
    const overageClients = Math.max(0, clientCount - 10);

    // Round up to nearest 3 for billing (£1.50 per 3 clients)
    const billingUnits = Math.ceil(overageClients / 3);

    // Report usage to Stripe
    const subscriptionItem = subscription.items.data[0];

    await stripe.subscriptionItems.createUsageRecord(subscriptionItem.id, {
      quantity: billingUnits,
      timestamp: Math.floor(Date.now() / 1000),
      action: "set", // "set" = replace previous usage, "increment" = add to previous
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Usage reported to Stripe",
        data: {
          totalClients: clientCount,
          freeClients: 10,
          overageClients,
          billingUnits,
          estimatedOverageCost: `£${(billingUnits * 1.5).toFixed(2)}`,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("report-usage error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
