import Stripe from "stripe";

export async function onRequestPost(context) {
  const { request, env } = context;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  const body = await request.json().catch(() => ({}));
  const { barberId, email } = body;

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
      : await stripe.customers.create({ email, metadata: { barberId } });

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "gbp",
          product_data: {
            name: "yr-bookd Platform Subscription",
            description: "Monthly subscription — keeps your booking site live and dashboard active",
          },
          unit_amount: 1000,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      metadata: { type: "platform_subscription", barberId },
      subscription_data: { metadata: { barberId } },
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
