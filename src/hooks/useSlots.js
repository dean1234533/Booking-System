import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

export function useSlots(barberId) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!barberId) return;

    // ✅ FIX: Point to the TOP-LEVEL collection shown in your screenshot
    const slotsRef = collection(db, "slots");

    // ✅ Match your composite index: barberId + isBooked + date + time
    const q = query(
      slotsRef,
      where("barberId", "==", barberId),
      where("isBooked", "==", false),
      orderBy("date", "asc"),
      orderBy("time", "asc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedSlots = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      // Secondary filter for 'open' status as a safety measure
      const openSlots = fetchedSlots.filter(s => 
        !s.status || s.status.toLowerCase() === "open"
      );
      
      setSlots(openSlots);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Query Error:", err);
      setError("Failed to load slots.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [barberId]);

  return { slots, loading, error };
}