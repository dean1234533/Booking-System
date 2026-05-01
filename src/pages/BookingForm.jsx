import React from "react";

// src/pages/BookingForm.jsx
// Public page — client fills in their details and pays the deposit.
// Reached via /book/:slotId

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Container, Typography, TextField, MenuItem,
  Button, Paper, Divider, Alert, CircularProgress, Grid,
} from "@mui/material";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise, createPaymentIntent } from "../stripe/stripeClient.js";
import { getSlot, getBarber, createBooking, bookSlot } from "../firebase/firestore";
import { sendConfirmationEmail } from "../stripe/emailService.js";
import { formatDate, formatTime, formatCurrency } from "../stripe/formatters.js";

const GENDER_OPTIONS = ["Prefer not to say", "Male", "Female", "Non-binary", "Other"];

// ─── Inner form (needs Stripe Elements context) ───────────────────────────────
function CheckoutForm({ slot, barber, formData, onSuccess }) {
  const stripe   = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [paying, setPaying] = useState(false);
  const [error,  setError]  = useState(null);

  async function handlePay(e) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setError(null);

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (stripeError) {
        setError(stripeError.message);
        setPaying(false);
        return;
      }

      if (paymentIntent.status === "succeeded") {
        // Create booking in Firestore
        const bookingId = await createBooking({
          slotId:               slot.id,
          barberId:             barber.id,
          clientName:           formData.name,
          clientEmail:          formData.email,
          clientPhone:          formData.phone,
          haircutStyle:         formData.haircutStyle,
          gender:               formData.gender,
          depositAmount:        barber.depositAmount ?? 10,
          stripePaymentIntentId: paymentIntent.id,
          slotDate:             slot.date,
        });

        // Mark slot as booked
        await bookSlot(slot.id, bookingId);

        // Send confirmation email
        await sendConfirmationEmail({
          clientName:    formData.name,
          clientEmail:   formData.email,
          barberName:    barber.name,
          date:          formatDate(slot.date),
          time:          formatTime(slot.time),
          haircutStyle:  formData.haircutStyle,
          depositAmount: barber.depositAmount ?? 10,
          bookingId,
        });

        navigate(`/confirmation/${bookingId}`);
      }
    } catch (err) {
      setError("Payment failed. Please try again.");
      console.error(err);
      setPaying(false);
    }
  }

  return (
    <Box component="form" onSubmit={handlePay}>
      <PaymentElement />
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        size="large"
        disabled={!stripe || paying}
        sx={{ mt: 3 }}
        startIcon={paying ? <CircularProgress size={18} color="inherit" /> : null}
      >
        {paying ? "Processing…" : `Pay ${formatCurrency(barber?.depositAmount ?? 10)} Deposit`}
      </Button>
    </Box>
  );
}

// ─── Outer page ───────────────────────────────────────────────────────────────
export default function BookingForm() {
  const { slotId } = useParams();

  const [slot,          setSlot]          = useState(null);
  const [barber,        setBarber]        = useState(null);
  const [clientSecret,  setClientSecret]  = useState(null);
  const [loadingPage,   setLoadingPage]   = useState(true);
  const [pageError,     setPageError]     = useState(null);

  const [formData, setFormData] = useState({
    name:         "",
    email:        "",
    phone:        "",
    gender:       "Prefer not to say",
    haircutStyle: "",
  });
  const [formReady, setFormReady] = useState(false);

  // Load slot + barber data
  useEffect(() => {
    async function load() {
      try {
        const slotData = await getSlot(slotId);
        if (!slotData) { setPageError("This slot no longer exists."); return; }
        if (slotData.status === "booked") { setPageError("This slot has already been booked."); return; }

        const barberData = await getBarber(slotData.barberId);
        if (!barberData) { setPageError("Barber not found."); return; }

        setSlot(slotData);
        setBarber(barberData);
      } catch (err) {
        setPageError("Failed to load booking details.");
      } finally {
        setLoadingPage(false);
      }
    }
    load();
  }, [slotId]);

  function handleChange(e) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // When the client submits their details, create a PaymentIntent
  async function handleDetailsSubmit(e) {
    e.preventDefault();
    try {
      const secret = await createPaymentIntent({
        amount: barber.depositAmount ?? 10,
        bookingMeta: { slotId, barberId: barber.id, clientEmail: formData.email },
      });
      setClientSecret(secret);
      setFormReady(true);
    } catch (err) {
      setPageError("Could not initiate payment. Please try again.");
    }
  }

  if (loadingPage) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (pageError) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">{pageError}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
      <Typography variant="h4" fontWeight={700} mb={0.5}>Complete Your Booking</Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>
        Fill in your details and pay the deposit to confirm your slot.
      </Typography>

      {/* Booking summary */}
      <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Booking Summary</Typography>
        <Typography fontWeight={700}>{barber.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {formatDate(slot.date)} at {formatTime(slot.time)}
        </Typography>
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="body2">
          Deposit due now:{" "}
          <strong>{formatCurrency(barber.depositAmount ?? 10)}</strong>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Remainder paid after your appointment. Free cancellation if cancelled 24+ hrs in advance.
        </Typography>
      </Paper>

      {!formReady ? (
        // Step 1 — client details
        <Box component="form" onSubmit={handleDetailsSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Full Name" name="name" value={formData.name}
                onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Email Address" name="email" type="email" value={formData.email}
                onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Phone Number" name="phone" type="tel" value={formData.phone}
                onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Gender" name="gender" select value={formData.gender}
                onChange={handleChange} fullWidth>
                {GENDER_OPTIONS.map((g) => (
                  <MenuItem key={g} value={g}>{g}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Haircut / Style" name="haircutStyle" value={formData.haircutStyle}
                onChange={handleChange} fullWidth required multiline rows={2}
                placeholder="e.g. Skin fade with a line up, or mid-length trim" />
            </Grid>
          </Grid>

          <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 3 }}>
            Continue to Payment
          </Button>
        </Box>
      ) : (
        // Step 2 — Stripe payment
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm slot={slot} barber={barber} formData={formData} />
        </Elements>
      )}
    </Container>
  );
}
