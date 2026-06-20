// src/hooks/useSlots.js
// Fetches open slots for a given barber. Used on BarberProfile page.

import { useState, useEffect } from "react";
import { getOpenSlots } from "../firebase/firestore";

export function useSlots(barberId) {
  const [slots,   setSlots]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!barberId) return;
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      try {
        const data = await getOpenSlots(barberId);
        if (!cancelled) setSlots(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [barberId]);

  return { slots, loading, error };
}
