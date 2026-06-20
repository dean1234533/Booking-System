// src/firebase/config.js
// ─────────────────────────────────────────────────────────────────────────────
// Initialises the Firebase app and exports the services used across the app:
//   auth      — Firebase Authentication (barber sign in / sign up / sign out)
//   db        — Firestore database (barbers, slots, bookings collections)
//   storage   — Firebase Storage (barber profile photos)
//
// All values are loaded from environment variables so secrets are never
// committed to version control. Create a .env file in your project root
// (see the example below) and Vite will inject them at build time.
//
// .env example — copy this, fill in your real values from the Firebase console:
// ─────────────────────────────────────────────────────────────────────────────
// VITE_FIREBASE_API_KEY=AIza...
// VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
// VITE_FIREBASE_PROJECT_ID=your-app
// VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
// VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
// VITE_FIREBASE_APP_ID=1:123456789:web:abc123
// ─────────────────────────────────────────────────────────────────────────────
// Never commit your .env file — make sure it is in your .gitignore.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth }                         from "firebase/auth";
import { getFirestore }                    from "firebase/firestore";
import { getStorage }                      from "firebase/storage";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Prevent re-initialising if this module is hot-reloaded during development
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

// ─── Firestore collections reference ─────────────────────────────────────────
// Import these in firestore.js and any hook that talks to the database.
// Keeping collection names as constants avoids typos scattered across the app.
//
// barbers/{barberId}
//   name:          string
//   phone:         string
//   specialty:     string
//   bio:           string
//   photoURL:      string        (Firebase Storage download URL)
//   depositAmount: number        (default 10, barber can change in dashboard)
//   createdAt:     timestamp
//
// slots/{slotId}
//   barberId:      string
//   date:          timestamp
//   time:          string        e.g. "10:00"
//   status:        "open" | "booked"
//   bookingId:     string | null
//
// bookings/{bookingId}
//   slotId:               string
//   barberId:             string
//   clientName:           string
//   clientEmail:          string
//   clientPhone:          string
//   haircutStyle:         string
//   gender:               string
//   depositAmount:        number
//   depositPaid:          boolean
//   stripePaymentIntentId: string
//   slotDate:             timestamp  (copy of slot date — used for 24hr refund check)
//   createdAt:            timestamp

export const COLLECTIONS = {
  BARBERS:  "barbers",
  SLOTS:    "slots",
  BOOKINGS: "bookings",
};

export default app;
