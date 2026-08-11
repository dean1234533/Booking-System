import { db } from "../firebase/config";
import { doc, deleteDoc, collection, getDocs, writeBatch, query, where } from "firebase/firestore";
import { getAuth, deleteUser } from "firebase/auth";

// ---------------------------------------------------------------------------
// Helpers: batched deletes (Firestore batches cap at 500; we use 400 for safety)
// ---------------------------------------------------------------------------
const BATCH_SIZE = 400;

async function batchDeleteCollection(colRef) {
  const snapshot = await getDocs(colRef);
  if (snapshot.empty) return;
  for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    snapshot.docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

async function batchDeleteQuery(q) {
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;
  for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    snapshot.docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export const deleteBarberAccountData = async (barberId) => {
  if (!barberId) throw new Error("No Barber ID provided");

  const auth = getAuth();
  const user = auth.currentUser;

  // Simple subcollections with no further nesting
  const simpleSubcollections = [
    "reviews",
    "staff",
    "slots",
    "config",
    "parQSubmissions",
    "checkInSubmissions",
    "foodDiarySubmissions",
    "bookings",
    "notifications",
    "enquiries",
    "income",
    "expenses",
    "invoices",
    "quotes",
    "notepadCategories",
    "customFoods",
    "favoriteExercises",
    "automationSchedules",
    "ptSlots",
    "foodGeneratorLinks",
  ];

  try {
    // 1. Delete simple subcollections
    for (const subName of simpleSubcollections) {
      const colRef = collection(db, "barbers", barberId, subName);
      await batchDeleteCollection(colRef);
    }

    // 2. Delete clients and each client's nested subcollections
    const clientsRef  = collection(db, "barbers", barberId, "clients");
    const clientsSnap = await getDocs(clientsRef);
    for (const clientDoc of clientsSnap.docs) {
      const clientSubcols = ["messages", "activities", "consultationNotes", "progressEntries", "nutritionPlans"];
      for (const sub of clientSubcols) {
        await batchDeleteCollection(
          collection(db, "barbers", barberId, "clients", clientDoc.id, sub)
        );
      }
      await deleteDoc(clientDoc.ref);
    }

    // 3. Delete dayPlan and its nested jobs subcollections
    const dayPlanRef  = collection(db, "barbers", barberId, "dayPlan");
    const dayPlanSnap = await getDocs(dayPlanRef);
    for (const dayDoc of dayPlanSnap.docs) {
      await batchDeleteCollection(
        collection(db, "barbers", barberId, "dayPlan", dayDoc.id, "jobs")
      );
      await deleteDoc(dayDoc.ref);
    }

    // 4. Delete the main barber document
    await deleteDoc(doc(db, "barbers", barberId));

    // 5. Delete top-level slots linked to this barber
    await batchDeleteQuery(
      query(collection(db, "slots"), where("barberId", "==", barberId))
    );

    // 6. Delete top-level bookings linked to this barber
    await batchDeleteQuery(
      query(collection(db, "bookings"), where("barberId", "==", barberId))
    );

    // 7. Remove the user from Firebase Authentication
    if (user && user.uid === barberId) {
      await deleteUser(user);
      console.log("User successfully removed from Authentication tab.");
    }

    console.log("Account and all related data successfully wiped.");
    return true;
  } catch (error) {
    // Firebase requires a recent login to delete the auth account
    if (error.code === "auth/requires-recent-login") {
      console.error("Please log out and back in to fully delete your login credentials.");
    }
    console.error("Wipe failed:", error.message);
    throw error;
  }
};
