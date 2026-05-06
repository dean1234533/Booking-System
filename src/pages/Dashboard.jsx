import React, { useState, useEffect } from "react";
import {
  Box, Typography, Grid, Paper, Tabs, Tab, TextField,
  Button, CircularProgress, Alert, IconButton, Divider, Avatar,
  Snackbar, InputAdornment, List, ListItem, ListItemText,
  Card, CardContent
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import AddIcon from "@mui/icons-material/Add";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber"; // Added for guard
import { useAuth } from "../context/AuthContext";
import {
  getBarber, updateBarber, addSlot,
  getProfessionalSlots, deleteSlot, uploadBarberImage,
  cancelBooking, saveBarberStripeId
} from "../firebase/firestore";
import { useBookings } from "../hooks/useBookings";
import { formatDate, isRefundEligible } from "../stripe/formatters";
import { requestRefund } from "../stripe/stripeClient";

// --- NEW COMPONENT: STRIPE GUARD ---
// This blocks the dashboard until the barber links Stripe
function StripeGuard({ onConnect, loading }) {
  return (
    <Box sx={{ 
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
      bgcolor: 'rgba(255, 255, 255, 0.95)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 
    }}>
      <Paper elevation={6} sx={{ p: 4, maxWidth: 450, textAlign: 'center', borderRadius: 4 }}>
        <WarningAmberIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={800} gutterBottom>
          Payout Setup Required
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={4}>
          To protect your earnings and enable booking deposits, you must link your bank account via Stripe before accessing your dashboard.
        </Typography>
        <Button 
          variant="contained" 
          size="large" 
          fullWidth 
          onClick={onConnect}
          disabled={loading}
          sx={{ py: 1.5, fontWeight: 700, fontSize: '1.1rem' }}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AccountBalanceIcon />}
        >
          {loading ? "Opening Stripe..." : "Link Bank Account Now"}
        </Button>
      </Paper>
    </Box>
  );
}

