import Stripe from 'stripe';

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Setup Stripe using Cloudflare env
  const apiKey = env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    console.error("CRITICAL ERROR: STRIPE_SECRET_KEY is missing from backend environment variables!");
  }
  const stripe = new Stripe(apiKey || '');

  try {
    // 2. Parse payload using Web Standard request.json()
    const body = await request.json();
    const { paymentIntentId, date, time } = body;

    console.log("[cancel-refund] received payload:", { paymentIntentId, date, time });

    // 3. Validate payload fields
    if (!paymentIntentId || !date || !time) {
      return new Response(JSON.stringify({ error: "Missing required fields in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 4. Time business logic rules
    const appointmentDateTimeString = `${date}T${time}:00`; 
    const slot = new Date(appointmentDateTimeString);
    const now = new Date();

    if (isNaN(slot.getTime())) {
      return new Response(JSON.stringify({ error: "Invalid date or time format provided." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const diffInMilliseconds = slot.getTime() - now.getTime();
    const hoursUntilSlot = diffInMilliseconds / (1000 * 60 * 60);

    console.log("[cancel-refund] hours until appointment:", hoursUntilSlot);

    if (hoursUntilSlot <= 24) {
      return new Response(JSON.stringify({ refunded: false, reason: "Non-refundable (within 24h)." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 5. Retrieve PaymentIntent
    console.log("[cancel-refund] Fetching payment intent status from Stripe...");
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return new Response(JSON.stringify({ 
        refunded: false, 
        reason: `Cannot refund a payment with Stripe status: ${paymentIntent.status}` 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 6. Execute Refund
    console.log("[cancel-refund] Initiating Stripe refund...");
    const isLiveMode = apiKey.startsWith('sk_live');
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
      refund_application_fee: false,
      reverse_transfer: isLiveMode, 
    });

    console.log("[cancel-refund] Refund successful! ID:", refund.id);

    return new Response(JSON.stringify({ refunded: true, refundId: refund.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("[cancel-refund] Internal Execution Error:", {
      message: err.message,
      type: err.type || "Native JavaScript Error",
      code: err.code || "no_stripe_code"
    });

    if (err.message.includes("sufficient funds")) {
      return new Response(JSON.stringify({
        error: "The barber's Stripe account has insufficient funds to process this refund. Please contact the shop directly.",
        code: "insufficient_funds"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ 
      error: err.message || "An internal server error occurred while executing the refund.",
      code: err.code || "server_crash"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}