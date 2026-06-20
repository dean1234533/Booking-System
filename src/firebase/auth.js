// src/firebase/auth.js
// Barber-only auth helpers — sign up, sign in, sign out
// Called by Login.jsx, Signup.jsx and Nav.jsx

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, COLLECTIONS } from "./config";

// ─── Sign Up ──────────────────────────────────────────────────────────────────
// Creates a Firebase Auth user and a matching barbers/{uid} Firestore document.
// depositAmount defaults to £10 — barber can change this in their dashboard.
export async function signUpBarber({ name, email, password, phone, specialty, bio }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Set display name on the Firebase Auth profile
  await updateProfile(user, { displayName: name });

  // Create the barbers document — this is what the app reads for profile info
  await setDoc(doc(db, COLLECTIONS.BARBERS, user.uid), {
    name,
    email,
    phone,
    specialty,
    bio,
    photoURL: "",
    depositAmount: 10,
    createdAt: serverTimestamp(),
  });

  return user;
}

// ─── Sign In ──────────────────────────────────────────────────────────────────
export async function signInBarber({ email, password }) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOutBarber() {
  await firebaseSignOut(auth);
}
