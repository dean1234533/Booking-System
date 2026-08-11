// v2
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Dialog,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Divider,
  Avatar,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import {
  doc,
  getDoc,
  collection,
  query,
  getDocs,
  updateDoc,
  addDoc,
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

function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
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
  const ptName = ptProfile?.businessName || ptProfile?.name || "Personal Trainer";
  const logoUrl = ptProfile?.logoUrl;
  const tagline = ptProfile?.heroTagline || "Professional Personal Training";

  useEffect(() => {
    if (!ptId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "barbers", ptId));
        if (snap.exists()) setPtProfile({ id: snap.id, ...snap.data() });
      } catch (e) {
        // silently fail
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

  useEffect(() => { fetchSlots(); }, [ptId]);

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
    if (!clientName.trim()) { setSubmitError("Please enter your name."); return; }
    if (!purpose.trim()) { setSubmitError("Please describe the purpose of the session."); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const slotRef = doc(db, "barbers", ptId, "ptSlots", selectedSlot.id);
      const freshSnap = await getDoc(slotRef);
      if (!freshSnap.exists() || freshSnap.data().status !== "available") {
        await fetchSlots();
        setSubmitError("Sorry, this slot was just booked. Please choose another.");
        setSubmitting(false);
        return;
      }
      await updateDoc(slotRef, {
        status: "booked",
        clientName: clientName.trim(),
        purpose: purpose.trim(),
        bookedAt: serverTimestamp(),
      });
      const notifTitle = "New Booking!";
      const notifBody  = `${clientName.trim()} booked ${selectedSlot.time} on ${selectedSlot.date}${purpose.trim() ? ` — ${purpose.trim()}` : ""}`;
      addDoc(collection(db, "barbers", ptId, "notifications"), {
        type: "booking", title: notifTitle, body: notifBody,
        data: { clientName: clientName.trim(), date: selectedSlot.date, time: selectedSlot.time, purpose: purpose.trim() },
        read: false, createdAt: serverTimestamp(),
      }).catch(() => {});
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

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Hero Header ── */}
      <Box sx={{
        position: "relative",
        overflow: "hidden",
        bgcolor: "#0a0a0a",
        pb: { xs: 5, sm: 6 },
        pt: 0,
      }}>
        {/* Brand top strip */}
        <Box sx={{ height: 4, bgcolor: brandColor }} />

        {/* Radial glow */}
        <Box sx={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 70% 60% at 50% 100%, ${alpha(brandColor, 0.18)} 0%, transparent 70%)`,
        }} />

        {/* Subtle grid texture */}
        <Box sx={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.025,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        <Box sx={{
          position: "relative", zIndex: 1,
          display: "flex", flexDirection: "column", alignItems: "center",
          px: 3, pt: { xs: 5, sm: 6 },
        }}>
          {profileLoading ? (
            <CircularProgress size={40} sx={{ color: brandColor, mb: 4 }} />
          ) : (
            <>
              {/* Avatar / Logo */}
              {logoUrl ? (
                <Box
                  component="img"
                  src={logoUrl}
                  alt={ptName}
                  sx={{
                    width: 96, height: 96, borderRadius: "50%",
                    objectFit: "cover",
                    border: `3px solid ${brandColor}`,
                    boxShadow: `0 0 0 4px ${alpha(brandColor, 0.2)}, 0 20px 48px rgba(0,0,0,0.5)`,
                    mb: 3,
                  }}
                />
              ) : (
                <Avatar sx={{
                  width: 96, height: 96,
                  bgcolor: brandColor,
                  fontSize: 38, fontWeight: 900,
                  fontFamily: "'Playfair Display', serif",
                  mb: 3,
                  boxShadow: `0 0 0 4px ${alpha(brandColor, 0.25)}, 0 20px 48px rgba(0,0,0,0.5)`,
                }}>
                  {ptName.charAt(0).toUpperCase()}
                </Avatar>
              )}

              {/* Name */}
              <Typography sx={{
                fontFamily: "'Playfair Display', serif",
                fontSize: { xs: "2rem", sm: "2.6rem" },
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "-0.01em",
                textAlign: "center",
                lineHeight: 1.1,
                mb: 1.5,
              }}>
                {ptName}
              </Typography>

              {/* Divider with label */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Box sx={{ width: 28, height: 1, bgcolor: alpha(brandColor, 0.6) }} />
                <Typography sx={{
                  fontSize: "0.62rem", fontWeight: 800,
                  letterSpacing: "0.22em", textTransform: "uppercase",
                  color: alpha("#fff", 0.4),
                }}>
                  {tagline}
                </Typography>
                <Box sx={{ width: 28, height: 1, bgcolor: alpha(brandColor, 0.6) }} />
              </Box>

              {/* Stats pill */}
              <Box sx={{
                display: "flex", alignItems: "center", gap: 0.75,
                bgcolor: alpha("#fff", 0.06),
                backdropFilter: "blur(8px)",
                border: `1px solid ${alpha("#fff", 0.1)}`,
                borderRadius: "100px",
                px: 2, py: 0.75, mt: 0.5,
              }}>
                <FitnessCenterIcon sx={{ fontSize: 14, color: brandColor }} />
                <Typography sx={{
                  fontSize: "0.72rem", fontWeight: 600,
                  color: alpha("#fff", 0.7), letterSpacing: "0.04em",
                }}>
                  {slotsLoading ? "Loading..." : slots.length > 0 ? `${slots.length} slot${slots.length !== 1 ? "s" : ""} available` : "No slots available"}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* ── Slots ── */}
      <Box sx={{ maxWidth: 600, mx: "auto", px: { xs: 2, sm: 3 }, py: { xs: 4, sm: 5 } }}>

        {slotsError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{slotsError}</Alert>
        )}

        {slotsLoading ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 2 }}>
            <CircularProgress sx={{ color: brandColor }} />
            <Typography sx={{ color: "rgba(0,0,0,0.4)", fontSize: "0.85rem" }}>
              Loading available slots…
            </Typography>
          </Box>
        ) : slots.length === 0 ? (
          <Paper elevation={0} sx={{
            p: 5, textAlign: "center", borderRadius: "16px",
            border: "1px solid #e5e7eb", bgcolor: "#fff",
          }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: "50%",
              bgcolor: alpha(brandColor, 0.1),
              display: "flex", alignItems: "center", justifyContent: "center",
              mx: "auto", mb: 2.5,
            }}>
              <CalendarTodayIcon sx={{ color: brandColor, fontSize: 24 }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", color: "#111", mb: 1 }}>
              No slots available right now
            </Typography>
            <Typography sx={{ color: "rgba(0,0,0,0.45)", fontSize: "0.88rem", lineHeight: 1.7, maxWidth: 300, mx: "auto" }}>
              Check back soon — your trainer adds new slots regularly.
            </Typography>
          </Paper>
        ) : (
          sortedDates.map((dateKey) => (
            <Box key={dateKey} sx={{ mb: 4 }}>
              {/* Date heading */}
              <Box sx={{
                display: "flex", alignItems: "center", gap: 1.5, mb: 2,
              }}>
                <Box sx={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  bgcolor: brandColor, borderRadius: "10px",
                  px: 1.5, py: 0.75, minWidth: 44, flexShrink: 0,
                }}>
                  <Typography sx={{ fontSize: "0.55rem", fontWeight: 800, color: alpha("#000", 0.55), letterSpacing: "0.12em", lineHeight: 1, textTransform: "uppercase" }}>
                    {formatDayOfWeek(dateKey)}
                  </Typography>
                  <Typography sx={{ fontSize: "1.1rem", fontWeight: 900, color: "#000", lineHeight: 1.2 }}>
                    {dateKey.split("-")[2]}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#111", lineHeight: 1.2 }}>
                    {formatDateHeading(dateKey)}
                  </Typography>
                  <Typography sx={{ fontSize: "0.72rem", color: "rgba(0,0,0,0.4)", fontWeight: 600 }}>
                    {grouped[dateKey].length} slot{grouped[dateKey].length !== 1 ? "s" : ""} available
                  </Typography>
                </Box>
              </Box>

              {/* Slot cards */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pl: { xs: 0, sm: 0 } }}>
                {grouped[dateKey].map((slot) => (
                  <Paper
                    key={slot.id}
                    elevation={0}
                    sx={{
                      p: "18px 20px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      bgcolor: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                      "&:hover": {
                        borderColor: brandColor,
                        boxShadow: `0 4px 20px ${alpha(brandColor, 0.12)}`,
                        transform: "translateY(-1px)",
                      },
                    }}
                    onClick={() => openDialog(slot)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box sx={{
                        width: 44, height: 44, borderRadius: "10px",
                        bgcolor: alpha(brandColor, 0.08),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <AccessTimeIcon sx={{ fontSize: 20, color: brandColor }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color: "#111", lineHeight: 1, letterSpacing: "-0.02em" }}>
                          {slot.time}
                        </Typography>
                        <Typography sx={{ fontSize: "0.75rem", color: "rgba(0,0,0,0.4)", mt: 0.4, fontWeight: 500 }}>
                          {formatDuration(slot.duration)} session
                          {slot.price ? ` · £${slot.price}` : ""}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={(e) => { e.stopPropagation(); openDialog(slot); }}
                      sx={{
                        bgcolor: brandColor,
                        color: "#000",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        borderRadius: "8px",
                        px: 2.5,
                        py: 1,
                        flexShrink: 0,
                        boxShadow: "none",
                        "&:hover": { bgcolor: brandColor, filter: "brightness(0.9)", boxShadow: "none" },
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

      {/* ── Booking Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={!submitting ? closeDialog : undefined}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
          },
        }}
      >
        {/* Top brand strip */}
        <Box sx={{ height: 4, bgcolor: brandColor }} />

        {selectedSlot && !success && (
          <>
            <Box sx={{ px: 3, pt: 2.5, pb: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color: "#111", mb: 0.5 }}>
                Confirm your booking
              </Typography>

              {/* Slot summary chip */}
              <Box sx={{
                display: "flex", alignItems: "center", gap: 1.5,
                bgcolor: alpha(brandColor, 0.08),
                border: `1px solid ${alpha(brandColor, 0.2)}`,
                borderRadius: "10px",
                p: 1.5, mt: 2, mb: 2.5,
              }}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: "8px",
                  bgcolor: brandColor,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <CalendarTodayIcon sx={{ fontSize: 16, color: "#000" }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: "#111", lineHeight: 1.2 }}>
                    {formatDateHeading(selectedSlot.date)}
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "rgba(0,0,0,0.5)" }}>
                    {selectedSlot.time} · {formatDuration(selectedSlot.duration)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <DialogContent sx={{ px: 3, pt: 0, pb: 1 }}>
              <TextField
                label="Your name"
                fullWidth
                required
                size="small"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    "&.Mui-focused fieldset": { borderColor: brandColor },
                  },
                  "& label.Mui-focused": { color: brandColor },
                }}
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
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    "&.Mui-focused fieldset": { borderColor: brandColor },
                  },
                  "& label.Mui-focused": { color: brandColor },
                }}
                disabled={submitting}
              />
              {submitError && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: "10px" }}>{submitError}</Alert>
              )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3, pt: 1.5, gap: 1 }}>
              <Button
                onClick={closeDialog}
                disabled={submitting}
                sx={{
                  color: "rgba(0,0,0,0.4)", fontWeight: 600, borderRadius: "10px",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmBooking}
                disabled={submitting}
                sx={{
                  bgcolor: brandColor, color: "#000", fontWeight: 700,
                  borderRadius: "10px", px: 3, boxShadow: "none",
                  "&:hover": { bgcolor: brandColor, filter: "brightness(0.9)", boxShadow: "none" },
                  flex: 1,
                }}
              >
                {submitting ? <CircularProgress size={18} sx={{ color: "#000" }} /> : "Confirm Booking"}
              </Button>
            </DialogActions>
          </>
        )}

        {success && selectedSlot && (
          <DialogContent sx={{ textAlign: "center", py: 5, px: 3 }}>
            <Box sx={{
              width: 72, height: 72, borderRadius: "50%",
              bgcolor: alpha(brandColor, 0.12),
              display: "flex", alignItems: "center", justifyContent: "center",
              mx: "auto", mb: 2.5,
            }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 40, color: brandColor }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.3rem", color: "#111", mb: 0.75 }}>
              You're booked!
            </Typography>
            <Typography sx={{ color: "rgba(0,0,0,0.45)", mb: 3, fontSize: "0.9rem", lineHeight: 1.7 }}>
              Your session has been confirmed. We look forward to seeing you.
            </Typography>

            <Box sx={{
              bgcolor: alpha(brandColor, 0.07),
              border: `1px solid ${alpha(brandColor, 0.18)}`,
              borderRadius: "12px", p: 2.5, textAlign: "left",
            }}>
              <Divider sx={{ mb: 1.5 }} />
              <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#111" }}>
                {formatDateHeading(selectedSlot.date)}
              </Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "rgba(0,0,0,0.5)", mb: 1 }}>
                {selectedSlot.time} · {formatDuration(selectedSlot.duration)}
              </Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "#111" }}>
                <strong>Name:</strong> {clientName}
              </Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "#111" }}>
                <strong>Session:</strong> {purpose}
              </Typography>
            </Box>

            <Button
              variant="contained"
              onClick={closeDialog}
              sx={{
                mt: 3, bgcolor: brandColor, color: "#000",
                fontWeight: 700, px: 4, borderRadius: "10px",
                boxShadow: "none",
                "&:hover": { bgcolor: brandColor, filter: "brightness(0.9)", boxShadow: "none" },
              }}
            >
              Done
            </Button>
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
}
