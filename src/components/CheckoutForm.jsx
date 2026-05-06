import React, { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { useNavigate } from "react-router-dom";
import { Box, Button, CircularProgress, Alert } from "@mui/material";
import { createBooking } from "../firebase/firestore"; 
import { formatDate, formatTime } from "../stripe/formatters";

export default function CheckoutForm({ slot, barber, formData, barberId, slotId }) {
  const stripe     = useStripe();
  const elements   = useElements();
  const navigate   = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [error,      setError]      = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      // 1. DYNAMIC STEP: Create the PaymentIntent on the server first
      // This ensures money goes to the barber's specific Stripe ID
      const response = await fetch("/api/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: barber.depositAmount ?? 10,
          barberStripeId: barber.stripeAccountId, // Saved in Firestore during onboarding
        }),
      });

      const { clientSecret, error: intentError } = await response.json();

      if (intentError) {
        throw new Error(intentError);
      }

      // 2. Confirm the payment using the dynamic clientSecret
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret, // Use the secret generated for this specific barber
        redirect: "if_required",
      });

      if (stripeError) {
        setError(stripeError.message);
        setProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        // 3. Save booking to Firestore
        const bookingId = await createBooking({
          ...formData,
          barberId,
          slotId,
          barberName:      barber.name,
          depositAmount:   barber.depositAmount ?? 10,
          paymentIntentId: paymentIntent.id,
          date:            slot.date,
          time:            slot.time,
        });

        // 4. Send confirmation emails (Background task)
        fetch("/api/send-email", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientEmail:   formData.email,
            clientName:    formData.name,
            barberName:    barber.name,
            barberEmail:   barber.email,
            slotDate:      formatDate(slot.date),
            slotTime:      formatTime(slot.time),
            bookingId,
            barberId,
            haircutStyle:  formData.haircutStyle,
            depositAmount: barber.depositAmount ?? 10,
          }),
        }).catch(emailErr => console.error("Email send failed in background:", emailErr));

        // 5. Success! Navigate away
        navigate(`/confirmation/${bookingId}`);
      }
    } catch (err) {
      console.error("Payment flow failed:", err);
      setError(err.message || "An unexpected error occurred.");
      setProcessing(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={processing || !stripe}
        sx={{ mt: 3, py: 1.5, fontWeight: 700, borderRadius: 2 }}
      >
        {processing
          ? <CircularProgress size={24} color="inherit" />
          : `Pay £${barber.depositAmount ?? 10} deposit — ${barber.name}`
        }
      </Button>
    </Box>
  );
}