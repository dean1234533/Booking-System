import { useState, useEffect, useCallback } from "react";
import { getBookingsForBarber } from "../firebase/firestore"; // Must match the export name above

export function useBookings(barberId) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    if (!barberId) return;
    setLoading(true);
    const data = await getBookingsForBarber(barberId);
    setBookings(data);
    setLoading(false);
  }, [barberId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return { bookings, loading, refetch: fetchBookings };
}