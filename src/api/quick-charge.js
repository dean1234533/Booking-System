import Stripe from "stripe";

// In-person platform fee — lower than online bookings (2.5%) since face-to-face
// payments have no fraud risk and the business is present to handle disputes.
const IN_PERSON_FEE_PCT = 0.01; // 1%

export async function onRequestPost(context) {
  const { request, env } = context;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  try {
    const body = await request.json().catch(() => ({}));
    // NOTE: Dashboard sends amount already in pence (Math.round(£ × 100)).
    // Do NOT multiply by 100 again here.
    const { amount, currency, description, barberName, barberStripeId } = body;

    const unitAmount = Math.round(parseFloat(amount)); // already in pence
    if (!unitAmount || unitAmount < 30) {
      return new Response(
        JSON.stringify({ error: "Amount must be at least 30p (£0.30)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const origin = request.headers.get("origin") || request.headers.get("host");
    const baseUrl = origin?.startsWith("http") ? origin : `https://${origin}`;

    // Apply 1% platform fee and route through barber's connected account when
    // they have Stripe Connect set up. Skip routing if not yet connected.
    const applicationFee = barberStripeId
      ? Math.round(unitAmount * IN_PERSON_FEE_PCT)
      : 0;

    const paymentIntentData = barberStripeId
      ? {
          application_fee_amount: applicationFee,
          transfer_data: { destination: barberStripeId },
          on_behalf_of: barberStripeId,
        }
      : {};

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: currency || "gbp",
          product_data: { name: `${barberName || "Service"} — ${description}` },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      mode: "payment",
      payment_intent_data: paymentIntentData,
      success_url: `${baseUrl}/dashboard?paid=true`,
      cancel_url:  `${baseUrl}/dashboard`,
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("quick-charge error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
