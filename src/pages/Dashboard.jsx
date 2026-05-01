import React, { useState, useEffect } from "react";
import {
  Box, Container, Typography, Grid, Paper, TextField,
  Button, Avatar, Tab, Tabs, Alert, CircularProgress, Snackbar
} from "@mui/material";
import { DatePicker, TimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";
import { useAuth } from "../components/AuthContext";
import { useBookings } from "../hooks/useBookings.js";
import BookingCard from "../components/BookingCard";
import {
  getBarber, updateBarber, addSlot,
  getAllSlotsForBarber, deleteSlot,
} from "../firebase/firestore";
import { storage } from "../firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { formatDate, formatTime } from "../stripe/formatters.js";

export default function Dashboard() {
  const { barber: authUser } = useAuth();
  const uid = authUser?.uid;
  const { bookings, loading: bookingsLoading, refetch } = useBookings(uid);

  // State Management
  const [tab, setTab] = useState(0);
  const [profile, setProfile] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [slots, setSlots] = useState([]);
  const [newDate, setNewDate] = useState(null);
  const [newTime, setNewTime] = useState(null);
  const [addingSlot, setAddingSlot] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    if (!uid) return;
    getBarber(uid).then((doc) => {
      setProfile(doc);
      if (!doc?.setupComplete) setIsNew(true);
    });
    loadSlots();
  }, [uid]);

  const loadSlots = async () => {
    if (!uid) return;
    const data = await getAllSlotsForBarber(uid);
    setSlots(data);
  };

  // 2. Event Handlers
  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await updateBarber(uid, { ...profile, depositAmount: Number(profile.depositAmount) });
      setToast("Profile updated!");
    } finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setSaving(true);
    try {
      const storageRef = ref(storage, `barbers/${uid}/profile`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateBarber(uid, { photoURL: url });
      setProfile(prev => ({ ...prev, photoURL: url }));
      setToast("Photo uploaded!");
    } finally { setSaving(false); }
  };

  const handleAddSlot = async () => {
    if (!newDate || !newTime) return;
    setAddingSlot(true);
    try {
      await addSlot({ barberId: uid, date: newDate, time: format(newTime, "HH:mm") });
      await loadSlots();
      setNewDate(null); setNewTime(null);
    } finally { setAddingSlot(false); }
  };

  // 3. Conditional Rendering (Onboarding Interceptor)
  if (isNew) {
    return (
      <Container maxWidth="sm" sx={{ py: 10 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" mb={3}>Complete Your Profile</Typography>
          <Avatar src={profile?.photoURL} sx={{ width: 100, height: 100, mx: "auto", mb: 2 }} />
          <Button variant="outlined" component="label" sx={{ mb: 3 }}>
            Upload Photo
            <input type="file" hidden accept="image/*" onChange={handlePhotoUpload} />
          </Button>
          <TextField 
            fullWidth label="Barber Name" 
            value={profile?.name || ""} 
            onChange={(e) => setProfile({...profile, name: e.target.value})}
            sx={{ mb: 3 }}
          />
          <Button 
            fullWidth variant="contained" 
            disabled={!profile?.photoURL || !profile?.name || saving}
            onClick={async () => {
              await updateBarber(uid, { ...profile, setupComplete: true });
              setIsNew(false);
            }}
          >
            Finish Setup
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!profile) return <Box py={10} textAlign="center"><CircularProgress /></Box>;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 4 }}>
          <Tab label="Bookings" />
          <Tab label="Availability" />
          <Tab label="Profile" />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={2}>
            {bookings.length === 0 ? <Alert severity="info" sx={{ width: '100%' }}>No bookings found.</Alert> : 
              bookings.map(b => (
                <Grid item xs={12} sm={6} key={b.id}>
                  <BookingCard booking={b} onCancelled={refetch} />
                </Grid>
              ))
            }
          </Grid>
        )}

        {tab === 1 && (
          <Box>
            <Paper sx={{ p: 3, mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <DatePicker label="Date" value={newDate} onChange={setNewDate} slotProps={{ textField: { size: "small" } }} />
              <TimePicker label="Time" value={newTime} onChange={setNewTime} slotProps={{ textField: { size: "small" } }} />
              <Button variant="contained" onClick={handleAddSlot} disabled={addingSlot}>Add Slot</Button>
            </Paper>
            {slots.map(s => (
              <Box key={s.id} display="flex" justifyContent="space-between" p={2} borderBottom="1px solid #eee">
                <Typography>{formatDate(s.date)} at {formatTime(s.time)}</Typography>
                <Button color="error" onClick={() => deleteSlot(s.id).then(loadSlots)}>Remove</Button>
              </Box>
            ))}
          </Box>
        )}

        {tab === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Avatar src={profile.photoURL} sx={{ width: 80, height: 80, mb: 1 }} />
              <Button variant="outlined" component="label">Change Photo<input type="file" hidden onChange={handlePhotoUpload}/></Button>
            </Grid>
            <Grid item xs={12}><TextField fullWidth label="Name" value={profile.name || ""} onChange={e => setProfile({...profile, name: e.target.value})} /></Grid>
            <Grid item xs={12}><Button variant="contained" onClick={handleProfileSave} disabled={saving}>Save Changes</Button></Grid>
          </Grid>
        )}
      </Container>
      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)} message={toast} />
    </LocalizationProvider>
  );
}