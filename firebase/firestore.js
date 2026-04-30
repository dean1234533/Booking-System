// src/firebase/firestore.js
// All Firestore read/write helpers for barbers, slots and bookings.
// Pages and hooks import from here — nothing imports firebase directly.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, COLLECTIONS } from "./config";

// ════════════════════════════════════════════════════════════
// BARBERS
// ════════════════════════════════════════════════════════════

// Fetch all barbers — used on the Home page grid
export async function getAllBarbers() {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.BARBERS), orderBy("createdAt", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Fetch a single barber by uid — used on BarberProfile page
export async function getBarber(barberId) {
  const snap = await getDoc(doc(db, COLLECTIONS.BARBERS, barberId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// Update barber profile fields — called from Dashboard
export async function updateBarber(barberId, fields) {
  await updateDoc(doc(db, COLLECTIONS.BARBERS, barberId), fields);
}

// Delete barber profile + all their slots — called when a barber leaves
// Bookings are kept for record-keeping purposes
export async function deleteBarber(barberId) {
  // Delete all slots belonging to this barber
  const slotsSnap = await getDocs(
    query(collection(db, COLLECTIONS.SLOTS), where("barberId", "==", barberId))
  );
  const deleteSlots = slotsSnap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deleteSlots);

  // Delete the barber document itself
  await deleteDoc(doc(db, COLLECTIONS.BARBERS, barberId));
}

// ════════════════════════════════════════════════════════════
// SLOTS
// ════════════════════════════════════════════════════════════

// Add a new time slot — called from Dashboard availability picker
export async function addSlot({ barberId, date, time }) {
  const ref = await addDoc(collection(db, COLLECTIONS.SLOTS), {
    barberId,
    date,        // JS Date object — Firestore converts to Timestamp
    time,        // e.g. "10:00"
    status: "open",
    bookingId: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// Fetch all open slots for a barber — used on BarberProfile for clients
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

// Fetch ALL slots for a barber — used in Dashboard so barber sees everything
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

// Fetch a single slot by id — used on BookingForm
export async function getSlot(slotId) {
  const snap = await getDoc(doc(db, COLLECTIONS.SLOTS, slotId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// Mark a slot as booked — called after successful Stripe payment
export async function bookSlot(slotId, bookingId) {
  await updateDoc(doc(db, COLLECTIONS.SLOTS, slotId), {
    status: "booked",
    bookingId,
  });
}

// Reopen a slot — called from Dashboard when barber cancels a booking
export async function reopenSlot(slotId) {
  await updateDoc(doc(db, COLLECTIONS.SLOTS, slotId), {
    status: "open",
    bookingId: null,
  });
}

// Delete a slot — barber removes an availability window entirely
export async function deleteSlot(slotId) {
  await deleteDoc(doc(db, COLLECTIONS.SLOTS, slotId));
}

// ════════════════════════════════════════════════════════════
// BOOKINGS
// ════════════════════════════════════════════════════════════

// Create a booking document — called after Stripe payment succeeds
export async function createBooking({
  slotId,
  barberId,
  clientName,
  clientEmail,
  clientPhone,
  haircutStyle,
  gender,
  depositAmount,
  stripePaymentIntentId,
  slotDate,
}) {
  const ref = await addDoc(collection(db, COLLECTIONS.BOOKINGS), {
    slotId,
    barberId,
    clientName,
    clientEmail,
    clientPhone,
    haircutStyle,
    gender,
    depositAmount,
    depositPaid: true,
    stripePaymentIntentId,
    slotDate,      // Timestamp copy used for 24hr refund check
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// Fetch a single booking — used on Confirmation page
export async function getBooking(bookingId) {
  const snap = await getDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// Fetch all bookings for a barber — used in Dashboard
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

// Cancel a booking — reopens slot and triggers refund check in the caller
export async function cancelBooking(bookingId, slotId) {
  await updateDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId), {
    cancelled: true,
    cancelledAt: serverTimestamp(),
  });
  await reopenSlot(slotId);
}
