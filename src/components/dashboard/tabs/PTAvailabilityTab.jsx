import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AvailabilityCalendar from "./AvailabilityCalendar";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../../../firebase/config";

const DURATION_OPTIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hr", value: 60 },
  { label: "1.5 hr", value: 90 },
  { label: "2 hr", value: 120 },
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr, days) {
  const result = new Date(dateStr);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
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

export default function PTAvailabilityTab({ barber, profile, brandColor = "#C9A84C" }) {
  const ptId = barber?.uid || barber?.id;

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const [repeat, setRepeat] = useState("none");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const bookingLink = `${window.location.origin}/pt-book/${ptId}`;

  const fetchSlots = useCallback(async () => {
    if (!ptId) return;
    setLoading(true);
    setError("");
    try {
      const slotsRef = collection(db, "barbers", ptId, "ptSlots");
      const snap = await getDocs(query(slotsRef));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const today = todayStr();
      const expired = data.filter((s) => s.date < today);
      if (expired.length) {
        await Promise.all(
          expired.map((s) => deleteDoc(doc(db, "barbers", ptId, "ptSlots", s.id)))
        );
      }

      const fresh = data
        .filter((s) => s.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      setSlots(fresh);
    } catch (e) {
      setError("Failed to load slots. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [ptId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAddSlot = async () => {
    if (!date || !time) {
      setAddError("Please fill in date and time.");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      const slotsRef = collection(db, "barbers", ptId, "ptSlots");
      let iterations = 1;
      if (repeat === "week")  iterations = 7;
      if (repeat === "month") iterations = 30;
      await Promise.all(
        Array.from({ length: iterations }, (_, i) =>
          addDoc(slotsRef, {
            date: addDays(date, i),
            time,
            duration,
            status: "available",
            clientName: "",
            purpose: "",
            bookedAt: null,
            createdAt: serverTimestamp(),
          })
        )
      );
      await fetchSlots();
      setDate(todayStr());
      setTime("09:00");
      setDuration(60);
      setRepeat("none");
    } catch (e) {
      setAddError("Failed to add slot. Try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (slotId) => {
    if (deleteConfirm !== slotId) {
      setDeleteConfirm(slotId);
      return;
    }
    try {
      await deleteDoc(doc(db, "barbers", ptId, "ptSlots", slotId));
      setDeleteConfirm(null);
      await fetchSlots();
    } catch (e) {
      setError("Failed to delete slot.");
    }
  };

  const upcomingSlots = slots;
  const upcomingGrouped = groupByDate(upcomingSlots);

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", py: 2 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          PT Availability
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ContentCopyIcon />}
          onClick={handleCopy}
          sx={{ borderColor: brandColor, color: brandColor, "&:hover": { borderColor: brandColor, bgcolor: `${brandColor}11` } }}
        >
          {copied ? "Copied!" : "Copy booking link"}
        </Button>
      </Box>

      {/* Add slot form */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>
          Add Availability Slot
        </Typography>

        <Box sx={{ mb: 3 }}>
          <AvailabilityCalendar
            slots={slots}
            selectedDate={date}
            onSelect={setDate}
            brandColor={brandColor}
          />
        </Box>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}>
          <TextField
            label="Time"
            type="time"
            size="small"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 130 }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Duration</InputLabel>
            <Select
              value={duration}
              label="Duration"
              onChange={(e) => setDuration(e.target.value)}
            >
              {DURATION_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Repeat</InputLabel>
            <Select
              value={repeat}
              label="Repeat"
              onChange={(e) => setRepeat(e.target.value)}
            >
              <MenuItem value="none">No Repeat</MenuItem>
              <MenuItem value="week">Daily for 1 Week</MenuItem>
              <MenuItem value="month">Daily for 1 Month</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={handleAddSlot}
            disabled={adding}
            sx={{ bgcolor: brandColor, "&:hover": { bgcolor: brandColor, filter: "brightness(0.9)" }, color: "#fff", whiteSpace: "nowrap" }}
          >
            {adding ? <CircularProgress size={20} color="inherit" /> : "Add Slot"}
          </Button>
        </Box>
        {addError && <Alert severity="error" sx={{ mt: 1.5 }}>{addError}</Alert>}
      </Paper>

      {/* Slot list */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress sx={{ color: brandColor }} />
        </Box>
      ) : upcomingSlots.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderRadius: 2 }}>
          <Typography color="text.secondary">No upcoming slots. Add one above.</Typography>
        </Paper>
      ) : (
        Object.keys(upcomingGrouped)
          .sort()
          .map((dateKey) => (
            <Box key={dateKey} mb={3}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {formatDateHeading(dateKey)}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {upcomingGrouped[dateKey].map((slot) => (
                  <Paper
                    key={slot.id}
                    variant="outlined"
                    sx={{ p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Typography fontWeight={600}>{slot.time}</Typography>
                        <Typography variant="body2" color="text.secondary">{formatDuration(slot.duration)}</Typography>
                        <Chip
                          label={slot.status === "booked" ? "Booked" : "Available"}
                          size="small"
                          sx={{
                            bgcolor: slot.status === "booked" ? "#fff3e0" : "#e8f5e9",
                            color: slot.status === "booked" ? "#e65100" : "#2e7d32",
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                      {slot.status === "booked" && (
                        <Box mt={0.5}>
                          <Typography variant="body2"><strong>{slot.clientName}</strong>{slot.purpose ? ` — ${slot.purpose}` : ""}</Typography>
                        </Box>
                      )}
                    </Box>
                    <Box>
                      {deleteConfirm === slot.id ? (
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button size="small" color="error" variant="contained" onClick={() => handleDelete(slot.id)}>
                            Confirm
                          </Button>
                          <Button size="small" onClick={() => setDeleteConfirm(null)}>
                            Cancel
                          </Button>
                        </Box>
                      ) : (
                        <IconButton size="small" onClick={() => handleDelete(slot.id)} title="Delete slot">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          ))
      )}
    </Box>
  );
}
