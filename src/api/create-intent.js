import Stripe from 'stripe';

// Grosses up the deposit so customer pays all fees
// Barber always receives the exact deposit amount
function calculateTotal(depositPence) {
  const platformFeePercent = 0.05;       // Your 5% cut
  const stripeTotalPercent = 0.0175;     // 1.5% standard + 0.25% connect
  const stripeTotalFixed = 45;           // 20p standard + 25p connect (in pence)

  const platformFee = Math.round(depositPence * platformFeePercent);
  const customerPays = Math.ceil((depositPence + platformFee + stripeTotalFixed) / (1 - stripeTotalPercent));

  return { customerPays, platformFee };
}

export async function onRequest(context) {
  const { request, env } = context;

  // 1. Setup CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle OPTIONS (Pre-flight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Enforce POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Initialize Stripe with env secret
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  try {
    // 3. Parse request body
    const body = await request.json().catch(() => ({}));
    const { amount, metadata, email, barberStripeId } = body;

    // Validate Input
    if (!amount || !barberStripeId) {
      return new Response(JSON.stringify({ error: "Missing amount or barberStripeId" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Stripe Minimum Check (£0.30 = 30 pence)
    const finalAmount = Math.round(Number(amount));

    if (finalAmount < 30) {
      return new Response(JSON.stringify({
        error: `Amount (${finalAmount}p) is below the Stripe minimum of 30p (£0.30).`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Calculate fees
    const { customerPays, platformFee } = calculateTotal(finalAmount);

    // 6. Create the Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: customerPays,
      currency: 'gbp',
      receipt_email: email,
      metadata: metadata || {},
      automatic_payment_methods: { enabled: true },
      application_fee_amount: platformFee,

      // Sends money to the Barber's account
      transfer_data: {
        destination: barberStripeId
      },

      // Barber is the "Merchant of Record"
      on_behalf_of: barberStripeId,
    });

    console.log(`✅ Intent Created: ${paymentIntent.id} for ${customerPays}p (deposit: ${finalAmount}p, platform fee: ${platformFee}p)`);
    
    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("❌ Stripe API Error:", error.message);
    return new Response(JSON.stringify({
      error: error.message,
      type: error.type
    }), {
      status: error.statusCode || 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}