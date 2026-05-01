import { Buffer } from 'buffer';
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log("Firebase Admin Initialized");
  } catch (error) {
    console.error("Firebase Init Error:", error.message);
  }
}

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const sig = req.headers['stripe-signature'];
  
  // Read body as Buffer
  const chunks = [];
  for await (const chunk of req) { chunks.push(chunk); }
  const buf = Buffer.concat(chunks);

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Signature Verification Failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const { slotId } = intent.metadata;

    try {
      const db = admin.firestore();
      await db.collection('slots').doc(slotId).update({ status: 'booked' });
      console.log(`Updated slot ${slotId} to booked`);
    } catch (dbErr) {
      console.error("Firestore Update Failed:", dbErr.message);
      return res.status(500).send("Database Error");
    }
  }

  res.status(200).json({ received: true });
}