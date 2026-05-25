import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Button, Typography, Paper, Grid, Chip,
  TextField, CircularProgress, Alert, Divider,
  IconButton, Tooltip, Stack,
} from "@mui/material";
import {
  CalendarMonth as CalendarIcon,
  CheckCircle  as CheckIcon,
  ContentCopy  as CopyIcon,
  Delete       as DeleteIcon,
  EventAvailable as AvailableIcon,
  EventBusy    as BusyIcon,
  Share        as ShareIcon,
  Refresh      as RefreshIcon,
} from "@mui/icons-material";
import {
  collection, getDocs, query, where,
  addDoc, deleteDoc, doc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { getFunctions, httpsCallable } from "firebase/functions";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getWeekDates(offset = 0) {
  const today = new Date();
  today.setDate(today.getDate() + offset * 7);
  const day    = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmt(date) {
  return date.toISOString().split("T")[0];
}

function toLabel(date) {
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

const TIME_SLOTS = [
  "06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30",
  "14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30",
  "18:00","18:30","19:00","19:30","20:00","20:30","21:00",
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function CalendarSyncTab({ barber, profile, brandColor = "#C9A84C" }) {
  const [weekOffset,    setWeekOffset]    = useState(0);
  const [slots,         setSlots]         = useState([]);
  const [bookings,      setBookings]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [toast,         setToast]         = useState(null);
  const [copiedLink,    setCopiedLink]    = useState(false);
  const [filterMode,    setFilterMode]    = useState("all"); // "all" | "available" | "booked"
  const [selectedTime,  setSelectedTime]  = useState("");
  const [bulkDate,      setBulkDate]      = useState(fmt(new Date()));
  const [bulkRepeat,    setBulkRepeat]    = useState("none");

  // ── Manual booking state ──────────────────────────────────────────────────
  const [manualOpen,    setManualOpen]    = useState(false);
  const [manualSlot,    setManualSlot]    = useState(null);
  const [manualName,    setManualName]    = useState("");
  const [manualEmail,   setManualEmail]   = useState("");
  const [manualSending, setManualSending] = useState(false);

  const weekDates = getWeekDates(weekOffset);
  const functions = getFunctions();

  // Public booking link — respects custom domain if set
  const bookingLink = profile?.customDomain
    ? `https://${profile.customDomain}#booking-section`
    : `${window.location.origin}/book/${barber?.uid}`;

  // ── Load data ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!barber?.uid) return;
    setLoading(true);
    try {
      const startDate = fmt(weekDates[0]);
      const endDate   = fmt(weekDates[6]);

      const sSnap = await getDocs(
        query(
          collection(db, "slots"),
          where("barberId", "==", barber.uid),
          where("date", ">=", startDate),
          where("date", "<=", endDate),
        )
      );
      setSlots(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const bSnap = await getDocs(
        query(
          collection(db, "bookings"),
          where("barberId", "==", barber.uid),
          where("date",    ">=", startDate),
          where("date",    "<=", endDate),
        )
      );
      setBookings(bSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      setToast({ type: "error", msg: "Failed to load calendar data" });
    } finally {
      setLoading(false);
    }
  }, [barber?.uid, weekOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData(); }, [loadData]);

  // ── Add single slot (quick-add from day column) ───────────────────────────

  async function handleAddSlot(dateStr, time) {
    if (!barber?.uid || !time) return;
    setSaving(true);
    try {
      const already = slots.find(s => s.date === dateStr && s.time === time);
      if (already) {
        setToast({ type: "warning", msg: "Slot already exists at that time" });
        return;
      }
      await addDoc(collection(db, "slots"), {
        date:      dateStr,
        time,
        barberId:  barber.uid,
        shopId:    barber.uid,
        isBooked:  false,
        status:    "open",
        createdAt: serverTimestamp(),
      });
      setToast({ type: "success", msg: `Slot added: ${dateStr} at ${time}` });
      await loadData();
    } catch {
      setToast({ type: "error", msg: "Failed to add slot" });
    } finally {
      setSaving(false);
    }
  }

  // ── Bulk add ──────────────────────────────────────────────────────────────

  async function handleBulkAdd() {
    if (!bulkDate || !selectedTime || !barber?.uid) return;
    setSaving(true);
    try {
      const iterations = bulkRepeat === "week" ? 7 : bulkRepeat === "month" ? 30 : 1;
      const adds = [];
      for (let i = 0; i < iterations; i++) {
        const d = new Date(bulkDate);
        d.setDate(d.getDate() + i);
        const dateStr = fmt(d);
        if (!slots.find(s => s.date === dateStr && s.time === selectedTime)) {
          adds.push(addDoc(collection(db, "slots"), {
            date:      dateStr,
            time:      selectedTime,
            barberId:  barber.uid,
            shopId:    barber.uid,
            isBooked:  false,
            status:    "open",
            createdAt: serverTimestamp(),
          }));
        }
      }
      await Promise.all(adds);
      setToast({ type: "success", msg: `Added ${adds.length} slot${adds.length !== 1 ? "s" : ""}` });
      await loadData();
    } catch {
      setToast({ type: "error", msg: "Failed to add slots" });
    } finally {
      setSaving(false);
    }
  }

  // ── Delete slot ───────────────────────────────────────────────────────────

  async function handleDeleteSlot(slotId) {
    setSaving(true);
    try {
      await deleteDoc(doc(db, "slots", slotId));
      setToast({ type: "success", msg: "Slot removed" });
      await loadData();
    } catch {
      setToast({ type: "error", msg: "Failed to remove slot" });
    } finally {
      setSaving(false);
    }
  }

  // ── Manual booking with email confirmation ────────────────────────────────

  function openManual(slot) {
    setManualSlot(slot);
    setManualName("");
    setManualEmail("");
    setManualOpen(true);
  }

  async function handleManualBook() {
    if (!manualSlot || !manualName || !manualEmail) return;
    setManualSending(true);
    try {
      // 1. Write booking to Firestore
      await addDoc(collection(db, "bookings"), {
        barberId:      barber.uid,
        shopId:        barber.uid,
        slotId:        manualSlot.id,
        date:          manualSlot.date,
        time:          manualSlot.time,
        customerName:  manualName,
        customerEmail: manualEmail,
        status:        "confirmed",
        createdAt:     serverTimestamp(),
      });

      // 2. Mark slot as booked
      await updateDoc(doc(db, "slots", manualSlot.id), {
        isBooked: true,
        status:   "booked",
      });

      // 3. Send confirmation email with .ics attachment via Cloud Function
      const sendConfirmation = httpsCallable(functions, "sendBookingConfirmation");
      await sendConfirmation({
        clientEmail:  manualEmail,
        clientName:   manualName,
        trainerName:  profile?.name || profile?.businessName || "Your Trainer",
        businessName: profile?.businessName || "PT Booking",
        date:         manualSlot.date,
        time:         manualSlot.time,
        location:     profile?.address || "",
      });

      setToast({ type: "success", msg: `Booking confirmed & email sent to ${manualEmail}` });
      setManualOpen(false);
      await loadData();
    } catch (err) {
      setToast({ type: "error", msg: "Booking failed: " + err.message });
    } finally {
      setManualSending(false);
    }
  }

  // ── Copy booking link ─────────────────────────────────────────────────────

  const copyLink = () => {
    navigator.clipboard.writeText(bookingLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // ── Derived helpers ───────────────────────────────────────────────────────

  function getSlotsForDate(dateStr) {
    return slots.filter(s => s.date === dateStr);
  }

  function getBookingForSlot(dateStr, time) {
    return bookings.find(b => b.date === dateStr && b.time === time);
  }

  const availableCount = slots.filter(s => !s.isBooked).length;
  const bookedCount    = slots.filter(s =>  s.isBooked).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>

      {/* Toast */}
      {toast && (
        <Alert severity={toast.type} onClose={() => setToast(null)} sx={{ mb: 2, borderRadius: 2 }}>
          {toast.msg}
        </Alert>
      )}

      {/* ── Manual booking modal ── */}
      {manualOpen && manualSlot && (
        <Box
          sx={{
            position: "fixed", inset: 0, zIndex: 9999,
            bgcolor: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", p: 2,
          }}
          onClick={() => setManualOpen(false)}
        >
          <Paper
            sx={{ p: 4, borderRadius: 3, maxWidth: 420, width: "100%" }}
            onClick={e => e.stopPropagation()}
          >
            <Typography variant="h6" fontWeight={800} mb={0.5}>
              Manual Booking
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {manualSlot.date} at {manualSlot.time} — client will receive a confirmation email
              with a calendar invite (.ics).
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth size="small" label="Client Name"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
              />
              <TextField
                fullWidth size="small" label="Client Email" type="email"
                value={manualEmail}
                onChange={e => setManualEmail(e.target.value)}
              />
              <Button
                fullWidth variant="contained"
                disabled={!manualName || !manualEmail || manualSending}
                onClick={handleManualBook}
                sx={{ bgcolor: brandColor, borderRadius: 2, fontWeight: 700, py: 1.5 }}
              >
                {manualSending
                  ? <CircularProgress size={18} color="inherit" />
                  : "Confirm & Send Email"}
              </Button>
              <Button fullWidth onClick={() => setManualOpen(false)} sx={{ borderRadius: 2 }}>
                Cancel
              </Button>
            </Stack>
          </Paper>
        </Box>
      )}

      {/* ── Header row ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>

        {/* Stats */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={800} mb={2}>
              This Week's Overview
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Chip
                icon={<AvailableIcon />}
                label={`${availableCount} Available`}
                color="success"
                variant={filterMode === "available" ? "filled" : "outlined"}
                onClick={() => setFilterMode(f => f === "available" ? "all" : "available")}
                sx={{ fontWeight: 700, cursor: "pointer" }}
              />
              <Chip
                icon={<BusyIcon />}
                label={`${bookedCount} Booked`}
                color="warning"
                variant={filterMode === "booked" ? "filled" : "outlined"}
                onClick={() => setFilterMode(f => f === "booked" ? "all" : "booked")}
                sx={{ fontWeight: 700, cursor: "pointer" }}
              />
              <Chip
                icon={<CalendarIcon />}
                label={`${slots.length} Total Slots`}
                variant={filterMode === "all" ? "filled" : "outlined"}
                onClick={() => setFilterMode("all")}
                sx={{ fontWeight: 700, cursor: "pointer" }}
              />
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={loadData} disabled={loading}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Paper>
        </Grid>

        {/* Booking link */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <Typography variant="subtitle2" fontWeight={800} mb={1}>
              <ShareIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: "middle" }} />
              Your Booking Link
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all", display: "block", mb: 1.5 }}>
              {bookingLink}
            </Typography>
            <Button
              fullWidth variant="contained"
              startIcon={copiedLink ? <CheckIcon /> : <CopyIcon />}
              onClick={copyLink}
              sx={{ bgcolor: copiedLink ? "success.main" : brandColor, borderRadius: 2, fontWeight: 700 }}
            >
              {copiedLink ? "Copied!" : "Copy Link"}
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Quick-add slot row ── */}
      <Paper sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={800} mb={2}>
          Add Available Slots
        </Typography>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth size="small" type="date" label="Date"
              value={bulkDate}
              onChange={e => setBulkDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth size="small" select label="Time"
              value={selectedTime}
              onChange={e => setSelectedTime(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="">Select time</option>
              {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth size="small" select label="Repeat"
              value={bulkRepeat}
              onChange={e => setBulkRepeat(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="none">No repeat</option>
              <option value="week">Every day this week (7)</option>
              <option value="month">Every day this month (30)</option>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              fullWidth variant="contained"
              disabled={!selectedTime || !bulkDate || saving}
              onClick={handleBulkAdd}
              sx={{ bgcolor: brandColor, borderRadius: 2, fontWeight: 700, height: 40 }}
            >
              {saving ? <CircularProgress size={18} color="inherit" /> : "Add Slot(s)"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Week navigation ── */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Button variant="outlined" size="small" onClick={() => setWeekOffset(w => w - 1)} sx={{ borderRadius: 2 }}>
          ← Previous
        </Button>
        <Typography fontWeight={800} fontSize={15}>
          {toLabel(weekDates[0])} — {toLabel(weekDates[6])}
        </Typography>
        <Button variant="outlined" size="small" onClick={() => setWeekOffset(w => w + 1)} sx={{ borderRadius: 2 }}>
          Next →
        </Button>
      </Box>

      {/* ── Week grid ── */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={1.5}>
          {weekDates.map((date) => {
            const dateStr  = fmt(date);
            const daySlots = getSlotsForDate(dateStr);
            const isToday  = dateStr === fmt(new Date());

            const filtered =
              filterMode === "available" ? daySlots.filter(s => !s.isBooked) :
              filterMode === "booked"    ? daySlots.filter(s =>  s.isBooked) :
              daySlots;

            return (
              <Grid item xs={12} sm={6} md={12 / 7} key={dateStr}>
                <Paper
                  sx={{
                    p: 1.5, borderRadius: 3, minHeight: 180,
                    border: isToday ? `2px solid ${brandColor}` : "1px solid #eee",
                    bgcolor: isToday ? `${brandColor}08` : "#fff",
                  }}
                >
                  {/* Day header */}
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Box>
                      <Typography fontSize={11} fontWeight={800} color="text.secondary" textTransform="uppercase">
                        {DAYS[date.getDay()]}
                      </Typography>
                      <Typography
                        fontSize={18} fontWeight={900} lineHeight={1}
                        style={{ color: isToday ? brandColor : "#111" }}
                      >
                        {date.getDate()}
                      </Typography>
                    </Box>
                    <Chip
                      label={daySlots.length}
                      size="small"
                      sx={{
                        fontSize: 10, fontWeight: 800, height: 20,
                        bgcolor: daySlots.length ? `${brandColor}22` : "#f0f0f0",
                        color:   daySlots.length ? brandColor : "#aaa",
                      }}
                    />
                  </Box>

                  <Divider sx={{ mb: 1 }} />

                  {/* Slots list */}
                  <Box sx={{ maxHeight: 280, overflowY: "auto" }}>
                    {filtered.length === 0 ? (
                      <Typography fontSize={11} color="text.disabled" textAlign="center" mt={1}>
                        {filterMode !== "all" ? "None" : "No slots"}
                      </Typography>
                    ) : (
                      filtered.map((slot) => {
                        const booking = getBookingForSlot(slot.date, slot.time);
                        return (
                          <Box
                            key={slot.id}
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                              mb: 0.5, px: 1, py: 0.5, borderRadius: 1.5,
                              bgcolor: slot.isBooked ? "#fff8e1" : "#f0fdf4",
                              border:  slot.isBooked ? "1px solid #ffe082" : "1px solid #bbf7d0",
                            }}
                          >
                            <Box>
                              <Typography fontSize={11} fontWeight={700}>{slot.time}</Typography>
                              {booking && (
                                <Typography fontSize={10} color="text.secondary" noWrap>
                                  {booking.customerName || "Booked"}
                                </Typography>
                              )}
                            </Box>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Chip
                                label={slot.isBooked ? "Booked" : "Free"}
                                size="small"
                                sx={{
                                  fontSize: 9, fontWeight: 800, height: 18, px: 0.5,
                                  bgcolor: slot.isBooked ? "#ffe082" : "#bbf7d0",
                                  color:   slot.isBooked ? "#7c5700" : "#166534",
                                }}
                              />
                              {/* Manual book button — free slots only */}
                              {!slot.isBooked && (
                                <Tooltip title="Book manually & email client">
                                  <IconButton
                                    size="small"
                                    onClick={() => openManual(slot)}
                                    sx={{ p: 0.25 }}
                                  >
                                    <CheckIcon sx={{ fontSize: 14, color: brandColor }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {/* Delete button — free slots only */}
                              {!slot.isBooked && (
                                <Tooltip title="Remove slot">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    sx={{ p: 0.25 }}
                                  >
                                    <DeleteIcon sx={{ fontSize: 14, color: "#ccc" }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </Box>
                        );
                      })
                    )}
                  </Box>

                  {/* Quick-add button for this specific day */}
                  {selectedTime && (
                    <Button
                      fullWidth size="small"
                      onClick={() => handleAddSlot(dateStr, selectedTime)}
                      disabled={saving}
                      sx={{
                        mt: 1, fontSize: 10, fontWeight: 700, borderRadius: 2,
                        color: brandColor, border: `1px dashed ${brandColor}`,
                        bgcolor: "transparent",
                        "&:hover": { bgcolor: `${brandColor}10` },
                      }}
                    >
                      + {selectedTime}
                    </Button>
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ── How client booking works ── */}
      <Paper sx={{ p: 3, borderRadius: 3, mt: 3, bgcolor: "#f8f9fa" }}>
        <Typography variant="subtitle1" fontWeight={800} mb={1.5}>
          How Client Bookings Work
        </Typography>
        <Grid container spacing={2}>
          {[
            {
              icon: "🔗",
              title: "Share your link",
              desc:  "Copy your booking link above and share it on Instagram, WhatsApp, or your website.",
            },
            {
              icon: "📅",
              title: "Client picks a slot",
              desc:  "They see only your available (free) slots and choose one that works for them.",
            },
            {
              icon: "✅",
              title: "Slot is confirmed",
              desc:  "The slot is marked as booked in your calendar and disappears from public view.",
            },
            {
              icon: "📧",
              title: "Email confirmation",
              desc:  "Client receives a confirmation email with the time, date, and an .ics calendar file to add to their calendar.",
            },
          ].map((item, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Box sx={{ p: 2, bgcolor: "#fff", borderRadius: 2, border: "1px solid #eee", height: "100%" }}>
                <Typography fontSize={24} mb={1}>{item.icon}</Typography>
                <Typography fontWeight={800} fontSize={13} mb={0.5}>{item.title}</Typography>
                <Typography fontSize={12} color="text.secondary" lineHeight={1.5}>{item.desc}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

    </Box>
  );
}