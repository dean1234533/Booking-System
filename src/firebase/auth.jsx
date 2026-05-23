import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { auth, db } from "./config";
import { doc, setDoc, deleteDoc, serverTimestamp, getDoc } from "firebase/firestore";

/**
 * Updated to support business types and custom domains instead of Vercel URLs
 */
export async function signUpBarber(data) {
  const { 
    email, password, name, phone, specialty, 
    bio, role, shopId, businessName, brandColor,
    businessType, customDomain 
  } = data;

  // 1. Create Auth Account
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // 2. Prepare Profile Data
  const profileData = {
    uid: user.uid,
    displayName: name,
    name: name,
    email,
    phone: phone || "",
    specialty: specialty || "",
    bio: bio || "",
    role: role || "staff",
    shopId: role === "owner" ? user.uid : shopId, 
    businessType: businessType || "barber", // 🌟 Saves your chosen business category successfully here
    services: [],
    photoURL: "",
    brandColor: brandColor || "#C9A84C",
    createdAt: serverTimestamp()
  };

  if (role === "owner") {
    profileData.businessName = businessName || "My Business Space";
    profileData.customDomain = customDomain || ""; // 🌟 Replaced vercelUrl with customDomain completely
  }

  // 3. Save to main 'barbers' collection
  await setDoc(doc(db, "barbers", user.uid), profileData);

  // 4. If staff, link to the shop's sub-collection
  if (role === "staff" && shopId && shopId !== "self") {
    await setDoc(doc(db, "barbers", shopId, "staff", user.uid), {
      uid: user.uid,
      name: name,
      specialty: specialty,
      role: "staff",
      shopId: shopId,
      businessType: businessType || "barber", // Forward industry category context downstream to staff nodes
      photoURL: ""
    });
  }

  return user;
}

/**
 * Deletes the barber's profile from Firestore and Auth
 */
export async function deleteBarberProfile() {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user found.");

  try {
    // 1. Get current data to find shopId (needed to clean up staff sub-collections)
    const userDoc = await getDoc(doc(db, "barbers", user.uid));
    const userData = userDoc.data();

    if (userData) {
      // 2. If they are staff, remove them from the Shop's sub-collection first
      if (userData.role === "staff" && userData.shopId) {
        await deleteDoc(doc(db, "barbers", userData.shopId, "staff", user.uid));
      }
      
      // 3. Delete the main profile document
      await deleteDoc(doc(db, "barbers", user.uid));
    }

    // 4. Delete the Auth account
    await deleteUser(user);
    
    return true;
  } catch (error) {
    console.error("Deletion error:", error);
    if (error.code === "auth/requires-recent-login") {
      throw new Error("Security: Please log out and back in before deleting your profile.");
    }
    throw error;
  }
}

/**
 * UPDATED: Added Persistence to fix mobile/live domain login sync
 */
export async function signInBarber(email, password) {
  // Ensures the user stays logged in across refreshes and dynamic domains
  await setPersistence(auth, browserLocalPersistence);
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function logoutBarber() {
  return await signOut(auth);
}