import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { barberId, email } = req.body;

    // 1. Create the account on your platform
    const account = await stripe.accounts.create({
      type: 'standard',
      email: email,
      metadata: { barberId }
    });

    // 2. Create the link to send them to Stripe's onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `https://${req.headers.host}/barber-settings?error=retry`,
      return_url: `https://${req.headers.host}/barber-settings?stripeSuccess=true&acct=${account.id}`,
      type: 'account_onboarding',
    });

    res.status(200).json({ url: accountLink.url });
  } catch (error) {
    console.error("Connect Error:", error);
    res.status(500).json({ error: error.message });
  }
}