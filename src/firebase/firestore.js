import { db, storage } from "./config";
import {
  doc, updateDoc, getDoc, collection,
  getDocs, query, orderBy, addDoc, deleteDoc, where, setDoc,
  limit, onSnapshot, writeBatch, serverTimestamp, documentId
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

  // Normalise: strip protocol, trailing slash, and www. prefix.
  // We always store the bare domain (no www), so both bellaflorjewellery.co.uk
  // and www.bellaflorjewellery.co.uk resolve to the same tenant.
  const domain = rawDomain
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase()
    .replace(/^www\./, "");

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

// ─── FAVORITE EXERCISES (Exercise Generator) ───────────────────

export const saveFavoriteExercise = async (trainerId, exercise) => {
  if (!trainerId || !exercise?.id) throw new Error("Missing trainerId or exercise");
  try {
    const favRef = doc(db, "barbers", trainerId, "favoriteExercises", exercise.id);
    await setDoc(favRef, {
      ...exercise,
      savedAt: new Date().toISOString(),
    });
    return exercise.id;
  } catch (error) {
    console.error("Failed to save favorite exercise:", error);
    throw error;
  }
};

export const deleteFavoriteExercise = async (trainerId, exerciseId) => {
  if (!trainerId || !exerciseId) throw new Error("Missing trainerId or exerciseId");
  try {
    const favRef = doc(db, "barbers", trainerId, "favoriteExercises", exerciseId);
    await deleteDoc(favRef);
  } catch (error) {
    console.error("Failed to delete favorite exercise:", error);
    throw error;
  }
};

export const getFavoriteExercises = async (trainerId) => {
  if (!trainerId) return [];
  try {
    const favRef = collection(db, "barbers", trainerId, "favoriteExercises");
    const snap = await getDocs(favRef);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Failed to fetch favorite exercises:", error);
    return [];
  }
};

// ─── SESSION PREP (PT Dashboard) ───────────────────

export const getUpcomingBookings = async (trainerId, hoursAhead = 2) => {
  if (!trainerId) return [];
  try {
    const today = new Date().toISOString().split('T')[0];
    const bookings = await getDocs(
      query(
        collection(db, "bookings"),
        where("barberId", "==", trainerId),
        where("status", "==", "confirmed"),
        where("date", "==", today)
      )
    );

    const now = new Date();
    const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    return bookings.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((b) => {
        const [h, m] = (b.time || "00:00").split(':');
        const sessionTime = new Date();
        sessionTime.setHours(parseInt(h), parseInt(m), 0, 0);
        return sessionTime > now && sessionTime < cutoff;
      })
      .sort((a, b) => {
        const timeA = new Date(`${a.date}T${a.time}`);
        const timeB = new Date(`${b.date}T${b.time}`);
        return timeA - timeB;
      });
  } catch (error) {
    console.error("Failed to fetch upcoming bookings:", error);
    return [];
  }
};

export const getClientWorkout = async (trainerId, clientName) => {
  if (!trainerId || !clientName) return null;
  try {
    const workoutPlans = await getDocs(
      collection(db, "barbers", trainerId, "workoutPlans")
    );

    const plan = workoutPlans.docs.find((doc) => {
      const planName = (doc.data().name || "").toLowerCase();
      return planName.includes(clientName.toLowerCase());
    });

    return plan ? { id: plan.id, ...plan.data() } : null;
  } catch (error) {
    console.error("Failed to fetch client workout:", error);
    return null;
  }
};

export const getClientParQ = async (trainerId, clientName) => {
  if (!trainerId || !clientName) return null;
  try {
    const submissions = await getDocs(
      collection(db, "barbers", trainerId, "parQSubmissions")
    );

    const clientSubmissions = submissions.docs
      .filter((doc) =>
        (doc.data().clientName || "").toLowerCase() === clientName.toLowerCase()
      )
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    return clientSubmissions.length > 0 ? clientSubmissions[0] : null;
  } catch (error) {
    console.error("Failed to fetch client PAR-Q:", error);
    return null;
  }
};

export const getClientCheckIn = async (trainerId, clientName) => {
  if (!trainerId || !clientName) return null;
  try {
    const today = new Date().toISOString().split('T')[0];

    const checkIns = await getDocs(
      collection(db, "barbers", trainerId, "checkInSubmissions")
    );

    return checkIns.docs
      .map((doc) => doc.data())
      .find(
        (ci) =>
          (ci.clientName || "").toLowerCase() === clientName.toLowerCase() &&
          (ci.date || "").startsWith(today)
      ) || null;
  } catch (error) {
    console.error("Failed to fetch client check-in:", error);
    return null;
  }
};

// ─── NOTEPAD (PT Dashboard) ───────────────────

export const getNotepadCategories = async (trainerId) => {
  if (!trainerId) return [];
  try {
    const categoriesRef = collection(db, "barbers", trainerId, "notepadCategories");
    const snap = await getDocs(categoriesRef);
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      notes: (doc.data().notes || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    }));
  } catch (error) {
    console.error("Failed to fetch notepad categories:", error);
    return [];
  }
};

