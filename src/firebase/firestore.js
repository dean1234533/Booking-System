import { db, storage } from "./config"; 
import { 
  doc, updateDoc, getDoc, collection, 
  getDocs, query, orderBy, addDoc, deleteDoc, where, setDoc 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";

export { db };

// ─── SHOP & BARBER PROFILE ───────────────────

export const getBarber = async (uid) => {
  if (!uid) return null;
  const docRef = doc(db, "barbers", uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const getBarberById = getBarber;

export const getBarberByDomain = async (rawDomain) => {
  if (!rawDomain) return null;

  // Normalise: strip protocol prefix and trailing slash so queries always match.
  // Stored values like "my-shop.co.uk" will match "https://my-shop.co.uk/" etc.
  const domain = rawDomain
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();

  // 1. Check customDomain field first — new field used for Cloudflare Pages barbers
  const customSnap = await getDocs(
    query(collection(db, "barbers"), where("customDomain", "==", domain))
  );
  if (!customSnap.empty) {
    const d = customSnap.docs[0];
    return { id: d.id, ...d.data() };
  }

  // 2. Fall back to vercelUrl — legacy field, keeps all existing barbers working
  //    without any data migration needed
  const vercelSnap = await getDocs(
    query(collection(db, "barbers"), where("vercelUrl", "==", domain))
  );
  if (!vercelSnap.empty) {
    const d = vercelSnap.docs[0];
    return { id: d.id, ...d.data() };
  }

  return null;
};

export const getAllBarbers = async () => {
  const snap = await getDocs(collection(db, "barbers"));
  const rawData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return rawData.filter(barber => {
    const hasValidName = 
      barber.name && 
      barber.name.trim().length > 1 && 
      barber.name !== "undefined" && 
      barber.name !== "null";

    const hasValidBusiness = 
      barber.businessName && 
      barber.businessName.trim().length > 1 && 
      barber.businessName !== "undefined" && 
      barber.businessName !== "null";

    return hasValidName || hasValidBusiness;
  });
};

export const updateBarber = async (uid, data, isStaff = false, shopId = null) => {
  const docRef = (isStaff && shopId && shopId !== uid)
    ? doc(db, "barbers", shopId, "staff", uid)
    : doc(db, "barbers", uid);
    
  // Ensure businessType field updates are safely processed 
  const mergedData = {
    ...data,
    businessType: data?.businessType || "barber"
  };
  
  return await setDoc(docRef, mergedData, { merge: true });
};

// ─── SLOT MANAGEMENT (TYPE-AGNOSTIC) ──────────────────────────────

export const getOpenSlots = async (shopId, staffId = null) => {
  let targetId = staffId || shopId;
  if (!targetId) return [];

  try {
    const barberDoc = await getDoc(doc(db, "barbers", targetId));
    if (barberDoc.exists()) {
      const data = barberDoc.data();
      if (data.uid && data.uid !== targetId) {
        targetId = data.uid;
      }
    }

    const slotsRef = collection(db, "slots");
    const q = query(slotsRef, where("barberId", "==", targetId));

    const snap = await getDocs(q);
    const allSlots = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const availableSlots = allSlots.filter(slot => {
      const isNotBooked = slot.isBooked === false || slot.isBooked === "false";
      const isOpen = slot.status === "open" || !slot.status;
      return isNotBooked || isOpen;
    });

    return availableSlots.sort((a, b) => {
      const dateA = new Date(`${a.date.replaceAll('/', '-')}T${a.time}`);
      const dateB = new Date(`${b.date.replaceAll('/', '-')}T${b.time}`);
      return dateA - dateB;
    });

  } catch (error) {
    console.error("Critical Error in getOpenSlots:", error);
    return [];
  }
};

export const addSlot = async (slotData) => {
  const { barberId, shopId, isStaff, date, time } = slotData;
  const slotsRef = collection(db, "slots");
  const normalizedDate = date.replaceAll('/', '-');

  return await addDoc(slotsRef, {
    date: normalizedDate,
    time,
    barberId,
    shopId: shopId || barberId,
    isStaff: !!isStaff,
    isBooked: false, 
    status: "open",
    createdAt: new Date().toISOString()
  });
};

export const getProfessionalSlots = async (uid) => {
  if (!uid) return []; 
  const slotsRef = collection(db, "slots");
  const q = query(slotsRef, where("barberId", "==", uid));
  const snap = await getDocs(q);
  const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  return data.sort((a, b) => {
    const dateA = new Date(`${a.date.replaceAll('/', '-')}T${a.time}`);
    const dateB = new Date(`${b.date.replaceAll('/', '-')}T${b.time}`);
    return dateA - dateB;
  });
};

export const deleteSlot = async (barberId, slotId) => {
  if (!slotId) return;
  const slotRef = doc(db, "slots", slotId);
  await deleteDoc(slotRef);
};

// ─── BOOKINGS & CANCELLATIONS ────────────────────────────────

export const getBooking = async (id) => {
  if (!id) return null;
  try {
    const docRef = doc(db, "bookings", id);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error("Error fetching booking:", error);
    return null;
  }
};

export const createBooking = async (bookingData) => {
  const bookingsRef = collection(db, "bookings");
  const newBookingRef = doc(bookingsRef);
  await setDoc(newBookingRef, { 
    ...bookingData, 
    status: "confirmed", 
    createdAt: new Date().toISOString() 
  });
  return newBookingRef.id;
};

export const cancelBooking = async (bookingId, slotId, barberId) => {
  if (!bookingId) return;

  const bookingRef = doc(db, "bookings", bookingId);
  await updateDoc(bookingRef, {
    status: "cancelled",
    cancelledAt: new Date().toISOString()
  });

  if (slotId) {
    try {
      const slotRef = doc(db, "slots", slotId);
      await updateDoc(slotRef, {
        isBooked: false,
        status: "open"
      });
    } catch (err) {
      console.error("Failed to reopen slot:", err);
    }
  }
};

// ─── ASSETS & STAFF ───────────────────────────────────────────

export const getShopStaff = async (shopId) => {
  if (!shopId) return [];
  const staffRef = collection(db, "barbers", shopId, "staff");
  const snap = await getDocs(staffRef);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data(), shopId }));
};

export const uploadBarberImage = async (file, fileName, barberId, isStaff = false, shopId = null) => {
  if (!file || !barberId) return null;
  const options = { maxSizeMB: 0.2, maxWidthOrHeight: 800, useWebWorker: true, fileType: "image/jpeg" };
  try {
    const compressedFile = await imageCompression(file, options);
    const path = (isStaff && shopId) 
      ? `barbers/${shopId}/staff/${barberId}/${fileName}`
      : `barbers/${barberId}/${fileName}`;
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, compressedFile);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
};