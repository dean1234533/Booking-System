import { useState, useEffect } from "react";
import { getOpenSlots } from "../firebase/firestore";

export function useSlots(barberId) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!barberId) return;
    async function fetch() {
      try {
        const data = await getOpenSlots(barberId);
        setSlots(data);
      } catch (err) {
        console.error("Error loading slots:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [barberId]);

  return { slots, loading };
}