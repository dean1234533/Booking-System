import React from "react";
import {
  Box, Paper, Typography, Grid, TextField, Button, FormControl,
  InputLabel, Select, MenuItem, Chip, Stack, IconButton
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon,
  Delete as DeleteIcon,
  Replay as ReplayIcon,
  PersonAdd as PersonAddIcon,
  CalendarMonth as CalendarIcon,
} from "@mui/icons-material";

// ── Helpers ───────────────────────────────────────────────────────────────────

const timeToMinutes = (t) => {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return h * 60 + m;
};

const groupConsecutiveSlots = (slots) => {
  if (!slots.length) return [];
  const sorted = [...slots].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  const blocks = [];
  let current = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const gap = timeToMinutes(sorted[i].time) - timeToMinutes(sorted[i - 1].time);
    if (gap <= 30) { current.push(sorted[i]); }
    else { blocks.push(current); current = [sorted[i]]; }
  }
  blocks.push(current);
  return blocks;
};

const reminderTime = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  const r = new Date(0, 0, 0, h, m - 60);
  return `${String(r.getHours()).padStart(2, "0")}:${String(r.getMinutes()).padStart(2, "0")}`;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ScheduleTab({
  slots, newSlot, setNewSlot,
  handleAddSlot, handleDeleteSlot, handleRestoreSlot, openManualBooking,
  brandColor,
}) {
  const filteredSlots    = slots.filter(s => s.date === newSlot.date).sort((a, b) => a.time.localeCompare(b.time));
  const openSlotsForDate = filteredSlots.filter(s => !s.isBooked && s.status === "open");
  const reminderBlocks   = groupConsecutiveSlots(openSlotsForDate);

  return (
    <>
      {/* ── Add Slot Form ── */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={800} mb={2}>Manage Availability</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth type="date" label="Select Date" value={newSlot.date}
              onChange={e => setNewSlot(prev => ({ ...prev, date: e.target.value }))}
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth type="time" label="Time" value={newSlot.time}
              onChange={e => setNewSlot(prev => ({ ...prev, time: e.target.value }))}
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Repeat</InputLabel>
              <Select value={newSlot.repeat} label="Repeat"
                onChange={e => setNewSlot(prev => ({ ...prev, repeat: e.target.value }))}>
                <MenuItem value="none">No Repeat</MenuItem>
                <MenuItem value="week">Daily for 1 Week</MenuItem>
                <MenuItem value="month">Daily for 1 Month</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button fullWidth variant="contained" onClick={handleAddSlot}
              disabled={!newSlot.date || !newSlot.time}
              sx={{ bgcolor: "#1A1A1A", height: "56px" }}>
              Add Slot
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Reminder Preview ── */}
      {reminderBlocks.length > 0 && (
        <Paper sx={{ p: 2.5, borderRadius: 3, mb: 3, border: `1px dashed ${brandColor}`, bgcolor: `${brandColor}08` }}>
          <Typography variant="subtitle2" fontWeight={800} mb={1.5} sx={{ color: brandColor }}>
            🔔 Reminder Preview for {newSlot.date}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
            You'll receive one reminder per block of consecutive slots, 1 hour before the first slot in each block.
          </Typography>
          <Stack spacing={1}>
            {reminderBlocks.map((block, idx) => (
              <Box key={idx} sx={{ px: 2, py: 1, borderRadius: 2, bgcolor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: 2 }}>
                <AccessTimeIcon fontSize="small" sx={{ color: brandColor }} />
                <Typography variant="body2" fontWeight={700}>
                  {block.length === 1 ? (
                    <>Single slot at <strong>{block[0].time}</strong> — reminder at {reminderTime(block[0].time)}</>
                  ) : (
                    <>Block of <strong>{block.length} slots</strong>: {block[0].time} → {block[block.length - 1].time} — reminder at {reminderTime(block[0].time)}</>
                  )}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* ── Slots for selected date ── */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <CalendarIcon fontSize="small" color="action" />
        <Typography variant="subtitle1" fontWeight={700}>
          Slots for {newSlot.date || "Selected Date"}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {filteredSlots.length === 0 ? (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2, borderStyle: "dashed" }}>
              <Typography color="text.secondary">No slots created for this date yet.</Typography>
            </Paper>
          </Grid>
        ) : filteredSlots.map(s => {
          const isBooked = s.isBooked || s.status === "booked";
          const isDone   = s.status === "completed";
          const isManual = !!s.manualBookingId;
          return (
            <Grid item xs={12} sm={6} md={4} key={s.id}>
              <Paper variant="outlined" sx={{
                p: 2, borderRadius: 2, display: "flex", justifyContent: "space-between",
                alignItems: "center",
                bgcolor:      isDone ? "rgba(255,255,255,0.05)" : isBooked ? "rgba(224,168,0,0.12)" : "rgba(255,255,255,0.03)",
                borderColor:  isManual ? brandColor : undefined,
                borderWidth:  isManual ? 2 : 1,
              }}>
                <Box>
                  <Typography variant="body2" fontWeight={700}>{s.time}</Typography>
                  <Stack direction="row" spacing={0.5} mt={0.5}>
                    <Chip size="small" label={isDone ? "Done" : isBooked ? "Booked" : "Open"}
                      color={isDone ? "default" : isBooked ? "warning" : "success"}
                      sx={{ height: 20, fontSize: 10 }} />
                    {isManual && (
                      <Chip size="small" label="Manual"
                        sx={{ height: 20, fontSize: 10, bgcolor: brandColor, color: "white" }} />
                    )}
                  </Stack>
                </Box>
                <Box display="flex" gap={0.5}>
                  {!isBooked && !isDone && (
                    <IconButton size="small" title="Book manually"
                      onClick={() => openManualBooking(s)} sx={{ color: brandColor }}>
                      <PersonAddIcon fontSize="small" />
                    </IconButton>
                  )}
                  {(isBooked || isDone) && (
                    <IconButton size="small" color="primary" onClick={() => handleRestoreSlot(s.id)}>
                      <ReplayIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton size="small" color="error" onClick={() => handleDeleteSlot(s.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </>
  );
}