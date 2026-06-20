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
import ContentCutIcon from "@mui/icons-material/ContentCut";
import { useAuth }     from "../context/AuthContext";
import { useBookings } from "../hooks/useBookings";
import BookingCard     from "../components/BookingCard";
import {
  getBarber, updateBarber, addSlot,
  getAllSlotsForBarber, deleteSlot,
  addClientRecord, getClientRecords,
} from "../firebase/firestore";
import { storage } from "../firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { formatDate, formatTime } from "../utils/formatters";

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

  // Client Records state
  const [records,       setRecords]      = useState([]);
  const [recordsLoad,   setRecordsLoad]  = useState(true);
  const [savingRecord,  setSavingRecord] = useState(false);
  const [newRecord, setNewRecord] = useState({
    clientName: "", haircutStyle: "", notes: "", visitDate: new Date(),
  });

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

  // Load client records
  async function loadRecords() {
    setRecordsLoad(true);
    const data = await getClientRecords(uid);
    setRecords(data);
    setRecordsLoad(false);
  }
  useEffect(() => { if (uid) loadRecords(); }, [uid]); // eslint-disable-line

  // Add a new manual client record
  async function handleAddRecord() {
    if (!newRecord.clientName || !newRecord.haircutStyle) return;
    setSavingRecord(true);
    try {
      await addClientRecord(uid, newRecord);
      setToast("Client record saved.");
      setNewRecord({ clientName: "", haircutStyle: "", notes: "", visitDate: new Date() });
      await loadRecords();
    } catch {
      setToast("Failed to save record.");
    } finally {
      setSavingRecord(false);
    }
  }

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
        {/* ── Identity Banner ─────────────────────────────────────────────── */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #1A1A1A 0%, #2C2C2C 50%, #1A1A1A 100%)",
            borderRadius: 3,
            px: { xs: 3, md: 5 },
            py: { xs: 3, md: 4 },
            mb: 4,
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          }}
        >
          {/* Subtle gold decorative stripe */}
          <Box
            sx={{
              position: "absolute",
              top: 0, left: 0,
              width: "100%", height: "3px",
              background: "linear-gradient(90deg, #C9A84C, #E8C96A, #C9A84C)",
            }}
          />

          {/* Business-type label */}
          <Box display="flex" alignItems="center" gap={1} mb={1.5}>
            <Box
              component="span"
              sx={{
                fontSize: "1.4rem",
                lineHeight: 1,
                filter: "drop-shadow(0 0 6px rgba(201,168,76,0.5))",
              }}
            >
              ✂️
            </Box>
            <Typography
              variant="overline"
              sx={{
                color: "#C9A84C",
                letterSpacing: "0.25em",
                fontSize: "0.7rem",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              Barber Dashboard
            </Typography>
          </Box>

          {/* Barber name */}
          <Typography
            variant="h3"
            sx={{
              color: "#FFFFFF",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              mb: 1,
              lineHeight: 1.1,
              fontSize: { xs: "1.8rem", md: "2.4rem" },
            }}
          >
            {profile.name}
          </Typography>

          {/* Specialty pill + date row */}
          <Box display="flex" alignItems="center" flexWrap="wrap" gap={1.5}>
            {profile.specialty && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  bgcolor: "rgba(201,168,76,0.15)",
                  border: "1px solid rgba(201,168,76,0.35)",
                  borderRadius: "20px",
                  px: 1.5,
                  py: 0.4,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "#C9A84C",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    fontSize: "0.72rem",
                  }}
                >
                  {profile.specialty}
                </Typography>
              </Box>
            )}
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.38)",
                letterSpacing: "0.08em",
                fontSize: "0.72rem",
              }}
            >
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Typography>
          </Box>

          {/* Avatar — top right corner */}
          <Avatar
            src={profile.photoURL}
            sx={{
              position: "absolute",
              right: { xs: 20, md: 40 },
              top: "50%",
              transform: "translateY(-50%)",
              width: { xs: 52, md: 72 },
              height: { xs: 52, md: 72 },
              bgcolor: "#C9A84C",
              color: "#1A1A1A",
              fontSize: { xs: 20, md: 28 },
              fontWeight: 800,
              border: "3px solid rgba(201,168,76,0.4)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}
          >
            {profile.name?.[0]}
          </Avatar>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}
        >
          <Tab label="Bookings" />
          <Tab label="Availability" />
          <Tab label="Client Records" />
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

        {/* ── Tab 2: Client Records ────────────────────────────────────────── */}
        <TabPanel value={tab} index={2}>

          {/* Add new record form */}
          <Paper
            variant="outlined"
            sx={{ p: 3, borderRadius: 3, mb: 4, borderColor: "rgba(201,168,76,0.4)", background: "rgba(201,168,76,0.03)" }}
          >
            <Typography variant="subtitle1" fontWeight={700} mb={0.5}
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              ✂️ &nbsp;Add a Client Record
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Log a walk-in or manual appointment — name, style, visit date and any notes.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Client Name"
                  value={newRecord.clientName}
                  onChange={(e) => setNewRecord((r) => ({ ...r, clientName: e.target.value }))}
                  fullWidth
                  required
                  placeholder="e.g. James Carter"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Haircut / Style"
                  value={newRecord.haircutStyle}
                  onChange={(e) => setNewRecord((r) => ({ ...r, haircutStyle: e.target.value }))}
                  fullWidth
                  required
                  placeholder="e.g. Skin fade with taper"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Visit Date"
                  value={newRecord.visitDate}
                  onChange={(d) => setNewRecord((r) => ({ ...r, visitDate: d }))}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Notes (optional)"
                  value={newRecord.notes}
                  onChange={(e) => setNewRecord((r) => ({ ...r, notes: e.target.value }))}
                  fullWidth
                  multiline
                  rows={1}
                  placeholder="e.g. prefers no clippers on top"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={handleAddRecord}
                  disabled={!newRecord.clientName || !newRecord.haircutStyle || savingRecord}
                  startIcon={savingRecord ? <CircularProgress size={16} color="inherit" /> : null}
                  sx={{ mt: 1 }}
                >
                  {savingRecord ? "Saving…" : "Save Record"}
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Records list */}
          <Typography variant="subtitle1" fontWeight={700} mb={2}>
            All Client Records ({records.length})
          </Typography>

          {recordsLoad ? (
            <CircularProgress />
          ) : records.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No client records yet. Add your first one above.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {records.map((rec) => {
                const dateObj = rec.visitDate?.toDate ? rec.visitDate.toDate() : new Date(rec.visitDate);
                const dateStr = dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                return (
                  <Grid item xs={12} sm={6} md={4} key={rec.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        borderColor: "divider",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      {/* Date badge */}
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#8B6914",
                          bgcolor: "rgba(201,168,76,0.12)",
                          borderRadius: "12px",
                          px: 1.2, py: 0.3,
                          fontWeight: 700,
                          fontSize: "0.68rem",
                          letterSpacing: "0.06em",
                          display: "inline-block",
                          mb: 0.5,
                        }}
                      >
                        {dateStr}
                      </Typography>

                      {/* Name */}
                      <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: "0.95rem" }}>
                        {rec.clientName}
                      </Typography>

                      {/* Style */}
                      <Box display="flex" alignItems="center" gap={0.8}>
                        <ContentCutIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                          {rec.haircutStyle}
                        </Typography>
                      </Box>

                      {/* Notes */}
                      {rec.notes && (
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 0.5,
                            fontSize: "0.8rem",
                            color: "text.secondary",
                            fontStyle: "italic",
                            borderTop: "1px solid",
                            borderColor: "divider",
                            pt: 1,
                          }}
                        >
                          {rec.notes}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </TabPanel>

        {/* ── Tab 3: Profile & Settings ────────────────────────────────────── */}
        <TabPanel value={tab} index={3}>
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
