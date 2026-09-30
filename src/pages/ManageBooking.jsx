import React, { useState, useEffect } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Container, Divider, Paper, Stack, Typography } from "@mui/material";
import { getBooking, getBarber } from "../firebase/firestore";
import { formatDate, formatTime } from "../stripe/formatters";
import ReminderOptInCard from "../components/ReminderOptInCard";

// Where reminder pushes/emails/SMS land. Viewing is safe (unlike /cancel-booking,
// which cancels on load); cancelling is an explicit button here.
export default function ManageBooking() {
  const { bookingId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [barber, setBarber] = useState(null);
  const [state, setState] = useState("loading");
  const [rebooking, setRebooking] = useState(false);
  const [rebookError, setRebookError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const b = await getBooking(bookingId);
        if (!b) return setState("missing");
        setBooking(b);
        setBarber(await getBarber(b.barberId));
        setState("ready");
      } catch { setState("missing"); }
    })();
  }, [bookingId]);

  if (state === "loading") return <Container sx={{ py: 10, textAlign: "center" }}><CircularProgress /></Container>;
  if (state === "missing") return <Container maxWidth="sm" sx={{ py: 8 }}><Alert severity="error">We couldn't find that booking.</Alert></Container>;

  const brand = barber?.brandColor || "#2563EB";
  const cancelled = booking.status === "cancelled";
  const rebookPath = barber?.bookingSlug ? `/${barber.bookingSlug}` : "/";

  // "Reschedule" isn't a real feature (there's no way to edit a booking's
  // date/time in place) — this is the practical substitute: cancel the
  // current booking server-side, then send them to book a new slot, so
  // they end up with one appointment moved rather than two on the books.
  async function handleRebook() {
    setRebooking(true);
    setRebookError(null);
    try {
      const res = await fetch("/api/cancel-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (!res.ok) throw new Error("Server rejected the cancellation");

      // Reschedule = cancel + book again, so it must refund the old deposit
      // the same way the explicit Cancel button does — otherwise "reschedule"
      // silently charges a second deposit on top of one that's never returned.
      if (booking.paymentIntentId && booking.date && booking.time) {
        fetch("/api/cancel-refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: booking.paymentIntentId, date: booking.date, time: booking.time }),
        }).catch(err => console.error("Refund on reschedule failed:", err));
      }

      navigate(rebookPath);
    } catch {
      setRebookError("Couldn't move your booking automatically — please cancel below, then book your new time.");
      setRebooking(false);
    }
  }
  const rows = [
    ["Business", barber?.businessName || barber?.name],
    ["Date", booking.date && formatDate(booking.date)],
    ["Time", booking.time && formatTime(booking.time)],
    ["Service", booking.haircutStyle || booking.serviceName],
  ].filter(r => r[1]);

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, borderTop: `6px solid ${brand}` }}>
        <Typography variant="h5" fontWeight={900} mb={0.5}>Your appointment</Typography>
        {cancelled && <Alert severity="info" sx={{ my: 1.5 }}>This appointment has been cancelled.</Alert>}
        <Divider sx={{ my: 2 }} />
        <Stack spacing={1.25}>
          {rows.map(([l, v]) => (
            <Box key={l} display="flex" justifyContent="space-between">
              <Typography variant="body2" fontWeight={700} color="text.secondary">{l}</Typography>
              <Typography variant="body2" fontWeight={800} sx={{ textAlign: "right", maxWidth: "60%" }}>{v}</Typography>
            </Box>
          ))}
        </Stack>
        {!cancelled && (
          <Stack spacing={1.25} mt={3}>
            <Button onClick={handleRebook} disabled={rebooking} variant="outlined" sx={{ borderColor: brand, color: brand, fontWeight: 700 }}>
              {rebooking ? "Moving your booking…" : "Need a different time? Reschedule"}
            </Button>
            {rebookError && <Alert severity="warning" sx={{ textAlign: "left" }}>{rebookError}</Alert>}
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
              Rescheduling cancels this appointment and takes you straight to booking a new time.
            </Typography>
            <Button component={Link} to={`/cancel-booking/${bookingId}`} color="error" sx={{ fontWeight: 700 }}>
              Cancel this appointment
            </Button>
          </Stack>
        )}
      </Paper>
      {!cancelled && <ReminderOptInCard bookingId={bookingId} barber={barber} brandColor={brand} autoPrompt={params.get("enable") === "push"} />}
    </Container>
  );
}
