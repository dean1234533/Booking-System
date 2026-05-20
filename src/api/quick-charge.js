import Stripe from 'stripe';

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Initialize Stripe with the Cloudflare environment variable
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  try {
    // 2. Parse the body using the standard Web request.json()
    const body = await request.json().catch(() => ({}));
    const { amount, currency, description, barberName } = body;

    // 3. Your business logic: Convert to pence (e.g., 25 -> 2500)
    const unitAmount = Math.round(parseFloat(amount) * 100); 

    // 4. Create the Stripe Checkout Session
    // Cloudflare uses request.headers.get('origin') instead of req.headers.origin
    const origin = request.headers.get('origin');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency || 'gbp',
          product_data: { name: `${barberName} - ${description}` },
          unit_amount: unitAmount, 
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/dashboard?paid=true`,
      cancel_url: `${origin}/dashboard`,
    });

    // 5. Return the standard Web Response
    return new Response(JSON.stringify({ 
      url: session.url, 
      sessionId: session.id 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Stripe Session Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}