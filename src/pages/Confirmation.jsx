import React from "react";

// src/pages/Confirmation.jsx
// Public page — shown after a successful booking and deposit payment.
// Reached via /confirmation/:bookingId

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Box, Container, Typography, Paper,
  Button, Divider, CircularProgress, Alert,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { getBooking, getBarber } from "../firebase/firestore";
import { formatDate, formatTime, formatCurrency } from "../stripe/formatters.js";

export default function Confirmation() {
  const { bookingId } = useParams();

  const [booking, setBooking] = useState(null);
  const [barber,  setBarber]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const b = await getBooking(bookingId);
        if (!b) { setError("Booking not found."); return; }
        const bar = await getBarber(b.barberId);
        setBooking(b);
        setBarber(bar);
      } catch (err) {
        setError("Could not load your booking.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bookingId]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 }, textAlign: "center" }}>
      {/* Success icon */}
      <CheckCircleOutlineIcon sx={{ fontSize: 72, color: "success.main", mb: 2 }} />

      <Typography variant="h4" fontWeight={700} mb={1}>
        You&rsquo;re booked in!
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={5}>
        A confirmation email has been sent to <strong>{booking.clientEmail}</strong>.
      </Typography>

      {/* Booking details */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, textAlign: "left", mb: 4 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Booking Details
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {[
          ["Barber",    barber?.name],
          ["Date",      formatDate(booking.slotDate)],
          ["Time",      formatTime(booking.slotTime ?? booking.time)],
          ["Style",     booking.haircutStyle],
          ["Deposit Paid", formatCurrency(booking.depositAmount)],
          ["Booking Ref",  bookingId],
        ].map(([label, value]) => (
          <Box key={label} display="flex" justifyContent="space-between" py={0.75}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="body2" fontWeight={600}>{value}</Typography>
          </Box>
        ))}

        <Divider sx={{ mt: 2, mb: 2 }} />

        <Typography variant="caption" color="text.secondary">
          Need to cancel? Contact the shop directly. Free cancellation if done 24+ hours before your appointment.
        </Typography>
      </Paper>

      <Button component={Link} to="/" variant="outlined" fullWidth size="large">
        Back to Home
      </Button>
    </Container>
  );
}
