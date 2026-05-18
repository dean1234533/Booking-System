import React, { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { useNavigate } from "react-router-dom";
import { Box, Button, CircularProgress, Alert, Divider, Typography } from "@mui/material";
import { createBooking } from "../firebase/firestore"; 
import { formatDate, formatTime } from "../stripe/formatters";
// ✅ IMPORT: db and doc/updateDoc to change slot status
import { db } from "../firebase/config";
import { doc, updateDoc } from "firebase/firestore";
// ✅ IMPORT: booking helpers
import { resolveBarberEmailAndFee } from "../utils/bookingHelpers";

// ✅ ADDED: 'slotId' to the props
export default function CheckoutForm({ appointmentDate, appointmentTime, barber, formData, barberId, brandColor, tenant, slotId }) {
  const stripe     = useStripe();
  const elements   = useElements();
  const navigate   = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [error,      setError]      = useState(null);

  // Fee breakdown values — uses helper to safely resolve email + fee from barber object
  const { email: barberEmail, fee } = resolveBarberEmailAndFee(barber);
  const customerPaysPounds = fee.customerPaysPounds;
  const bookingFeePounds   = fee.bookingFeePounds;

  async function handleSubmit(e) {

    console.log("barber object:", barber);
    console.log("barberEmail resolved:", barberEmail);
    console.log("fee breakdown:", fee);

    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message);
        setProcessing(false);
        return;
      }

      const amountInPence = Math.round(Number(barber.depositAmount || 1) * 100);

      const response = await fetch("/api/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountInPence,
          barberStripeId: barber.stripeAccountId,
          barberName: barber.name,
          email: formData.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const { clientSecret, error: intentError } = await response.json();
      if (intentError) throw new Error(intentError);

      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: "if_required",
      });

      if (stripeError) {
        setError(stripeError.message);
        setProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        // ✅ STEP 1: Update the status in the main 'slots' collection
        // This ensures it "disappears" from the availability list
        if (slotId) {
          const slotRef = doc(db, "slots", slotId);
          await updateDoc(slotRef, { 
            status: "booked" 
          });
        }

        // ✅ STEP 2: Create the booking record
        const bookingId = await createBooking({
          ...formData,
          barberId,
          slotId,
          barberName:      barber.name,
          depositAmount:   fee.depositPounds,
          bookingFee:      bookingFeePounds,
          paymentIntentId: paymentIntent.id,
          date:            appointmentDate,
          time:            appointmentTime,
        });

        // ✅ Email Trigger
        fetch("/api/send-email", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientEmail:   formData.email,
            clientName:    formData.name,
            barberEmail:   barberEmail,                // ✅ resolved via helper — checks all known field names
            barberName:    barber.name,
            businessName:  tenant?.businessName || barber?.businessName, 
            brandColor:    brandColor,
            slotDate:      formatDate(appointmentDate),
            slotTime:      formatTime(appointmentTime),
            bookingId,
            barberId,
            haircutStyle:  formData.haircutStyle,
            depositAmount: fee.depositPounds,          // ✅ always a clean "25.00" string
            bookingFee:    bookingFeePounds,            // ✅ always a clean "2.18" string
          }),
        }).catch(err => console.error("Email fail:", err));

        navigate(`/confirmation/${bookingId}`, { state: { tenant } });
      }
    } catch (err) {
      console.error("Payment flow failed:", err);
      setError(err.message || "An unexpected error occurred.");
      setProcessing(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <PaymentElement options={{
        defaultValues: { billingDetails: { address: { country: 'GB' } } },
      }} />

      {/* Fee breakdown */}
      <Box sx={{ mt: 2, px: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">Deposit</Typography>
          <Typography variant="body2">£{fee.depositPounds}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">Booking fee</Typography>
          <Typography variant="body2">£{bookingFeePounds}</Typography>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" fontWeight={700}>Total</Typography>
          <Typography variant="body2" fontWeight={700}>£{customerPaysPounds}</Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      
      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={processing || !stripe}
        sx={{ 
          mt: 3, 
          py: 1.5, 
          fontWeight: 700, 
          borderRadius: 2, 
          bgcolor: brandColor, 
          '&:hover': { bgcolor: brandColor, filter: 'brightness(0.9)' } 
        }}
      >
        {processing
          ? <CircularProgress size={24} color="inherit" />
          : `Pay £${customerPaysPounds}`
        }
      </Button>
    </Box>
  );
}