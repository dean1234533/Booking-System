import { useState, useEffect } from "react";

export function useBarbers() {
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBarbers() {
      try {
        setLoading(true);
        const { getAllBarbers } = await import("../firebase/firestore");
        const data = await getAllBarbers();
        setBarbers(data);
      } catch (err) {
        setError("Failed to load barbers.");
        console.error("Hook Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBarbers();
  }, []);

  return { barbers, loading, error };
}