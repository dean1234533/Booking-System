// src/hooks/useBarbers.js
// Fetches all barbers from Firestore. Used on the Home page.

import { useState, useEffect } from "react";
import { getAllBarbers } from "../firebase/firestore";

export function useBarbers() {
  const [barbers, setBarbers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        const data = await getAllBarbers();
        if (!cancelled) setBarbers(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { barbers, loading, error };
}
