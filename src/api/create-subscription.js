import Stripe from "stripe";

export async function onRequestPost(context) {
  const { request, env } = context;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  const body = await request.json().catch(() => ({}));
  const { barberId, email, businessType = "barber" } = body;

  if (!barberId || !email) {
    return new Response(JSON.stringify({ error: "Missing barberId or email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const host   = request.headers.get("host") || "bookehtrim.co.uk";
  const origin = host.startsWith("localhost") ? `http://${host}` : `https://${host}`;

  try {
    // Find or create Stripe customer so subscriptions are tied to one customer record
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data.length > 0
      ? existing.data[0]
      : await stripe.customers.create({ email, metadata: { barberId, businessType } });

    // Determine pricing based on business type
    let lineItems;

    if (businessType === "trainer") {
      // PT Booking System: £20/month + £1.50 per 3 extra clients (usage-based)
      lineItems = [{
        price: env.STRIPE_PT_BASE_PRICE_ID, // Must be created in Stripe: £20/month
        quantity: 1,
      }];
    } else {
      // Other businesses: £10/month (flat)
      lineItems = [{
        price: env.STRIPE_BASE_PRICE_ID, // Must be created in Stripe: £10/month
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: lineItems,
      metadata: {
        type: "platform_subscription",
        barberId,
        businessType,
      },
      subscription_data: {
        metadata: {
          barberId,
          businessType,
        }
      },
      success_url: `${origin}/dashboard?subscriptionSuccess=true`,
      cancel_url:  `${origin}/dashboard`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-subscription error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
