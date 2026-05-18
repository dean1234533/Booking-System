import { db } from "../firebase/config";
import { doc, deleteDoc, collection, getDocs } from "firebase/firestore";
// NEW: We need these to touch the Authentication tab
import { getAuth, deleteUser } from "firebase/auth";

export const deleteBarberAccountData = async (barberId) => {
  if (!barberId) throw new Error("No Barber ID provided");

  const auth = getAuth();
  const user = auth.currentUser;

  const subcollections = ["reviews", "staff", "slots"];

  try {
    // 1. Clear all Firestore subcollections (Reviews, Staff, Slots)
    for (const subName of subcollections) {
      const subRef = collection(db, "barbers", barberId, subName);
      const snapshot = await getDocs(subRef);
      const deletePromises = snapshot.docs.map((subDoc) => deleteDoc(subDoc.ref));
      await Promise.all(deletePromises);
    }

    // 2. Delete the main Barber document (The "Card")
    await deleteDoc(doc(db, "barbers", barberId));
    
    // 3. Clear any top-level slots linked to this barber
    const topLevelSlotsQ = collection(db, "slots");
    const slotsSnapshot = await getDocs(topLevelSlotsQ);
    const syncDeletePromises = slotsSnapshot.docs
      .filter(doc => doc.data().barberId === barberId)
      .map(doc => deleteDoc(doc.ref));
    
    await Promise.all(syncDeletePromises);

    // 4. THE FIX: Remove the user from the AUTHENTICATION TAB
    // This removes the row you see in Screenshot 2026-05-13 at 23.24.31.jpg
    if (user && user.uid === barberId) {
      await deleteUser(user);
      console.log("User successfully removed from Authentication tab.");
    }

    console.log("Account and all related data successfully wiped.");
    return true;
  } catch (error) {
    // If the user has been logged in for a long time, Firebase requires a fresh login to delete
    if (error.code === 'auth/requires-recent-login') {
       console.error("Please log out and back in to fully delete your login credentials.");
    }
    console.error("Wipe failed:", error.message);
    throw error;
  }
};