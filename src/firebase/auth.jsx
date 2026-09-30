import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  setPersistence,
  browserLocalPersistence,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db } from "./config";
import {
  doc, setDoc, deleteDoc, serverTimestamp, getDoc, Timestamp,
} from "firebase/firestore";
import { DEMO_HERO_IMAGES, DEMO_PORTFOLIOS } from "../data/demoPortfolios";

// Without this, sendEmailVerification() falls back to Firebase's bare
// default: the verification link's landing page is unbranded, and there's
// no way back to the actual site afterward — it just dead-ends on a plain
// "email verified" confirmation with no continue link. This sends people
// back to their dashboard once they've verified.
const EMAIL_VERIFICATION_SETTINGS = { url: "https://bookrightly.co.uk/dashboard" };

/**
 * Updated to support business types and custom domains instead of Vercel URLs
 */
export async function signUpBarber(data) {
  const {
    email, password, name, phone, specialty,
    bio, role, shopId, businessName, brandColor,
    businessType, customDomain, marketingOptIn, plan,
  } = data;

  // 1. Create Auth Account
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  sendEmailVerification(user, EMAIL_VERIFICATION_SETTINGS).catch(() => {}); // best-effort — never block signup on this

  // 2. Prepare Profile Data
  const profileData = {
    uid: user.uid,
    displayName: name,
    name: name,
    email,
    phone: phone || "",
    timezone: "Europe/London", // IANA zone used for all reminder scheduling (no UI to change yet)
    specialty: specialty || "",
    bio: bio || "",
    role: role || "staff",
    shopId: role === "owner" ? user.uid : shopId, 
    businessType: businessType || "barber", // 🌟 Saves your chosen business category successfully here
    services: [],
    photoURL: "",
    brandColor: brandColor || "#C9A84C",
    marketingOptIn: marketingOptIn === true,
    createdAt: serverTimestamp(),
  };

  if (role === "owner") {
    profileData.businessName      = businessName || "My Business Space";
    profileData.customDomain      = customDomain || "";
    // "widget" accounts already have their own website and only want
    // booking/queue tools embedded on it — they don't get the hosted-page
    // tabs (Profile/Design/Domain, see Dashboard.jsx) and are billed less
    // (see FinanceTab.jsx's getPricingLabel and worker.js's checkout).
    // "basic" accounts have no website at all (Instagram-only) — they get a
    // bare booking page (MinimalBookingPage.jsx) and an equally stripped
    // dashboard, billed at the same lower rate as widget. "free" is £0 —
    // no nav, no footer, no payment collection, just a logo and slots
    // (MiniBookingPage.jsx) — see src/config/plans.js.
    profileData.plan = plan === "widget" ? "widget" : plan === "basic" ? "basic" : plan === "free" ? "free" : "full";
    // Free has no trial to start — it's free forever from day one, no card,
    // nothing to convert. Every paid plan still gets the 90-day trial.
    if (profileData.plan === "free") {
      profileData.subscriptionStatus = "free";
    } else {
      profileData.subscriptionStatus = "trialing";
      profileData.trialEndsAt        = Timestamp.fromDate(
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      );
    }

    // Start every new account looking like the demo for its business type —
    // same curated hero/gallery photos, on the platform domain or a custom
    // domain — rather than a blank page until they get around to uploading
    // their own. They can replace any of these later from the dashboard.
    const demoImages = DEMO_HERO_IMAGES[profileData.businessType];
    if (demoImages) Object.assign(profileData, demoImages);
    if (DEMO_PORTFOLIOS[profileData.businessType]) {
      profileData.portfolioItems = DEMO_PORTFOLIOS[profileData.businessType];
    }
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

  // Best-effort, never blocks signup — the Worker re-checks marketingOptIn
  // against Firestore itself before sending, so it's safe to always call.
  if (role === "owner" && profileData.marketingOptIn) {
    fetch("/api/send-welcome-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: user.uid }),
    }).catch(() => {});
  }

  return user;
}

/**
 * Claims an owner-issued staff invite link (barbers/{shopId}/staff/{staffId})
 * by turning it into a real login. Carries over whatever the owner already
 * filled in (name, bio, photo, services, portfolio) onto a new doc keyed by
 * the fresh auth uid — matching the uid-keyed convention the rest of the
 * dashboard (handleSaveProfile, loadData) already assumes for staff — then
 * removes the old placeholder and re-points any slots the owner generated
 * against it (WeeklyHours writes `barberId: staffId`).
 */
export async function claimStaffInvite({ shopId, staffId, email, password }) {
  const staffSnap = await getDoc(doc(db, "barbers", shopId, "staff", staffId));
  if (!staffSnap.exists()) throw new Error("This invite link is no longer valid.");
  const staffData = staffSnap.data();
  if (staffData.hasLogin) throw new Error("This profile has already been claimed. Try logging in instead.");

  const shopSnap = await getDoc(doc(db, "barbers", shopId));
  const shopData = shopSnap.exists() ? shopSnap.data() : {};

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  sendEmailVerification(user, EMAIL_VERIFICATION_SETTINGS).catch(() => {}); // best-effort — never block claiming on this

  await setDoc(doc(db, "barbers", user.uid), {
    uid: user.uid,
    displayName: staffData.name || "",
    name: staffData.name || "",
    email,
    phone: staffData.phone || "",
    specialty: staffData.specialty || "",
    bio: staffData.bio || "",
    role: "staff",
    shopId,
    businessType: shopData.businessType || "barber",
    services: staffData.services || [],
    photoURL: staffData.profilePic || staffData.photoURL || "",
    brandColor: shopData.brandColor || "#C9A84C",
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, "barbers", shopId, "staff", user.uid), {
    ...staffData,
    uid: user.uid,
    hasLogin: true,
  });

  // Deleting the OLD placeholder doc (a different id than user.uid) and
  // re-pointing slots generated against that old id both need elevated,
  // cross-id trust that a plain ownership rule can't express — done
  // server-side in finalizeStaffInviteClaim instead. See that function's
  // comment and firestore.rules' staff create/delete rule for why.
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const { getApp } = await import("firebase/app");
  const finalize = httpsCallable(getFunctions(getApp(), "us-central1"), "finalizeStaffInviteClaim");
  await finalize({ shopId, staffId });

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

      // 2b. Release the account's Search Console property (if any) before the
      // doc that names it is gone — best-effort, must not block deletion.
      if (userData.customDomain || userData.bookingSlug) {
        const { getFunctions, httpsCallable } = await import("firebase/functions");
        const { getApp } = await import("firebase/app");
        const removeProperty = httpsCallable(getFunctions(getApp(), "us-central1"), "removeSearchConsoleProperty");
        await removeProperty().catch(() => {});
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

export async function resetBarberPassword(email) {
  return await sendPasswordResetEmail(auth, email, { url: "https://bookrightly.co.uk/login" });
}

export async function logoutBarber() {
  return await signOut(auth);
}
