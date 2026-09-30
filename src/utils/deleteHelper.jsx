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
//
// Returns { authDeleted, errors }. Only throws if the main barber doc itself
// can't be deleted (the one step that must succeed — see below); everything
// else is best-effort, collected into `errors` instead of aborting the run.
// ---------------------------------------------------------------------------
export const deleteBarberAccountData = async (barberId) => {
  if (!barberId) throw new Error("No Barber ID provided");

  const auth = getAuth();
  const user = auth.currentUser;
  const errors = [];

  // 1. Release any connected custom domain's Cloudflare/Search Console
  // resources FIRST, while the doc it reads customDomain from still exists —
  // best-effort, wrapped so a failure here can't block step 2 below.
  try {
    const releaseCustomDomain = httpsCallable(getFunctions(getApp(), "us-central1"), "releaseCustomDomain");
    await releaseCustomDomain();
  } catch (e) {
    errors.push(`custom domain release: ${e.message}`);
  }

  // 2. Delete the main barber doc. This is the step that actually matters
  // from the user's side — it's what removes the account from marketplace
  // cards and frees its booking slug for reuse. Previously this ran second-
  // to-last, after ~20 other subcollection deletes; any one of those
  // throwing (a missing/mismatched Firestore rule, a transient permission
  // hiccup) aborted the whole run before ever reaching this, leaving the
  // account fully "undead" — still listed, slug still claimed — even though
  // most of its data had already been wiped. Everything below is now best-
  // effort housekeeping that can't block this from having already happened.
  await deleteDoc(doc(db, "barbers", barberId));

  // 3. Simple subcollections with no further nesting — each wrapped
  // individually so one failing doesn't stop the rest from being cleaned up.
  // NOTE: "slots" is deliberately excluded — slots live in the top-level
  // `slots` collection (queried by barberId in step 5 below), not a
  // barbers/{id}/slots subcollection.
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
    "clientHistory",
    "haircutMemories",
  ];
  for (const subName of simpleSubcollections) {
    try {
      await batchDeleteCollection(collection(db, "barbers", barberId, subName));
    } catch (e) {
      errors.push(`subcollection "${subName}": ${e.message}`);
    }
  }

  // 4. Clients and each client's nested subcollections.
  try {
    const clientsSnap = await getDocs(collection(db, "barbers", barberId, "clients"));
    for (const clientDoc of clientsSnap.docs) {
      const clientSubcols = ["messages", "activities", "consultationNotes", "progressEntries", "nutritionPlans"];
      for (const sub of clientSubcols) {
        try {
          await batchDeleteCollection(collection(db, "barbers", barberId, "clients", clientDoc.id, sub));
        } catch (e) {
          errors.push(`clients/${clientDoc.id}/${sub}: ${e.message}`);
        }
      }
      try {
        await deleteDoc(clientDoc.ref);
      } catch (e) {
        errors.push(`clients/${clientDoc.id}: ${e.message}`);
      }
    }
  } catch (e) {
    errors.push(`clients (list): ${e.message}`);
  }

  // 5. dayPlan and its nested jobs subcollections.
  try {
    const dayPlanSnap = await getDocs(collection(db, "barbers", barberId, "dayPlan"));
    for (const dayDoc of dayPlanSnap.docs) {
      try {
        await batchDeleteCollection(collection(db, "barbers", barberId, "dayPlan", dayDoc.id, "jobs"));
      } catch (e) {
        errors.push(`dayPlan/${dayDoc.id}/jobs: ${e.message}`);
      }
      try {
        await deleteDoc(dayDoc.ref);
      } catch (e) {
        errors.push(`dayPlan/${dayDoc.id}: ${e.message}`);
      }
    }
  } catch (e) {
    errors.push(`dayPlan (list): ${e.message}`);
  }

  // 6. Top-level slots linked to this barber.
  try {
    await batchDeleteQuery(query(collection(db, "slots"), where("barberId", "==", barberId)));
  } catch (e) {
    errors.push(`top-level slots: ${e.message}`);
  }

  // 7. Top-level bookings linked to this barber.
  try {
    await batchDeleteQuery(query(collection(db, "bookings"), where("barberId", "==", barberId)));
  } catch (e) {
    errors.push(`top-level bookings: ${e.message}`);
  }

  // 8. Remove the login account last, and separately from everything above —
  // this is the step most likely to fail (Firebase requires a *recent*
  // sign-in to delete an auth user, so a long dashboard session easily trips
  // "auth/requires-recent-login"), and its failure must never look like the
  // whole deletion failed when the account and its data are already gone.
  let authDeleted = false;
  if (user && user.uid === barberId) {
    try {
      await deleteUser(user);
      authDeleted = true;
    } catch (e) {
      errors.push(`auth user deletion: ${e.code || ""} ${e.message}`);
    }
  }

  if (errors.length) {
    console.warn("Account deleted; some cleanup steps had non-fatal errors:", errors);
  }

  return { authDeleted, errors };
};
