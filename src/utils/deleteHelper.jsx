import { db } from "../firebase/config";
import { doc, deleteDoc, collection, getDocs, writeBatch, query, where } from "firebase/firestore";
import { getAuth, deleteUser } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

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

  // Simple subcollections with no further nesting. NOTE: "slots" is
  // deliberately excluded — slots live in the top-level `slots` collection
  // (queried by barberId in step 5 below), not a barbers/{id}/slots
  // subcollection. There's no Firestore rule for that nonexistent nested
  // path, so including it here made every deletion abort partway through
  // with a permission error.
  const simpleSubcollections = [
    "reviews",
    "staff",
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

  // Wraps each step with the step's own label so a failure says exactly
  // which collection/path it choked on, instead of a bare "permission
  // denied" that gives no clue which of ~25 Firestore paths was the
  // problem — this took real trial and error to track down twice already.
  let currentStep = "start";
  try {
    // 0. Release any connected custom domain's Cloudflare resources (zone,
    // custom_hostname record) before wiping the Firestore doc they're read
    // from. Best-effort — a failure here shouldn't block the rest of the
    // account deletion, just leave the domain to clean up manually later.
    currentStep = "custom domain release";
    try {
      const releaseCustomDomain = httpsCallable(getFunctions(getApp(), "us-central1"), "releaseCustomDomain");
      await releaseCustomDomain();
    } catch (releaseError) {
      console.error("Custom domain release failed (continuing with deletion):", releaseError.message);
    }

    // 1. Delete simple subcollections
    for (const subName of simpleSubcollections) {
      currentStep = `subcollection "${subName}"`;
      const colRef = collection(db, "barbers", barberId, subName);
      await batchDeleteCollection(colRef);
    }

    // 2. Delete clients and each client's nested subcollections
    currentStep = "clients (list)";
    const clientsRef  = collection(db, "barbers", barberId, "clients");
    const clientsSnap = await getDocs(clientsRef);
    for (const clientDoc of clientsSnap.docs) {
      const clientSubcols = ["messages", "activities", "consultationNotes", "progressEntries", "nutritionPlans"];
      for (const sub of clientSubcols) {
        currentStep = `clients/${clientDoc.id}/${sub}`;
        await batchDeleteCollection(
          collection(db, "barbers", barberId, "clients", clientDoc.id, sub)
        );
      }
      currentStep = `clients/${clientDoc.id} (doc)`;
      await deleteDoc(clientDoc.ref);
    }

    // 3. Delete dayPlan and its nested jobs subcollections
    currentStep = "dayPlan (list)";
    const dayPlanRef  = collection(db, "barbers", barberId, "dayPlan");
    const dayPlanSnap = await getDocs(dayPlanRef);
    for (const dayDoc of dayPlanSnap.docs) {
      currentStep = `dayPlan/${dayDoc.id}/jobs`;
      await batchDeleteCollection(
        collection(db, "barbers", barberId, "dayPlan", dayDoc.id, "jobs")
      );
      currentStep = `dayPlan/${dayDoc.id} (doc)`;
      await deleteDoc(dayDoc.ref);
    }

    // 4. Delete the main barber document
    currentStep = "main barber doc";
    await deleteDoc(doc(db, "barbers", barberId));

    // 5. Delete top-level slots linked to this barber
    currentStep = "top-level slots";
    await batchDeleteQuery(
      query(collection(db, "slots"), where("barberId", "==", barberId))
    );

    // 6. Delete top-level bookings linked to this barber
    currentStep = "top-level bookings";
    await batchDeleteQuery(
      query(collection(db, "bookings"), where("barberId", "==", barberId))
    );

    // 7. Remove the user from Firebase Authentication
    currentStep = "auth user deletion";
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
    console.error(`Wipe failed at step [${currentStep}]:`, error.code || "", error.message);
    throw error;
  }
};