export const createNotepadCategory = async (trainerId, categoryName) => {
  if (!trainerId || !categoryName) throw new Error("Missing trainerId or categoryName");
  try {
    const categoryId = categoryName.toLowerCase().replace(/\s+/g, "-");
    const categoryRef = doc(db, "barbers", trainerId, "notepadCategories", categoryId);
    await setDoc(categoryRef, {
      name: categoryName,
      notes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return categoryId;
  } catch (error) {
    console.error("Failed to create notepad category:", error);
    throw error;
  }
};

export const addNoteToCategory = async (trainerId, categoryId, noteText) => {
  if (!trainerId || !categoryId || !noteText) throw new Error("Missing parameters");
  try {
    const categoryRef = doc(db, "barbers", trainerId, "notepadCategories", categoryId);
    const categorySnap = await getDoc(categoryRef);

    if (!categorySnap.exists()) throw new Error("Category not found");

    const notes = categorySnap.data().notes || [];
    const newNote = {
      id: `note-${Date.now()}`,
      text: noteText,
      createdAt: new Date().toISOString(),
    };

    notes.push(newNote);

    await updateDoc(categoryRef, {
      notes: notes,
      updatedAt: new Date().toISOString(),
    });

    return newNote;
  } catch (error) {
    console.error("Failed to add note:", error);
    throw error;
  }
};

export const updateNote = async (trainerId, categoryId, noteId, newText) => {
  if (!trainerId || !categoryId || !noteId || !newText) throw new Error("Missing parameters");
  try {
    const categoryRef = doc(db, "barbers", trainerId, "notepadCategories", categoryId);
    const categorySnap = await getDoc(categoryRef);

    if (!categorySnap.exists()) throw new Error("Category not found");

    const notes = categorySnap.data().notes || [];
    const noteIndex = notes.findIndex((n) => n.id === noteId);

    if (noteIndex === -1) throw new Error("Note not found");

    notes[noteIndex].text = newText;
    notes[noteIndex].updatedAt = new Date().toISOString();

    await updateDoc(categoryRef, {
      notes: notes,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to update note:", error);
    throw error;
  }
};

export const deleteNote = async (trainerId, categoryId, noteId) => {
  if (!trainerId || !categoryId || !noteId) throw new Error("Missing parameters");
  try {
    const categoryRef = doc(db, "barbers", trainerId, "notepadCategories", categoryId);
    const categorySnap = await getDoc(categoryRef);

    if (!categorySnap.exists()) throw new Error("Category not found");

    const notes = (categorySnap.data().notes || []).filter((n) => n.id !== noteId);

    await updateDoc(categoryRef, {
      notes: notes,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to delete note:", error);
    throw error;
  }
};

export const deleteNotepadCategory = async (trainerId, categoryId) => {
  if (!trainerId || !categoryId) throw new Error("Missing parameters");
  try {
    const categoryRef = doc(db, "barbers", trainerId, "notepadCategories", categoryId);
    await deleteDoc(categoryRef);
  } catch (error) {
    console.error("Failed to delete category:", error);
    throw error;
  }
};

// ─── CALENDAR SYNC ───────────────────────────

export const getCalendarSettings = async (userId) => {
  if (!userId) return null;
  try {
    const settingsRef = doc(db, "barbers", userId, "calendarSettings", "settings");
    const snap = await getDoc(settingsRef);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error("Failed to fetch calendar settings:", error);
    return null;
  }
};

export const updateCalendarSettings = async (userId, settings) => {
  if (!userId) throw new Error("Missing userId");
  try {
    const settingsRef = doc(db, "barbers", userId, "calendarSettings", "settings");
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error("Failed to update calendar settings:", error);
    throw error;
  }
};

export const saveCalendarTokens = async (userId, tokens) => {
  if (!userId || !tokens) throw new Error("Missing userId or tokens");
  try {
    const settingsRef = doc(db, "barbers", userId, "calendarSettings", "settings");
    await setDoc(settingsRef, {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      tokenExpiresAt: tokens.expiry_date,
      googleCalendarId: tokens.calendar_id || "primary",
      linkedEmail: tokens.email,
      syncEnabled: true,
      lastSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error("Failed to save calendar tokens:", error);
    throw error;
  }
};

export const disconnectCalendar = async (userId) => {
  if (!userId) throw new Error("Missing userId");
  try {
    const settingsRef = doc(db, "barbers", userId, "calendarSettings", "settings");
    await setDoc(settingsRef, {
      googleAccessToken: null,
      googleRefreshToken: null,
      tokenExpiresAt: null,
      syncEnabled: false,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error("Failed to disconnect calendar:", error);
    throw error;
  }
};

// ─── PT CLIENT MANAGEMENT ────────────────────────

// Create or update client profile
export const saveClientProfile = async (trainerId, clientId, clientData) => {
  if (!trainerId || !clientId) throw new Error("Missing trainerId or clientId");
  try {
    const clientRef = doc(db, "barbers", trainerId, "clients", clientId);
    await setDoc(clientRef, {
      ...clientData,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error("Failed to save client profile:", error);
    throw error;
  }
};

// Get client profile
export const getClientProfile = async (trainerId, clientId) => {
  if (!trainerId || !clientId) return null;
  try {
    const clientRef = doc(db, "barbers", trainerId, "clients", clientId);
    const snap = await getDoc(clientRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error("Failed to fetch client profile:", error);
    return null;
  }
};

// Get or create client from booking
export const getOrCreateClient = async (trainerId, bookingId, clientData) => {
  if (!trainerId || !bookingId) throw new Error("Missing trainerId or bookingId");
  try {
    // Use bookingId as clientId for consistency
    const clientRef = doc(db, "barbers", trainerId, "clients", bookingId);
    const snap = await getDoc(clientRef);

    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }

    // Create new client from booking data
    const newClientData = {
      bookingId: bookingId,
      customerName: clientData.name || clientData.customerName,
      customerEmail: clientData.email || clientData.customerEmail,
      customerPhone: clientData.phone || clientData.customerPhone,
      createdAt: new Date().toISOString(),
      lastSessionDate: null,
      totalSessions: 0,
      ...clientData,
    };

    await setDoc(clientRef, newClientData);
    return { id: bookingId, ...newClientData };
  } catch (error) {
    console.error("Failed to get or create client:", error);
    throw error;
  }
};

// Search clients by name
export const searchClients = async (trainerId, searchTerm) => {
  if (!trainerId || !searchTerm) return [];
  try {
    const clientsRef = collection(db, "barbers", trainerId, "clients");
    const snap = await getDocs(clientsRef);

    const searchLower = searchTerm.toLowerCase();
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((client) =>
        (client.customerName || "").toLowerCase().includes(searchLower) ||
        (client.customerEmail || "").toLowerCase().includes(searchLower)
      )
      .sort((a, b) => (a.customerName || "").localeCompare(b.customerName || ""));
  } catch (error) {
    console.error("Failed to search clients:", error);
    return [];
  }
};

// Get all clients for a trainer
export const getClientsList = async (trainerId) => {
  if (!trainerId) return [];
  try {
    const clientsRef = collection(db, "barbers", trainerId, "clients");
    const snap = await getDocs(clientsRef);
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    console.error("Failed to fetch clients list:", error);
    return [];
  }
};

// ─── CLIENT MESSAGING ────────────────────────────

// Add message
export const addMessage = async (trainerId, clientId, message) => {
  if (!trainerId || !clientId || !message) throw new Error("Missing required fields");
  try {
    const messagesRef = collection(db, "barbers", trainerId, "clients", clientId, "messages");
    const docRef = await addDoc(messagesRef, {
      ...message,
      createdAt: serverTimestamp(),
      isRead: false,
    });
    return docRef.id;
  } catch (error) {
    console.error("Failed to add message:", error);
    throw error;
  }
};

// Get messages for client
export const getMessages = async (trainerId, clientId, limit = 50) => {
  if (!trainerId || !clientId) return [];
  try {
    const messagesRef = collection(db, "barbers", trainerId, "clients", clientId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "desc"), limit(limit));
    const snap = await getDocs(q);
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .reverse();
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return [];
  }
};

// Mark messages as read
export const markMessagesRead = async (trainerId, clientId, messageIds = null) => {
  if (!trainerId || !clientId) throw new Error("Missing trainerId or clientId");
  try {
    const messagesRef = collection(db, "barbers", trainerId, "clients", clientId, "messages");
    const q = messageIds
      ? query(messagesRef, where(documentId(), "in", messageIds))
      : query(messagesRef, where("isRead", "==", false));

    const snap = await getDocs(q);
    const batch = writeBatch(db);

    snap.docs.forEach((doc) => {
      batch.update(doc.ref, { isRead: true });
    });

    await batch.commit();
  } catch (error) {
    console.error("Failed to mark messages as read:", error);
    throw error;
  }
};

// Real-time message listener
export const onMessagesUpdate = (trainerId, clientId, callback) => {
  if (!trainerId || !clientId) return () => {};

  const messagesRef = collection(db, "barbers", trainerId, "clients", clientId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "desc"), limit(100));

  return onSnapshot(q, (snap) => {
    const messages = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .reverse();
    callback(messages);
  });
};

// ─── CLIENT ACTIVITY TRACKING ────────────────────

// Log activity (workout)
export const logActivity = async (trainerId, clientId, activityData) => {
  if (!trainerId || !clientId) throw new Error("Missing trainerId or clientId");
  try {
    const activitiesRef = collection(db, "barbers", trainerId, "clients", clientId, "activities");
    const docRef = await addDoc(activitiesRef, {
      ...activityData,
      createdAt: serverTimestamp(),
    });

    // Update client's lastSessionDate
    await saveClientProfile(trainerId, clientId, {
      lastSessionDate: new Date().toISOString(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Failed to log activity:", error);
    throw error;
  }
};

// Get client activities
export const getClientActivities = async (trainerId, clientId, days = 30) => {
  if (!trainerId || !clientId) return [];
  try {
    const activitiesRef = collection(db, "barbers", trainerId, "clients", clientId, "activities");
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const q = query(
      activitiesRef,
      where("createdAt", ">=", cutoffDate),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    return [];
  }
};

// ─── CONSULTATION NOTES ──────────────────────────

// Save consultation note
export const saveConsultation = async (trainerId, clientId, consultationData) => {
  if (!trainerId || !clientId) throw new Error("Missing trainerId or clientId");
  try {
    const consultationsRef = collection(
      db,
      "barbers",
      trainerId,
      "clients",
      clientId,
      "consultationNotes"
    );

    const docRef = await addDoc(consultationsRef, {
      ...consultationData,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Failed to save consultation:", error);
    throw error;
  }
};

// Get consultations by category
export const getConsultationsByCategory = async (trainerId, clientId, category) => {
  if (!trainerId || !clientId || !category) return [];
  try {
    const consultationsRef = collection(
      db,
      "barbers",
      trainerId,
      "clients",
      clientId,
      "consultationNotes"
    );

    const snap = await getDocs(consultationsRef);
    return snap.docs
      .filter((doc) => {
        const categories = doc.data().categories || [];
        return categories.includes(category);
      })
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error("Failed to fetch consultations by category:", error);
    return [];
  }
};

// Get all consultations for client
export const getClientConsultations = async (trainerId, clientId, limit = 50) => {
  if (!trainerId || !clientId) return [];
  try {
    const consultationsRef = collection(
      db,
      "barbers",
      trainerId,
      "clients",
      clientId,
      "consultationNotes"
    );

    const q = query(consultationsRef, orderBy("createdAt", "desc"), limit(limit));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Failed to fetch consultations:", error);
    return [];
  }
};

// Search consultations by transcript keyword
export const searchConsultations = async (trainerId, clientId, searchTerm) => {
  if (!trainerId || !clientId || !searchTerm) return [];
  try {
    const consultationsRef = collection(
      db,
      "barbers",
      trainerId,
      "clients",
      clientId,
      "consultationNotes"
    );

    const snap = await getDocs(consultationsRef);
    const searchLower = searchTerm.toLowerCase();

    return snap.docs
      .filter((doc) => {
        const transcript = (doc.data().transcript || "").toLowerCase();
        return transcript.includes(searchLower);
      })
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error("Failed to search consultations:", error);
    return [];
  }
};

// ─── NUTRITION PLANS ──────────────────────────────────────────────────

export const saveNutritionPlan = async (trainerId, clientId, planData) => {
  if (!trainerId || !clientId) throw new Error("Missing trainerId or clientId");
  try {
    const planRef = doc(db, "barbers", trainerId, "clients", clientId, "nutritionPlans", "current");
    await setDoc(planRef, {
      ...planData,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("Failed to save nutrition plan:", error);
    throw error;
  }
};

export const getNutritionPlan = async (trainerId, clientId) => {
  if (!trainerId || !clientId) return null;
  try {
    const planRef = doc(db, "barbers", trainerId, "clients", clientId, "nutritionPlans", "current");
    const snap = await getDoc(planRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error("Failed to fetch nutrition plan:", error);
    return null;
  }
};

export const addCustomFood = async (trainerId, foodData) => {
  if (!trainerId) throw new Error("Missing trainerId");
  try {
    const customFoodsRef = collection(db, "barbers", trainerId, "customFoods");
    const docRef = await addDoc(customFoodsRef, {
      ...foodData,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, ...foodData };
  } catch (error) {
    console.error("Failed to add custom food:", error);
    throw error;
  }
};

export const getCustomFoods = async (trainerId) => {
  if (!trainerId) return [];
  try {
    const customFoodsRef = collection(db, "barbers", trainerId, "customFoods");
    const snap = await getDocs(customFoodsRef);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Failed to fetch custom foods:", error);
    return [];
  }
};

export const deleteCustomFood = async (trainerId, foodId) => {
  if (!trainerId || !foodId) throw new Error("Missing trainerId or foodId");
  try {
    const foodRef = doc(db, "barbers", trainerId, "customFoods", foodId);
    await deleteDoc(foodRef);
  } catch (error) {
    console.error("Failed to delete custom food:", error);
    throw error;
  }
};

// ─── AUTOMATION SCHEDULES ──────────────────────────────────────────────────

export const createAutomationSchedule = async (trainerId, scheduleData) => {
  if (!trainerId) throw new Error("Missing trainerId");
  try {
    const schedulesRef = collection(db, "barbers", trainerId, "automationSchedules");
    const docRef = await addDoc(schedulesRef, {
      ...scheduleData,
      enabled: true,
      createdAt: serverTimestamp(),
      lastSent: null,
      nextSend: new Date(scheduleData.nextSend).toISOString(),
    });
    return { id: docRef.id, ...scheduleData };
  } catch (error) {
    console.error("Failed to create automation schedule:", error);
    throw error;
  }
};

export const getAutomationSchedules = async (trainerId) => {
  if (!trainerId) return [];
  try {
    const schedulesRef = collection(db, "barbers", trainerId, "automationSchedules");
    const snap = await getDocs(schedulesRef);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Failed to fetch automation schedules:", error);
    return [];
  }
};

export const updateAutomationSchedule = async (trainerId, scheduleId, updates) => {
  if (!trainerId || !scheduleId) throw new Error("Missing trainerId or scheduleId");
  try {
    const scheduleRef = doc(db, "barbers", trainerId, "automationSchedules", scheduleId);
    await updateDoc(scheduleRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to update automation schedule:", error);
    throw error;
  }
};

export const deleteAutomationSchedule = async (trainerId, scheduleId) => {
  if (!trainerId || !scheduleId) throw new Error("Missing trainerId or scheduleId");
  try {
    const scheduleRef = doc(db, "barbers", trainerId, "automationSchedules", scheduleId);
    await deleteDoc(scheduleRef);
  } catch (error) {
    console.error("Failed to delete automation schedule:", error);
    throw error;
  }
};

export const getAutomationHistory = async (trainerId, scheduleId, limit = 50) => {
  if (!trainerId || !scheduleId) return [];
  try {
    const historyRef = collection(
      db,
      "barbers",
      trainerId,
      "automationSchedules",
      scheduleId,
      "sentHistory"
    );
    const snap = await getDocs(
      query(historyRef, orderBy("sentAt", "desc"), limit(limit))
    );
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Failed to fetch automation history:", error);
    return [];
  }
};

export const recordAutomationSend = async (trainerId, scheduleId, sendData) => {
  if (!trainerId || !scheduleId) throw new Error("Missing trainerId or scheduleId");
  try {
    const historyRef = collection(
      db,
      "barbers",
      trainerId,
      "automationSchedules",
      scheduleId,
      "sentHistory"
    );
    await addDoc(historyRef, {
      ...sendData,
      sentAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to record automation send:", error);
    throw error;
  }
};