// src/hooks/useBookings.js
// Fetches all bookings for the signed-in barber. Used in Dashboard.

import { useState, useEffect } from "react";
import { getBookingsForBarber } from "../firebase/firestore";

export function useBookings(barberId) {
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Expose refetch so Dashboard can refresh after a cancellation
  async function refetch() {
    if (!barberId) return;
    setLoading(true);
    try {
      const data = await getBookingsForBarber(barberId);
      setBookings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refetch();
  }, [barberId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { bookings, loading, error, refetch };
}
