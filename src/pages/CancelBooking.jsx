import React, { useState, useEffect } from "react";
import { Box, Typography, Button, CircularProgress, Paper, Alert } from "@mui/material";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getBooking, cancelBooking } from "../firebase/firestore";
import { isRefundEligible } from "../stripe/formatters";
import { requestRefund } from "../stripe/stripeClient";

export default function CancelBooking() {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading, success, already_cancelled, error

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const booking = await getBooking(bookingId);
        if (!booking || booking.status === "cancelled") {
          if (mounted) setStatus("already_cancelled");
          return;
        }

        // 1. Mandatory Update (Firestore)
        const bId = booking.barberId || searchParams.get("barber");
        await cancelBooking(bookingId, booking.slotId, bId);

        // 2. Background Tasks (Non-blocking)
        // We don't await these so the 500 errors won't hang the page
        const pId = booking.paymentIntentId || booking.stripePaymentIntentId;
        if (pId && isRefundEligible(booking.slotDate)) {
          requestRefund({ paymentIntentId: pId }).catch(() => {});
        }
        
        fetch('/api/send-email', {
          method: 'POST',
          body: JSON.stringify({ bookingId, type: 'cancellation' })
        }).catch(() => {});

        if (mounted) setStatus("success");
      } catch (e) {
        console.error(e);
        if (mounted) setStatus("error");
      }
    }
    run();
    return () => { mounted = false; };
  }, [bookingId]);

  return (
    <Box sx={{ p: 4, maxWidth: 500, mx: "auto", mt: 8, textAlign: "center" }}>
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
        {status === "loading" ? (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>Processing your cancellation...</Typography>
          </>
        ) : (
          <>
            {status === "success" && <Alert severity="success">Booking cancelled successfully.</Alert>}
            {status === "already_cancelled" && <Alert severity="info">This was already cancelled.</Alert>}
            {status === "error" && <Alert severity="error">Error cancelling booking.</Alert>}
            <Button variant="contained" fullWidth sx={{ mt: 3 }} onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
}