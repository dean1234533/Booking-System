import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. ADDED barberStripeId to destructuring
    const { amount, metadata, barberName, email, barberStripeId } = req.body;

    if (!barberStripeId) {
      return res.status(400).json({ error: 'Selected barber is not set up to receive payments.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), 
      currency: 'gbp',
      receipt_email: email, 
      description: `Appointment with ${barberName}`, 
      metadata: metadata || {},
      automatic_payment_methods: { enabled: true },

      // 2. CONNECT ROUTING: Sends funds to the barber's account
      transfer_data: {
        destination: barberStripeId, 
      },

      // 3. OPTIONAL: Application fee
      // application_fee_amount: 100, // Uncomment to take £1.00 as a platform fee
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Stripe Intent Error:", error);
    return res.status(500).json({ error: error.message });
  }
}