import React, { useState } from "react";
import {
  Box, Paper, Typography, Grid, Alert, Chip, Divider, Stack, Button, TextField
} from "@mui/material";
import {
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";

export default function BookingsTab({
  bookings = [], isMobile, brandColor, handleCompleteBooking, handleCancelBooking
}) {
  // Default to today's date
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Helper to extract "YYYY-MM" from a date string
  const getYearMonth = (dateStr) => {
    if (!dateStr) return "";
    return dateStr.substring(0, 7); // Extracts "YYYY-MM" from "YYYY-MM-DD"
  };

  const targetMonth = getYearMonth(selectedDate);

  // All unique dates that have bookings — for showing count chips
  const allDates = [...new Set(bookings.map(b => b.date).filter(Boolean))].sort();

  // Filter bookings to the selected MONTH only, sorted by full date then time
  const filtered = bookings
    .filter(b => getYearMonth(b.date) === targetMonth)
    .sort((a, b) => {
      const dateCompare = a.date?.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time?.localeCompare(b.time);
    });

  return (
    <>
      {/* ── Date picker row ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField
          type="date"
          size="small"
          label="Select Date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{
            minWidth: 180,
            "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: brandColor },
            "& .MuiInputLabel-root.Mui-focused": { color: brandColor },
          }}
        />

        {/* Quick-jump chips for dates that have bookings */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {allDates.map(date => {
            const count = bookings.filter(b => b.date === date).length;
            const isSelected = date === selectedDate;
            return (
              <Chip
                key={date}
                size="small"
                label={`${new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
                  day: "numeric", month: "short"
                })} (${count})`}
                onClick={() => setSelectedDate(date)}
                sx={{
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: "pointer",
                  bgcolor: isSelected ? brandColor : "transparent",
                  color: isSelected ? "#fff" : brandColor,
                  border: `1px solid ${brandColor}`,
                  "&:hover": { bgcolor: brandColor, color: "#fff" },
                }}
              />
            );
          })}
        </Box>
      </Box>

      {/* ── No bookings on selected month ── */}
      {filtered.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <CalendarIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            No bookings in{" "}
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", {
              month: "long", year: "numeric"
            })}
          </Typography>
          <Typography variant="body2" color="text.disabled" mt={0.5}>
            Use the date picker above or tap a chip to jump to a month with bookings.
          </Typography>
        </Paper>
      )}

      {/* ── Bookings for selected month ── */}
      {filtered.length > 0 && (
        <Box>
          {/* Month header */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <CalendarIcon fontSize="small" sx={{ color: brandColor }} />
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: brandColor }}>
              Bookings for{" "}
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", {
                month: "long", year: "numeric"
              })}
            </Typography>
            <Chip
              size="small"
              label={`${filtered.length} total slot${filtered.length > 1 ? "s" : ""}`}
              sx={{ height: 20, fontSize: 10 }}
            />
          </Box>

          {filtered.map(b => (
            <Paper key={b.id} sx={{ p: 2.5, mb: 2, borderRadius: 3, borderLeft: `5px solid ${brandColor}` }}>
              <Grid container alignItems="flex-start" spacing={1}>
                {/* Header row */}
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography fontWeight={800} variant="subtitle1">
                        {b.customerName || b.name || "Client"}
                      </Typography>
                      {b.source === "manual" && (
                        <Chip size="small" label="📞 Phone booking"
                          sx={{ height: 20, fontSize: 10, bgcolor: `${brandColor}20`, color: brandColor, fontWeight: 700 }} />
                      )}
                    </Box>
                    <Chip size="small" label={`${b.date} @ ${b.time}`}
                      sx={{ bgcolor: brandColor, color: "white", fontWeight: 700, fontSize: 11 }} />
                  </Box>
                </Grid>

                {/* Detail rows */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Grid container spacing={1}>
                    {[
                      ["📧 Email",   b.email    || b.customerEmail],
                      ["📱 Phone",   b.phone    || b.customerPhone],
                      ["✂️ Service", b.serviceName || b.haircutStyle],
                      ["👤 Gender",  b.gender],
                      ["💰 Deposit", b.depositAmount ? `£${Number(b.depositAmount).toFixed(2)}` : null],
                      ["🪪 Ref",      b.id?.slice(-8).toUpperCase()],
                    ].filter(([, val]) => val).map(([label, value]) => (
                      <Grid item xs={12} sm={6} key={label}>
                        <Box display="flex" gap={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ minWidth: 80 }}>
                            {label}
                          </Typography>
                          <Typography variant="caption" fontWeight={800}>{value}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>

                {/* Notes */}
                {(b.notes || b.additionalInfo) && (
                  <Grid item xs={12}>
                    <Box sx={{ mt: 1, p: 1.5, bgcolor: "rgba(255,255,255,0.04)", borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>📝 Notes</Typography>
                      <Typography variant="caption" display="block">{b.notes || b.additionalInfo}</Typography>
                    </Box>
                  </Grid>
                )}

                {/* Actions */}
                <Grid item xs={12} sx={{ mt: 1 }}>
                  <Stack direction="row" spacing={1} justifyContent={isMobile ? "flex-start" : "flex-end"}>
                    <Button variant="outlined" color="error" size="small"
                      startIcon={<CancelIcon />} onClick={() => handleCancelBooking(b)}>
                      Cancel
                    </Button>
                    <Button variant="contained" color="success" size="small"
                      startIcon={<CheckCircleIcon />} onClick={() => handleCompleteBooking(b)}>
                      Complete
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Box>
      )}
    </>
  );
}