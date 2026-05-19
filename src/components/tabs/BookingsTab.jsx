import React from "react";
import {
  Box, Paper, Typography, Grid, Alert, Chip, Divider, Stack, Button
} from "@mui/material";
import {
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";

export default function BookingsTab({
  bookings, isMobile, brandColor, handleCompleteBooking, handleCancelBooking
}) {
  if (bookings.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
        <Typography variant="h6">No current bookings</Typography>
      </Paper>
    );
  }

  // Group by date
  const bookingsByDay = bookings
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .reduce((groups, booking) => {
      const day = booking.date || "Unknown Date";
      if (!groups[day]) groups[day] = [];
      groups[day].push(booking);
      return groups;
    }, {});

  return (
    <>
      {Object.entries(bookingsByDay).map(([date, dayBookings]) => (
        <Box key={date} sx={{ mb: 4 }}>
          {/* Day header */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <CalendarIcon fontSize="small" sx={{ color: brandColor }} />
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: brandColor }}>
              {new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
                weekday: "long", day: "numeric", month: "long", year: "numeric"
              })}
            </Typography>
            <Chip size="small"
              label={`${dayBookings.length} booking${dayBookings.length > 1 ? "s" : ""}`}
              sx={{ height: 20, fontSize: 10 }} />
          </Box>

          {dayBookings.map(b => (
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
                      ["🪪 Ref",     b.id?.slice(-8).toUpperCase()],
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
                    <Box sx={{ mt: 1, p: 1.5, bgcolor: "#f8f9fa", borderRadius: 1 }}>
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
      ))}
    </>
  );
}