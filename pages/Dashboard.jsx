import React from "react";

// src/pages/Dashboard.jsx
// Barber-only page — manage profile, availability, deposit amount and bookings.
// Protected by BarberRoute in App.jsx

import { useState, useEffect } from "react";
import {
  Box, Container, Typography, Grid, Paper, TextField,
  Button, Avatar, Divider, Tab, Tabs, Alert, CircularProgress,
  InputAdornment, Snackbar,
} from "@mui/material";
import { DatePicker, TimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";
import { useAuth }     from "../components/AuthContext";
import { useBookings } from "../hooks/useBookings.js";
import BookingCard     from "../components/BookingCard";
import {
  getBarber, updateBarber, addSlot,
  getAllSlotsForBarber, deleteSlot,
} from "../firebase/firestore";
import { storage } from "../firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { formatDate, formatTime } from "../Stripe+Utils/formatters.js";

function TabPanel({ value, index, children }) {
  return value === index ? <Box pt={3}>{children}</Box> : null;
}

export default function Dashboard() {
  const { barber: authUser } = useAuth();
  const uid = authUser?.uid;

  const { bookings, loading: bookingsLoading, refetch } = useBookings(uid);

  const [tab,        setTab]        = useState(0);
  const [profile,    setProfile]    = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);

  // Availability state
  const [slots,       setSlots]      = useState([]);
  const [slotsLoad,   setSlotsLoad]  = useState(true);
  const [newDate,     setNewDate]    = useState(null);
  const [newTime,     setNewTime]    = useState(null);
  const [addingSlot,  setAddingSlot] = useState(false);

  // Load barber profile
  useEffect(() => {
    if (!uid) return;
    getBarber(uid).then(setProfile);
  }, [uid]);

  // Load all slots (open + booked) for the barber
  async function loadSlots() {
    setSlotsLoad(true);
    const data = await getAllSlotsForBarber(uid);
    setSlots(data);
    setSlotsLoad(false);
  }

  useEffect(() => { if (uid) loadSlots(); }, [uid]); // eslint-disable-line

  // ── Profile save ────────────────────────────────────────────────────────────
  async function handleProfileSave() {
    setSaving(true);
    try {
      await updateBarber(uid, {
        name:          profile.name,
        phone:         profile.phone,
        specialty:     profile.specialty,
        bio:           profile.bio,
        depositAmount: Number(profile.depositAmount),
      });
      setToast("Profile saved.");
    } catch {
      setToast("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Photo upload ─────────────────────────────────────────────────────────────
  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const storageRef = ref(storage, `barbers/${uid}/profile`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await updateBarber(uid, { photoURL: url });
    setProfile((p) => ({ ...p, photoURL: url }));
    setToast("Photo updated.");
  }

  // ── Add slot ─────────────────────────────────────────────────────────────────
  async function handleAddSlot() {
    if (!newDate || !newTime) return;
    setAddingSlot(true);
    try {
      await addSlot({
        barberId: uid,
        date:     newDate,
        time:     format(newTime, "HH:mm"),
      });
      setToast("Slot added.");
      setNewDate(null);
      setNewTime(null);
      await loadSlots();
    } catch {
      setToast("Failed to add slot.");
    } finally {
      setAddingSlot(false);
    }
  }

  // ── Delete slot ───────────────────────────────────────────────────────────────
  async function handleDeleteSlot(slotId) {
    await deleteSlot(slotId);
    setToast("Slot removed.");
    await loadSlots();
  }

  if (!profile) {
    return (
      <Container maxWidth="md" sx={{ py: 10, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  const upcomingBookings = bookings.filter((b) => !b.cancelled);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={2} mb={4}>
          <Avatar
            src={profile.photoURL}
            sx={{ width: 56, height: 56, bgcolor: "primary.main", fontSize: 22, fontWeight: 700 }}
          >
            {profile.name?.[0]}
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight={700}>{profile.name}</Typography>
            <Typography variant="body2" color="text.secondary">Your Dashboard</Typography>
          </Box>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}
        >
          <Tab label="Bookings" />
          <Tab label="Availability" />
          <Tab label="Profile & Settings" />
        </Tabs>

        {/* ── Tab 0: Bookings ──────────────────────────────────────────────── */}
        <TabPanel value={tab} index={0}>
          <Typography variant="h6" fontWeight={700} mb={3}>
            Upcoming Bookings ({upcomingBookings.length})
          </Typography>

          {bookingsLoading ? (
            <CircularProgress />
          ) : upcomingBookings.length === 0 ? (
            <Alert severity="info">No upcoming bookings yet.</Alert>
          ) : (
            <Grid container spacing={2}>
              {upcomingBookings.map((b) => (
                <Grid item xs={12} sm={6} md={4} key={b.id}>
                  <BookingCard booking={b} onCancelled={refetch} />
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* ── Tab 1: Availability ──────────────────────────────────────────── */}
        <TabPanel value={tab} index={1}>
          <Typography variant="h6" fontWeight={700} mb={3}>Manage Your Slots</Typography>

          {/* Add new slot */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 4 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>Add a New Slot</Typography>
            <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
              <DatePicker
                label="Date"
                value={newDate}
                onChange={setNewDate}
                disablePast
                slotProps={{ textField: { size: "small" } }}
              />
              <TimePicker
                label="Time"
                value={newTime}
                onChange={setNewTime}
                minutesStep={15}
                slotProps={{ textField: { size: "small" } }}
              />
              <Button
                variant="contained"
                onClick={handleAddSlot}
                disabled={!newDate || !newTime || addingSlot}
                startIcon={addingSlot ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {addingSlot ? "Adding…" : "Add Slot"}
              </Button>
            </Box>
          </Paper>

          {/* Existing slots */}
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Your Slots</Typography>
          {slotsLoad ? (
            <CircularProgress />
          ) : slots.length === 0 ? (
            <Alert severity="info">You have no slots set up yet.</Alert>
          ) : (
            <Grid container spacing={1.5}>
              {slots.map((slot) => (
                <Grid item xs={12} sm={6} md={4} key={slot.id}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2, borderRadius: 2,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderColor: slot.status === "booked" ? "success.main" : "divider",
                      bgcolor: slot.status === "booked" ? "rgba(46,125,50,0.04)" : "transparent",
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {formatDate(slot.date)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatTime(slot.time)} · {slot.status === "booked" ? "Booked" : "Open"}
                      </Typography>
                    </Box>
                    {slot.status === "open" && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDeleteSlot(slot.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* ── Tab 2: Profile & Settings ────────────────────────────────────── */}
        <TabPanel value={tab} index={2}>
          <Grid container spacing={4}>

            {/* Photo upload */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Profile Photo</Typography>
              <Box display="flex" alignItems="center" gap={3}>
                <Avatar
                  src={profile.photoURL}
                  sx={{ width: 80, height: 80, bgcolor: "primary.main", fontSize: 28 }}
                >
                  {profile.name?.[0]}
                </Avatar>
                <Button variant="outlined" component="label">
                  Upload Photo
                  <input type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12}><Divider /></Grid>

            {/* Profile fields */}
            <Grid item xs={12} sm={6}>
              <TextField label="Full Name" value={profile.name ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Phone Number" value={profile.phone ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Specialty" value={profile.specialty ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, specialty: e.target.value }))}
                fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Bio" value={profile.bio ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                fullWidth multiline rows={4} />
            </Grid>

            <Grid item xs={12}><Divider /></Grid>

            {/* Deposit amount */}
            <Grid item xs={12} sm={4}>
              <TextField
                label="Deposit Amount"
                type="number"
                value={profile.depositAmount ?? 10}
                onChange={(e) => setProfile((p) => ({ ...p, depositAmount: e.target.value }))}
                fullWidth
                inputProps={{ min: 1, step: 1 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                }}
                helperText="Clients pay this to confirm their slot"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                size="large"
                onClick={handleProfileSave}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
              >
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

      </Container>

      {/* Toast notifications */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </LocalizationProvider>
  );
}