export default function Dashboard() {
  const { barber } = useAuth();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [profile, setProfile] = useState({
    name: "",
    bio: "",
    services: [],
    profilePic: "",
    depositAmount: 10,
    specialty: "",
    phone: "",
    stripeAccountId: "",
    stripeEnabled: false
  });

  const [newService, setNewService] = useState({ name: "", price: "" });
  const [slots, setSlots] = useState([]);
  const [newSlot, setNewSlot] = useState({ date: "", time: "" });

  const { bookings, refetch } = useBookings(barber?.uid);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("stripeSuccess");
    const acctId = params.get("acct");

    if (success && acctId && barber) {
      handleCompleteOnboarding(acctId);
    }
  }, [barber]);

  async function handleCompleteOnboarding(acctId) {
    try {
      await saveBarberStripeId(barber.uid, acctId);
      setToast("Stripe account linked successfully!");
      loadData();
      window.history.replaceState({}, document.title, "/dashboard");
    } catch (err) {
      setToast("Failed to save Stripe details.");
    }
  }

  async function handleConnectStripe() {
    try {
      setStripeLoading(true);
      const res = await fetch("/api/create-connect-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barberId: barber.uid, email: barber.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setToast("Could not reach Stripe. Try again.");
    } finally {
      setStripeLoading(false);
    }
  }

  useEffect(() => {
    if (barber) loadData();
  }, [barber]);

  async function loadData() {
    try {
      setLoading(true);
      const [prof, slts] = await Promise.all([
        getBarber(barber.uid),
        getProfessionalSlots(barber.uid),
      ]);
      if (prof) setProfile((prev) => ({ ...prev, ...prof }));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const futureSlots = (slts || []).filter(slot => {
        const slotDate = new Date(slot.date);
        return slotDate >= today;
      });

      setSlots(futureSlots);
    } catch (err) {
      setToast("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  const handleAddService = () => {
    if (!newService.name || !newService.price) return;
    const updatedServices = [
      ...(profile.services || []),
      { name: newService.name, price: Number(newService.price) }
    ];
    setProfile({ ...profile, services: updatedServices });
    setNewService({ name: "", price: "" });
  };

  const handleRemoveService = (index) => {
    const updatedServices = profile.services.filter((_, i) => i !== index);
    setProfile({ ...profile, services: updatedServices });
  };

  async function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadBarberImage(file, barber.uid);
      setProfile((prev) => ({ ...prev, profilePic: url }));
      setToast("Photo updated!");
    } catch (err) {
      setToast("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveProfile() {
    try {
      await updateBarber(barber.uid, {
        ...profile,
        depositAmount: Number(profile.depositAmount)
      });
      setToast("Profile saved!");
    } catch {
      setToast("Failed to save changes.");
    }
  }

  async function handleAddSlot() {
    if (!newSlot.date || !newSlot.time) return;
    try {
      await addSlot({ ...newSlot, barberId: barber.uid });
      setNewSlot({ date: "", time: "" });
      setToast("Slot added!");
      await loadData();
    } catch { setToast("Failed to add slot."); }
  }

  async function handleCancelBooking(bookingId, slotId, slotDate, paymentIntentId) {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      const refundable = isRefundEligible(slotDate);
      if (refundable && paymentIntentId) {
        try { await requestRefund({ paymentIntentId, slotDate }); } 
        catch (refundErr) { console.warn("Refund failed:", refundErr); }
      }
      await cancelBooking(bookingId, slotId, barber.uid);
      setToast(refundable ? "Refund processed and booking cancelled." : "Booking cancelled.");
      await loadData();
      refetch();
    } catch (err) {
      setToast("Failed to cancel booking.");
    }
  }

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: "auto" }}>
      
      {/* MANDATORY STRIPE CHECK: If not enabled, show the guard overlay */}
      {!profile.stripeEnabled && (
        <StripeGuard onConnect={handleConnectStripe} loading={stripeLoading} />
      )}

      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <Avatar src={profile.profilePic} sx={{ width: 64, height: 64, bgcolor: "primary.main" }}>
          {profile.name ? profile.name[0].toUpperCase() : "B"}
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700}>{profile.name || "Dashboard"}</Typography>
          <Typography variant="body2" color="text.secondary">{barber?.email}</Typography>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
        <Tab label="Schedule" />
        <Tab label="Settings" />
      </Tabs>

      {tab === 0 && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} mb={2}>Manage Availability</Typography>
          <Box display="flex" gap={2} mb={4} flexWrap="wrap">
            <TextField 
              type="date" label="Date" value={newSlot.date}
              onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
              InputLabelProps={{ shrink: true }} 
            />
            <TextField 
              type="time" label="Time" value={newSlot.time}
              onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
              InputLabelProps={{ shrink: true }} 
            />
            <Button variant="contained" onClick={handleAddSlot} disabled={!newSlot.date || !newSlot.time}>
              Add Slot
            </Button>
          </Box>

          <Grid container spacing={2}>
            {slots.length === 0 ? (
              <Grid item xs={12}><Alert severity="info">No slots found.</Alert></Grid>
            ) : (
              slots.map((s) => {
                const booking = bookings.find(b => b.slotId === s.id && !b.cancelled);
                const isActuallyBooked = s.isBooked || !!booking;
                return (
                  <Grid item xs={12} key={s.id}>
                    <Paper variant="outlined" sx={{ 
                      p: 2, borderRadius: 2, display: "flex", justifyContent: "space-between", alignItems: "center",
                      borderColor: isActuallyBooked ? "success.light" : "divider",
                      bgcolor: isActuallyBooked ? "rgba(46,125,50,0.02)" : "white" 
                    }}>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{formatDate(s.date)} @ {s.time}</Typography>
                        {isActuallyBooked && (
                          <Box mt={0.5}>
                            <Typography variant="caption" color="success.main" sx={{ display: 'block', fontWeight: 600 }}>
                              {booking ? `BOOKED: ${booking.clientName || booking.name}` : "BOOKED"}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      <Box>
                        {isActuallyBooked ? (
                          <Button variant="outlined" color="error" size="small"
                            onClick={() => handleCancelBooking(booking?.id, s.id, s.date, booking?.paymentIntentId)}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <IconButton color="error" size="small" onClick={async () => { await deleteSlot(barber.uid, s.id); loadData(); }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                );
              })
            )}
          </Grid>
        </Paper>
      )}

      {tab === 1 && (
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Status section in settings for reference */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, borderLeft: 6, borderColor: "success.main" }}>
             <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography variant="h6" fontWeight={700} display="flex" alignItems="center" gap={1}>
                        <CheckCircleIcon color="success" /> Payouts Active
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Your Stripe account is connected.</Typography>
                </Box>
             </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
              <Avatar src={profile.profilePic} sx={{ width: 100, height: 100, mb: 2 }} />
              <Button variant="outlined" component="label" startIcon={uploading ? <CircularProgress size={16} /> : <PhotoCameraIcon />}>
                {uploading ? "Uploading..." : "Change Photo"}
                <input type="file" hidden accept="image/*" onChange={handleImageChange} />
              </Button>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Name" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Phone" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} fullWidth />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Services</Typography>
                <Box display="flex" gap={1} mb={2}>
                  <TextField label="Service Name" value={newService.name} onChange={(e) => setNewService({...newService, name: e.target.value})} fullWidth />
                  <TextField label="£" type="number" value={newService.price} onChange={(e) => setNewService({...newService, price: e.target.value})} sx={{ width: 100 }} />
                  <Button variant="outlined" onClick={handleAddService}><AddIcon /></Button>
                </Box>
                <List dense>
                  {profile.services?.map((s, i) => (
                    <ListItem key={i} secondaryAction={<IconButton onClick={() => handleRemoveService(i)}><DeleteIcon /></IconButton>}>
                      <ListItemText primary={s.name} secondary={`£${s.price}`} />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              <Grid item xs={12}>
                <TextField label="Bio" value={profile.bio} onChange={(e) => setProfile({...profile, bio: e.target.value})} fullWidth multiline rows={3} />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  label="Required Deposit" type="number" value={profile.depositAmount}
                  onChange={(e) => setProfile({...profile, depositAmount: e.target.value})}
                  InputProps={{ startAdornment: <InputAdornment position="start">£</InputAdornment> }}
                  fullWidth 
                />
              </Grid>
            </Grid>
            <Button variant="contained" fullWidth onClick={handleSaveProfile} sx={{ mt: 4 }}>Save Profile</Button>
          </Paper>
        </Box>
      )}

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)} message={toast} />
    </Box>
  );
}