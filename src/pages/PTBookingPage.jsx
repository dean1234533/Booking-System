import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Avatar,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDateHeading(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatDuration(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${h}h ${rem}min` : `${h} hr`;
}

function groupByDate(slots) {
  return slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});
}

export default function PTBookingPage() {
  const { ptId } = useParams();

  const [ptProfile, setPtProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState("");

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  const brandColor = ptProfile?.brandColor || "#C9A84C";

  useEffect(() => {
    if (!ptId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "barbers", ptId));
        if (snap.exists()) {
          setPtProfile({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        // silently fail — page still works without profile
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [ptId]);

  const fetchSlots = async () => {
    if (!ptId) return;
    setSlotsLoading(true);
    setSlotsError("");
    try {
      const slotsRef = collection(db, "barbers", ptId, "ptSlots");
      const snap = await getDocs(query(slotsRef));
      const today = todayStr();
      setSlots(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => s.status === "available" && s.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      );
    } catch (e) {
      setSlotsError("Unable to load available slots. Please try again later.");
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ptId]);

  const openDialog = (slot) => {
    setSelectedSlot(slot);
    setClientName("");
    setPurpose("");
    setSubmitError("");
    setSuccess(false);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedSlot(null);
    setSuccess(false);
  };

  const handleConfirmBooking = async () => {
    if (!clientName.trim()) {
      setSubmitError("Please enter your name.");
      return;
    }
    if (!purpose.trim()) {
      setSubmitError("Please describe the purpose of the session.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");

    try {
      const slotRef = doc(db, "barbers", ptId, "ptSlots", selectedSlot.id);

      // Re-check slot is still available
      const freshSnap = await getDoc(slotRef);
      if (!freshSnap.exists() || freshSnap.data().status !== "available") {
        await fetchSlots();
        setSubmitError("Sorry, this slot was just booked by someone else. Please choose another.");
        setSubmitting(false);
        return;
      }

      await updateDoc(slotRef, {
        status: "booked",
        clientName: clientName.trim(),
        purpose: purpose.trim(),
        bookedAt: serverTimestamp(),
      });

      // Send push notification to PT
      try {
        await fetch("/api/send-push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: ptId,
            title: "New Booking!",
            body: `${clientName.trim()} booked ${selectedSlot.time} on ${selectedSlot.date} — ${purpose.trim()}`,
          }),
        });
      } catch (_) {
        // Non-fatal — booking is confirmed even if notification fails
      }

      await fetchSlots();
      setSuccess(true);
    } catch (e) {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const grouped = groupByDate(slots);
  const sortedDates = Object.keys(grouped).sort();

  const ptName = ptProfile?.businessName || ptProfile?.name || "Personal Trainer";
  const logoUrl = ptProfile?.logoUrl;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fafafa" }}>
      {/* PT Header */}
      <Box
        sx={{
          bgcolor: "#fff",
          borderBottom: "1px solid #e0e0e0",
          py: 3,
          px: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        {profileLoading ? (
          <CircularProgress size={32} sx={{ color: brandColor }} />
        ) : (
          <>
            {logoUrl ? (
              <Avatar
                src={logoUrl}
                alt={ptName}
                sx={{ width: 72, height: 72, border: `3px solid ${brandColor}` }}
              />
            ) : (
              <Avatar
                sx={{
                  width: 72,
                  height: 72,
                  bgcolor: brandColor,
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                {ptName.charAt(0).toUpperCase()}
              </Avatar>
            )}
            <Box textAlign="center">
              <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
                {ptName}
              </Typography>
              <Typography variant="body1" color="text.secondary" mt={0.5}>
                Book a session
              </Typography>
            </Box>
          </>
        )}
      </Box>

      {/* Slots */}
      <Box sx={{ maxWidth: 600, mx: "auto", px: 2, py: 4 }}>
        {slotsError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {slotsError}
          </Alert>
        )}

        {slotsLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: brandColor }} />
          </Box>
        ) : slots.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{ p: 4, textAlign: "center", borderRadius: 3 }}
          >
            <Typography variant="h6" fontWeight={600} gutterBottom>
              No available slots right now
            </Typography>
            <Typography color="text.secondary">
              There are currently no sessions available. Please check back later
              or contact your trainer directly.
            </Typography>
          </Paper>
        ) : (
          sortedDates.map((dateKey) => (
            <Box key={dateKey} mb={4}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color="text.secondary"
                sx={{
                  mb: 1.5,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  fontSize: "0.72rem",
                }}
              >
                {formatDateHeading(dateKey)}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {grouped[dateKey].map((slot) => (
                  <Paper
                    key={slot.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      transition: "box-shadow 0.15s",
                      "&:hover": { boxShadow: 2 },
                    }}
                  >
                    <Box>
                      <Typography variant="h6" fontWeight={700} lineHeight={1}>
                        {slot.time}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mt={0.3}>
                        {formatDuration(slot.duration)} session
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="medium"
                      onClick={() => openDialog(slot)}
                      sx={{
                        bgcolor: brandColor,
                        color: "#fff",
                        fontWeight: 600,
                        borderRadius: 2,
                        "&:hover": {
                          bgcolor: brandColor,
                          filter: "brightness(0.88)",
                        },
                        flexShrink: 0,
                      }}
                    >
                      Book
                    </Button>
                  </Paper>
                ))}
              </Box>
            </Box>
          ))
        )}
      </Box>

      {/* Booking Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={!submitting ? closeDialog : undefined}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedSlot && !success && (
          <>
            <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
              Confirm your booking
            </DialogTitle>
            <DialogContent>
              {/* Slot summary */}
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 2.5,
                  borderRadius: 2,
                  bgcolor: `${brandColor}0f`,
                  borderColor: `${brandColor}44`,
                }}
              >
                <Typography variant="body2" color="text.secondary" fontSize="0.75rem" textTransform="uppercase" letterSpacing={0.6} fontWeight={600}>
                  Session details
                </Typography>
                <Typography fontWeight={700} mt={0.3}>
                  {formatDateHeading(selectedSlot.date)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedSlot.time} &nbsp;·&nbsp; {formatDuration(selectedSlot.duration)}
                </Typography>
              </Paper>

              <TextField
                label="Your name"
                fullWidth
                required
                size="small"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                sx={{ mb: 2 }}
                disabled={submitting}
              />
              <TextField
                label="What is this appointment for?"
                fullWidth
                required
                multiline
                minRows={2}
                size="small"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={submitting}
              />

              {submitError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {submitError}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              <Button
                onClick={closeDialog}
                disabled={submitting}
                sx={{ color: "text.secondary" }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmBooking}
                disabled={submitting}
                sx={{
                  bgcolor: brandColor,
                  color: "#fff",
                  fontWeight: 600,
                  "&:hover": { bgcolor: brandColor, filter: "brightness(0.88)" },
                }}
              >
                {submitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </DialogActions>
          </>
        )}

        {success && selectedSlot && (
          <>
            <DialogContent sx={{ textAlign: "center", py: 4, px: 3 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 56, color: brandColor, mb: 1.5 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>
                You're booked!
              </Typography>
              <Typography color="text.secondary" mb={2.5}>
                Your session has been confirmed. We look forward to seeing you.
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: `${brandColor}0f`,
                  borderColor: `${brandColor}44`,
                  textAlign: "left",
                }}
              >
                <Typography variant="body2" color="text.secondary" fontSize="0.75rem" textTransform="uppercase" letterSpacing={0.6} fontWeight={600}>
                  Booking summary
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography fontWeight={600}>{formatDateHeading(selectedSlot.date)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedSlot.time} &nbsp;·&nbsp; {formatDuration(selectedSlot.duration)}
                </Typography>
                <Typography variant="body2" mt={0.5}><strong>Name:</strong> {clientName}</Typography>
                <Typography variant="body2"><strong>Purpose:</strong> {purpose}</Typography>
              </Paper>
            </DialogContent>
            <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
              <Button
                variant="contained"
                onClick={closeDialog}
                sx={{
                  bgcolor: brandColor,
                  color: "#fff",
                  fontWeight: 600,
                  px: 4,
                  "&:hover": { bgcolor: brandColor, filter: "brightness(0.88)" },
                }}
              >
                Done
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
