import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc, // Changed from updateDoc
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, COLLECTIONS } from "./config";

// --- BARBERS ---

export async function getAllBarbers() {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.BARBERS), orderBy("createdAt", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getBarber(barberId) {
  const snap = await getDoc(doc(db, COLLECTIONS.BARBERS, barberId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// FIX: Using setDoc with merge allows creation of new profiles
export async function updateBarber(barberId, fields) {
  const docRef = doc(db, COLLECTIONS.BARBERS, barberId);
  await setDoc(docRef, fields, { merge: true });
}

export async function deleteBarber(barberId) {
  const slotsSnap = await getDocs(
    query(collection(db, COLLECTIONS.SLOTS), where("barberId", "==", barberId))
  );
  const deleteSlots = slotsSnap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deleteSlots);
  await deleteDoc(doc(db, COLLECTIONS.BARBERS, barberId));
}

// --- SLOTS ---

export async function addSlot({ barberId, date, time }) {
  const ref = await addDoc(collection(db, COLLECTIONS.SLOTS), {
    barberId,
    date,
    time,
    status: "open",
    bookingId: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getOpenSlots(barberId) {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.SLOTS),
      where("barberId", "==", barberId),
      where("status", "==", "open"),
      orderBy("date", "asc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllSlotsForBarber(barberId) {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.SLOTS),
      where("barberId", "==", barberId),
      orderBy("date", "asc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteSlot(slotId) {
  await deleteDoc(doc(db, COLLECTIONS.SLOTS, slotId));
}

// --- BOOKINGS ---

export async function createBooking(data) {
  const ref = await addDoc(collection(db, COLLECTIONS.BOOKINGS), {
    ...data,
    depositPaid: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getBookingsForBarber(barberId) {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.BOOKINGS),
      where("barberId", "==", barberId),
      orderBy("slotDate", "asc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}