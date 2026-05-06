import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Container, Typography, Box, Paper, TextField, Button, 
  CircularProgress, Alert, Divider, Grid, MenuItem 
} from "@mui/material";
import { loadStripe } from "@stripe/stripe-js"; 
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "../components/CheckoutForm";
import { getSlot, getBarber } from "../firebase/firestore";
import { formatCurrency, formatDate, formatTime } from "../stripe/formatters";

// Ensure your VITE_STRIPE_PUBLISHABLE_KEY is set in your .env file
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

export default function BookingForm() {
  const { barberId, slotId } = useParams();
  const navigate = useNavigate();
  const [slot, setSlot] = useState(null);
  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [formReady, setFormReady] = useState(false);

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", gender: "", haircutStyle: ""
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [barberData, slotData] = await Promise.all([
          getBarber(barberId),
          getSlot(barberId, slotId)
        ]);
        setBarber(barberData);
        setSlot(slotData);
      } catch (err) {
        setError("Failed to load details.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [barberId, slotId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      // UPDATED: Changed endpoint to /api/create-intent to support Connect routing
      const response = await fetch("/api/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: barber.depositAmount ?? 12,
          barberName: barber.name,
          email: formData.email, // Passes email for Stripe receipts
          // CRITICAL: Passes the barber's specific Stripe ID for money routing
          barberStripeId: barber.stripeAccountId, 
          metadata: { 
            ...formData, 
            barberId, 
            slotId, 
            barberName: barber.name 
          }
        }),
      });
      
      const data = await response.json();
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setFormReady(true);
      } else {
        // This will display specific error messages like "Barber not set up"
        throw new Error(data.error || "Payment failed to initialize");
      }
    } catch (err) {
      setError(err.message || "Initialization error. Check Vercel API logs.");
    }
  };

  if (loading) return <Box textAlign="center" py={8}><CircularProgress /></Box>;

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700}>{barber?.name}</Typography>
        <Typography variant="body2">{formatDate(slot?.date)} at {formatTime(slot?.time)}</Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6">Deposit: {formatCurrency(barber?.depositAmount ?? 12)}</Typography>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {formReady && clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm 
            slot={slot} 
            barber={barber} 
            formData={formData} 
            barberId={barberId} 
            slotId={slotId} 
          />
        </Elements>
      ) : (
        <Box component="form" onSubmit={handleDetailsSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
                <TextField label="Full Name" name="name" fullWidth required onChange={handleChange} value={formData.name} />
            </Grid>
            <Grid item xs={12}>
                <TextField label="Email" name="email" type="email" fullWidth required onChange={handleChange} value={formData.email} />
            </Grid>
            <Grid item xs={12}>
                <TextField label="Phone" name="phone" fullWidth required onChange={handleChange} value={formData.phone} />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                label="Gender" 
                name="gender" 
                select 
                fullWidth 
                required 
                value={formData.gender} 
                onChange={handleChange}
              >
                {GENDER_OPTIONS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
                <TextField 
                    label="Haircut Details" 
                    name="haircutStyle" 
                    fullWidth 
                    multiline 
                    rows={2} 
                    required 
                    onChange={handleChange} 
                    value={formData.haircutStyle} 
                />
            </Grid>
          </Grid>
          <Button 
            type="submit" 
            variant="contained" 
            fullWidth 
            size="large" 
            sx={{ mt: 3, fontWeight: 700 }}
          >
            Continue to Payment
          </Button>
        </Box>
      )}
    </Container>
  );
}