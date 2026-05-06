import { db, storage } from "./config";
import { 
  doc, updateDoc, getDoc, collection, 
  getDocs, query, orderBy, addDoc, deleteDoc, where, setDoc 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";

// --- BARBER PROFILE & LISTING ---
export const getAllBarbers = async () => {
  const snap = await getDocs(collection(db, "barbers"));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getBarber = async (uid) => {
  if (!uid) return null;
  const docRef = doc(db, "barbers", uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const updateBarber = async (uid, data) => {
  const docRef = doc(db, "barbers", uid);
  return await setDoc(docRef, data, { merge: true });
};

/**
 * STRIPE CONNECT HELPER
 * Saves the barber's unique Stripe Account ID (acct_...) after onboarding.
 */
export const saveBarberStripeId = async (barberId, stripeId) => {
  const barberRef = doc(db, "barbers", barberId);
  return await updateDoc(barberRef, {
    stripeAccountId: stripeId,
    stripeEnabled: true // Flag to show "Payment Ready" in UI
  });
};

export const uploadBarberImage = async (file, uid) => {
  if (!file) return null;
  const options = { maxSizeMB: 0.2, maxWidthOrHeight: 600, useWebWorker: true, fileType: "image/jpeg" };
  try {
    const compressedFile = await imageCompression(file, options);
    const storageRef = ref(storage, `barbers/${uid}/profile.jpg`);
    const snapshot = await uploadBytes(storageRef, compressedFile);
    const downloadURL = await getDownloadURL(snapshot.ref);
    await updateDoc(doc(db, "barbers", uid), { profilePic: downloadURL });
    return downloadURL;
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
};

// --- SLOT MANAGEMENT ---
export const getOpenSlots = async (barberId) => {
  if (!barberId) return [];
  const slotsRef = collection(db, "barbers", barberId, "slots");
  const q = query(slotsRef, orderBy("date", "asc"));
  const snap = await getDocs(q);
  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(slot => slot.isBooked === false);
};

export const getProfessionalSlots = async (barberId) => {
  if (!barberId) return [];
  const slotsRef = collection(db, "barbers", barberId, "slots");
  const q = query(slotsRef, orderBy("date", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getSlot = async (barberId, slotId) => {
  if (!barberId || !slotId) return null;
  const snap = await getDoc(doc(db, "barbers", barberId, "slots", slotId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const addSlot = async (slotData) => {
  const slotsRef = collection(db, "barbers", slotData.barberId, "slots");
  return await addDoc(slotsRef, { ...slotData, isBooked: false, status: "open" });
};

export const deleteSlot = async (barberId, slotId) => {
  await deleteDoc(doc(db, "barbers", barberId, "slots", slotId));
};

// --- BOOKINGS & CANCELLATION ---
export const getBooking = async (id) => {
  if (!id) return null;
  const snap = await getDoc(doc(db, "bookings", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getBookingsForBarber = async (barberId) => {
  if (!barberId) return [];
  const q = query(collection(db, "bookings"), where("barberId", "==", barberId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createBooking = async (bookingData) => {
  // 1. Create the booking document
  const docRef = await addDoc(collection(db, "bookings"), {
    ...bookingData,
    status: "confirmed",
    createdAt: new Date().toISOString()
  });
  
  // 2. Mark the slot as taken
  const slotRef = doc(db, "barbers", bookingData.barberId, "slots", bookingData.slotId);
  await updateDoc(slotRef, { isBooked: true, status: "booked" });
  
  return docRef.id;
};

export const cancelBooking = async (bookingId, slotId, barberId) => {
  // 1. Mark booking as cancelled
  await updateDoc(doc(db, "bookings", bookingId), { 
    status: "cancelled", 
    cancelled: true 
  });
  // 2. Open the slot back up
  if (barberId && slotId) {
    await updateDoc(doc(db, "barbers", barberId, "slots", slotId), { 
      isBooked: false, 
      status: "open" 
    });
  }
};

// Aliases for compatibility
export const bookSlot = createBooking;