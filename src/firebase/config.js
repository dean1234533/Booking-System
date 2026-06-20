import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:             import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:          import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:           import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:       import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:   import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:               import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// --- AUTH CONFIG ---
export const auth = getAuth(app);

// Ensures persistent login state
setPersistence(auth, browserLocalPersistence);

// --- FIRESTORE CONFIG ---
// experimentalForceLongPolling and useFetchStreams: false help bypass 
// aggressive Vercel/Edge caching that might keep ghost cards visible
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false, 
});

export const storage = getStorage(app);

export const COLLECTIONS = {
  BARBERS:  "barbers",
  SLOTS:    "slots",
  BOOKINGS: "bookings",
};

export default app;