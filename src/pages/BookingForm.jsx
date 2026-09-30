import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Container, Typography, Box, Paper, TextField, Button,
  CircularProgress, Alert, Divider, Grid, MenuItem
} from "@mui/material";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "../components/CheckoutForm";
import { formatDate, formatTime } from "../stripe/formatters";
import { stripePromise } from "../stripe/stripeClient";
import { calculateBookingFee } from "../utils/bookingHelpers";

// Direct Firebase imports
import { db } from "../firebase/config";
import { doc, getDoc, collectionGroup, query, where, getDocs } from "firebase/firestore";

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

export default function BookingForm({ tenant }) {
  // ✅ Extract slotId from params since it's in the URL path
  const { barberId, slotId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const queryParams = new URLSearchParams(location.search);
  
  // ✅ State for slot details
  const [slotData, setSlotData] = useState({
    date: queryParams.get("date") || "",
    time: queryParams.get("time") || ""
  });

  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formReady, setFormReady] = useState(false);
  const [isStripeActive, setIsStripeActive] = useState(false);
  // No Stripe Connect on this account: either the business has pasted their
  // own external payment link (Stripe Payment Link, PayPal.me, etc. —
  // confirmed the moment the customer clicks through, same trust level as a
  // business currently taking bank transfers over DM), or they take no
  // deposit at all and booking just confirms directly. See
  // handleFinalizeBookingNoPayment in worker.js for the actual write.
  const [externalPayStep, setExternalPayStep] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    haircutStyle: "",
  });

  useEffect(() => { window.scrollTo(0, 0); }, [slotId]);

  useEffect(() => {
    if (!barberId) return;
    async function loadData() {
      try {
        setLoading(true);

        // 1. Fetch from root 'slots' collection
        if (slotId && (!slotData.date || !slotData.time)) {
            const slotRef = doc(db, "slots", slotId); 
            const slotSnap = await getDoc(slotRef);
            
            if (slotSnap.exists()) {
                const data = slotSnap.data();
                setSlotData({
                    date: data.date || "", 
                    time: data.time || ""
                });
            }
        }

        // 2. Check Stripe Status
        const stripeRes = await fetch(`/api/check-stripe?userId=${barberId}`);
        const stripeData = await stripeRes.json();
        
        // 3. Load Barber Details
        const ownerSnap = await getDoc(doc(db, "barbers", barberId));
        let foundBarber = ownerSnap.exists() ? { id: ownerSnap.id, ...ownerSnap.data() } : null;

        if (!foundBarber) {
          const q = query(collectionGroup(db, "staff"), where("uid", "==", barberId));
          const snap = await getDocs(q);
          if (!snap.empty) foundBarber = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }

        if (foundBarber) {
          // ✅ Warn if email is missing from Firestore — booking confirmation won't reach barber
          if (!foundBarber.email) {
            console.warn("⚠️ Barber email not found in Firestore. Go to Dashboard and click Save to fix this — barber will not receive booking emails until resolved.");
          }
          setBarber(foundBarber);
          // stripeAccountId alone used to count as "active" too, but that's
          // just an ID Stripe assigns the moment Connect onboarding starts —
          // it stays set in Firestore even if onboarding was abandoned
          // (charges_enabled/details_submitted still false) or Stripe was
          // never actually completed, wrongly forcing the real Stripe/deposit
          // flow instead of the external-payment-link path for any business
          // in that state. stripeConnected (synced by /api/check-stripe,
          // which re-verifies against Stripe's own API) is the only signal
          // that actually means payments will work.
          setIsStripeActive(stripeData.connected || foundBarber.stripeConnected);
        } else {
          setError("Barber profile not found.");
        }
      } catch (err) {
        setError("Failed to sync connection status.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [barberId, slotId]);

  const ui = useMemo(() => {
    const rawAmount = barber?.depositAmount ?? tenant?.depositAmount;
    const numericAmount = typeof rawAmount === 'string' ? parseFloat(rawAmount) : rawAmount;
    const businessType = tenant?.businessType || barber?.businessType || "barber";

    const professionalLabel = {
      hairdresser: "Hair Stylist",
      decorator:   "Decorator",
      trainer:     "Personal Trainer",
    }[businessType] || "Barber";

    return {
      brandColor:        tenant?.brandColor    || barber?.brandColor    || "#2563EB",
      depositAmount:     Math.max(10, isNaN(numericAmount) || numericAmount === null ? 10 : numericAmount),
      barberName:        barber?.name          || "Professional",
      businessName:      tenant?.businessName  || barber?.businessName  || "the salon",
      businessType,
      professionalLabel,
    };
  }, [barber, tenant]);

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Demo accounts skip payment entirely — create booking directly
    if (barber?.isDemo) {
      try {
        const { createBooking, createNotification } = await import("../firebase/firestore");
        const bookingId = await createBooking({
          ...formData,
          barberId,
          slotId,
          barberName:    ui.barberName,
          depositAmount: 0,
          bookingFee:    0,
          paymentIntentId: "demo",
          date: slotData.date,
          time: slotData.time,
        });
        createNotification(barberId, {
          type: "booking",
          title: "Demo Booking",
          body: `${formData.name} made a demo booking on ${formatDate(slotData.date)} at ${formatTime(slotData.time)}`,
          data: { bookingId, clientName: formData.name, clientEmail: formData.email, slotDate: formatDate(slotData.date), slotTime: formatTime(slotData.time) },
        });
        fetch("/api/outlook/sync-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barberId,
            bookingId,
            name:    formData.name,
            email:   formData.email,
            phone:   formData.phone,
            service: formData.haircutStyle || "Appointment",
            date:    slotData.date,
            time:    slotData.time,
            notes:   formData.notes || "",
          }),
        }).catch(() => {});
        navigate(`/confirmation/${bookingId}`, { state: { tenant } });
      } catch (err) {
        setError("Demo booking failed: " + err.message);
      }
      return;
    }

    if (!isStripeActive) {
      if (barber?.externalPaymentLink) {
        // Show the "pay via their link, then confirm" step rather than
        // finalizing immediately — see handleExternalLinkConfirm below.
        setExternalPayStep(true);
      } else {
        // No Stripe, no external link — a normal booking with no deposit.
        await finalizeNoPayment("none");
      }
      return;
    }

    // The actual PaymentIntent is created once, server-side, by CheckoutForm
    // right before confirmPayment() — never here. This step just validates
    // the deposit meets Stripe's minimum and moves to the payment step;
    // Elements mounts in deferred mode (an estimated amount, no real
    // clientSecret yet) so nothing is trusted from the client for pricing.
    const finalNumericValue = Number(ui.depositAmount);
    if (finalNumericValue * 100 < 1000) {
      setError(`Deposit amount (£${finalNumericValue.toFixed(2)}) is below the £10.00 minimum. Please ask the business owner to update their deposit setting.`);
      return;
    }
    setFormReady(true);
  };

  // Shared by the "no deposit at all" path (called directly) and the
  // "pay via external link" step (called after the customer clicks through
  // to the business's own Stripe Payment Link / PayPal.me / etc.). Confirms
  // on trust the moment they click — there's no webhook or API integration
  // with an arbitrary external payment provider to verify against, same
  // trust level as a business currently taking bank transfers over DM.
  async function finalizeNoPayment(paymentMethod) {
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/finalize-booking-no-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId, slotId, formData, date: slotData.date, time: slotData.time, paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server responded with ${res.status}`);
      navigate(`/confirmation/${data.bookingId}`, { state: { tenant } });
    } catch (err) {
      setError(err.message || "Something went wrong — please try again.");
      setConfirming(false);
    }
  }

  // TenantNav (App.jsx) is a fixed floating bar shown for barber-type
  // tenants on this route (other business types render their own in-page
  // nav instead, which doesn't persist onto this separate route at all —
  // see isAlternativeBookingLayout in App.jsx). It overlays whatever's here
  // regardless of scroll position, since navigating here resets scroll to
  // top, and the previous pt: 12/5 wasn't enough to clear it.
  const navClearance = ui.businessType === "barber"
    ? { xs: "calc(104px + env(safe-area-inset-top, 0px))", md: "128px" }
    : { xs: 12, md: 5 };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: navClearance, pb: 10 }}><CircularProgress sx={{ color: ui.brandColor }} /></Box>;

  return (
    <Container maxWidth="sm" sx={{ pt: navClearance, pb: 5 }}>
      <Paper 
        variant="outlined" 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 3, 
          borderTop: `8px solid ${ui.brandColor}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" fontWeight={800} gutterBottom sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Appointment Summary
        </Typography>
        
        <Box sx={{ my: 2 }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body1" fontWeight={700}>{ui.professionalLabel}</Typography>
              <Typography variant="body1">{ui.barberName}</Typography>
            </Box>
            
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body1" fontWeight={700}>Date</Typography>
              <Typography variant="body1">
                {slotData.date ? formatDate(slotData.date) : "Select a date"}
              </Typography>
            </Box>

            <Box display="flex" justifyContent="space-between">
              <Typography variant="body1" fontWeight={700}>Time</Typography>
              <Typography variant="body1">
                {slotData.time ? formatTime(slotData.time) : "Select a time"}
              </Typography>
            </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography fontWeight={700}>Booking Deposit</Typography>
          {isStripeActive ? (
            <Typography variant="h5" fontWeight={900} color={ui.brandColor}>
              £{ui.depositAmount.toFixed(2)}
            </Typography>
          ) : barber?.externalPaymentLink ? (
            <Typography variant="body2" fontWeight={700} color={ui.brandColor}>Paid via {ui.barberName}'s link</Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">No deposit required</Typography>
          )}
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {externalPayStep ? (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Typography sx={{ mb: 2.5, color: "text.secondary" }}>
            {ui.barberName} takes deposits directly — pay via their link below, then come back to confirm your booking.
          </Typography>
          <Button
            component="a" href={barber.externalPaymentLink} target="_blank" rel="noopener noreferrer"
            variant="outlined" fullWidth size="large"
            sx={{ py: 1.75, fontWeight: 800, borderRadius: 2, borderColor: ui.brandColor, color: ui.brandColor, mb: 2 }}
          >
            Open payment link
          </Button>
          <Button
            variant="contained" fullWidth size="large" disabled={confirming}
            onClick={() => finalizeNoPayment("external_link")}
            sx={{ py: 2, fontWeight: 900, borderRadius: 2, bgcolor: ui.brandColor, "&:hover": { bgcolor: ui.brandColor, filter: "brightness(0.9)" } }}
          >
            {confirming ? <CircularProgress size={22} color="inherit" /> : "I've paid — confirm my booking"}
          </Button>
        </Box>
      ) : formReady ? (
        // Deferred mode — no real PaymentIntent (and no real clientSecret)
        // exists yet at mount time. CheckoutForm creates the actual,
        // server-verified PaymentIntent right before confirmPayment().
        // `amount` here is only an estimate so PaymentElement can show the
        // right payment methods; it has no bearing on what's actually charged.
        <Elements
          stripe={stripePromise}
          options={{
            mode: "payment",
            currency: "gbp",
            amount: calculateBookingFee(ui.depositAmount).customerPaysPence,
            // /api/create-intent always sets on_behalf_of to the business's
            // connected account (destination charges) — Elements must be told
            // the same thing up front in deferred mode, or confirmPayment()
            // fails with "provided on_behalf_of does not match the expected
            // on_behalf_of (null)" once the real clientSecret comes back.
            onBehalfOf: barber?.stripeAccountId,
          }}
        >
          <CheckoutForm
            appointmentDate={slotData.date} appointmentTime={slotData.time}
            barber={barber} formData={formData} barberId={barberId}
            brandColor={ui.brandColor} tenant={tenant} slotId={slotId}
          />
        </Elements>
      ) : (
        <Box component="form" onSubmit={handleDetailsSubmit}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Your Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField label="Full Name" fullWidth required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></Grid>
            <Grid item xs={12}><TextField label="Email" fullWidth required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></Grid>
            <Grid item xs={12}><TextField label="Phone Number" fullWidth required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></Grid>
            <Grid item xs={12}>
              <TextField select label="Gender" fullWidth required value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                {GENDER_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={ui.businessType === "hairdresser" ? "Hair Style / Requirements" : ui.businessType === "decorator" ? "Project Details" : ui.businessType === "trainer" ? "Goals / Requirements" : "Style / Requirements"}
                placeholder={ui.businessType === "hairdresser" ? "e.g. balayage, trim, colour treatment…" : ui.businessType === "decorator" ? "e.g. living room repaint, colour scheme…" : ui.businessType === "trainer" ? "e.g. weight loss, build muscle…" : ""}
                fullWidth multiline rows={3}
                value={formData.haircutStyle}
                onChange={(e) => setFormData({...formData, haircutStyle: e.target.value})}
              />
            </Grid>
          </Grid>

          {barber?.isDemo && (
            <Alert severity="info" sx={{ mt: 3, mb: 1 }}>
              This is a demo — no payment will be taken.
            </Alert>
          )}
          <Button
            type="submit" variant="contained" fullWidth size="large" disabled={confirming}
            sx={{
                mt: barber?.isDemo ? 1 : 4, py: 2, fontWeight: 900, borderRadius: 2, bgcolor: ui.brandColor,
                "&:hover": { bgcolor: ui.brandColor, filter: "brightness(0.9)" },
                "&.Mui-disabled": { bgcolor: "#e0e0e0" }
            }}
          >
            {confirming
              ? <CircularProgress size={22} color="inherit" />
              : barber?.isDemo
                ? "Confirm Demo Booking"
                : isStripeActive
                  ? `Confirm & Pay £${ui.depositAmount.toFixed(2)}`
                  : barber?.externalPaymentLink
                    ? "Continue to payment"
                    : "Confirm Booking"}
          </Button>
        </Box>
      )}
    </Container>
  );
}
