import React, { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { useNavigate } from "react-router-dom";
import { Box, Button, CircularProgress, Alert, Divider, Typography } from "@mui/material";
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

      // The ONE PaymentIntent creation for this booking — server-verified,
      // server-priced (never trusts a client-sent amount), and the only
      // place metadata gets attached. Previously this ran twice (once here,
      // once in BookingForm, with the earlier one discarded and its
      // metadata lost) — collapsed to a single call.
      const response = await fetch("/api/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId,
          email: formData.email,
          metadata: {
            customerName:  formData.name,
            customerPhone: formData.phone,
            serviceName:   formData.haircutStyle,
            bookingDate:   appointmentDate,
            bookingTime:   appointmentTime,
            slotId:        slotId || "",
            bookingSlug:   tenant?.bookingSlug || "",
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const { clientSecret, error: intentError } = await response.json();
      if (intentError) throw new Error(intentError);

      // Stripe requires confirmParams.return_url even in "if_required" mode:
      // automatic_payment_methods (enabled server-side in /api/create-intent)
      // can select a payment method that redirects unconditionally (bank
      // redirects, wallets), and Stripe needs somewhere to send the customer
      // back to if that happens. Cards etc. still resolve inline with no
      // redirect — this only matters for the methods that always redirect.
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: "if_required",
        confirmParams: { return_url: window.location.href },
      });

      if (stripeError) {
        setError(stripeError.message);
        setProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        // Booking creation + slot marking now happens server-side, via a
        // Cloud Function that re-verifies payment status directly with
        // Stripe (rather than a client-side Firestore write, which an
        // unauthenticated booking customer's browser can't make anyway —
        // see firestore.rules). A payment_intent.succeeded webhook also
        // reconciles this in the background as a safety net if this call
        // never completes (e.g. the tab closes right after payment).
        const finalizeRes = await fetch("/api/finalize-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            slotId,
            barberId,
            formData,
            date: appointmentDate,
            time: appointmentTime,
          }),
        });

        if (!finalizeRes.ok) {
          const errorData = await finalizeRes.json().catch(() => ({}));
          throw new Error(errorData.error || "Payment succeeded but we couldn't finish confirming your booking — please contact us.");
        }

        const { bookingId } = await finalizeRes.json();

        // Outlook Calendar Sync — fire and forget, non-blocking
        fetch("/api/outlook/sync-booking", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barberId,
            bookingId,
            name:    formData.name,
            email:   formData.email,
            phone:   formData.phone,
            service: formData.haircutStyle || "Appointment",
            date:    appointmentDate,
            time:    appointmentTime,
            notes:   formData.notes || "",
          }),
        }).catch(err => console.error("Outlook sync fail (non-critical):", err));

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