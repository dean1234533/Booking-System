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

// Direct Firebase imports
import { db } from "../firebase/config";
import { doc, getDoc, collectionGroup, query, where, getDocs } from "firebase/firestore";

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

export default function BookingForm({ tenant }) {
  // ✅ Extract slotId from params since it's in the URL path
  const { barberId, slotId } = useParams();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  
  // ✅ State for slot details
  const [slotData, setSlotData] = useState({
    date: queryParams.get("date") || "",
    time: queryParams.get("time") || ""
  });

  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [formReady, setFormReady] = useState(false);
  const [isStripeActive, setIsStripeActive] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    haircutStyle: "",
  });

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
          setIsStripeActive(stripeData.connected || foundBarber.stripeConnected || !!foundBarber.stripeAccountId);
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
      brandColor:        tenant?.brandColor    || barber?.brandColor    || "#C9A84C",
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
    
    try {
      const finalNumericValue = Number(ui.depositAmount);
      const amountInPence = Math.round(finalNumericValue * 100);

      if (amountInPence < 1000) {
        throw new Error(`Deposit amount (£${finalNumericValue.toFixed(2)}) is below the £10.00 minimum. Please ask the business owner to update their deposit setting.`);
      }

      const response = await fetch('/api/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInPence, 
          email: formData.email,
          barberStripeId: barber?.stripeAccountId,
          metadata: { 
            customerName: formData.name,
            customerPhone: formData.phone,
            haircutStyle: formData.haircutStyle,
            barberName: ui.barberName, 
            bookingDate: formatDate(slotData.date), 
            bookingTime: formatTime(slotData.time),
            barberId: barberId 
          }
        }),
      });

      const data = await response.json();
      if (response.ok && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setFormReady(true);
      } else {
        throw new Error(data.error || "Payment failed to initialize.");
      }
    } catch (err) {
      console.error("Submission Error:", err.message);
      setError(err.message);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: ui.brandColor }} /></Box>;

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
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
          <Typography variant="h5" fontWeight={900} color={ui.brandColor}>
            £{ui.depositAmount.toFixed(2)}
          </Typography>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {formReady && clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          {/* ✅ UPDATED: Added slotId prop here */}
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

          <Button 
            type="submit" variant="contained" fullWidth size="large" disabled={!isStripeActive}
            sx={{ 
                mt: 4, py: 2, fontWeight: 900, borderRadius: 2, bgcolor: ui.brandColor, 
                "&:hover": { bgcolor: ui.brandColor, filter: "brightness(0.9)" },
                "&.Mui-disabled": { bgcolor: "#e0e0e0" }
            }}
          >
            {isStripeActive ? `Confirm & Pay £${ui.depositAmount.toFixed(2)}` : `${ui.professionalLabel} Not Accepting Payments`}
          </Button>
        </Box>
      )}
    </Container>
  );
}