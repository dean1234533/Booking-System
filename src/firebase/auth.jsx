import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { auth, db } from "./config";
import { doc, setDoc } from "firebase/firestore";

export async function signUpBarber({ email, password, name, phone, specialty, bio }) {
  // 1. Create Auth Account
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // 2. Create the Barber Profile Document
  await setDoc(doc(db, "barbers", user.uid), {
    displayName: name,
    email,
    phone,
    specialty,
    bio,
    services: [], // Start with an empty list
    photoURL: "",
    uid: user.uid,
    createdAt: new Date().toISOString()
  });

  return user;
}

export async function signInBarber(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function logoutBarber() {
  return await signOut(auth);
}