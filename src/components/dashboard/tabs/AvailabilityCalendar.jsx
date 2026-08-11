import React, { useState } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";

// Month calendar with slot indicators — lets the user SEE which days have
// slots (gold dot = open availability, amber dot = has a booking) and jump
// to one, instead of a native date input.
// Works for both the `slots` collection (isBooked / status:"open") and the
// PT `ptSlots` subcollection (status:"booked" / status:"available").
export default function AvailabilityCalendar({ slots, selectedDate, onSelect, brandColor }) {
  const parseLocal = (d) => new Date(d + "T00:00:00");
  const initial = selectedDate ? parseLocal(selectedDate) : new Date();
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

  const dayMap = {};
  slots.forEach((s) => {
    if (!s.date) return;
    if (!dayMap[s.date]) dayMap[s.date] = { count: 0, booked: false, open: false };
    dayMap[s.date].count += 1;
    if (s.isBooked || s.status === "booked") dayMap[s.date].booked = true;
    else if (s.status === "open" || s.status === "available") dayMap[s.date].open = true;
  });

  const first = new Date(view.year, view.month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);
  const fmt = (d) => `${view.year}-${String(view.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const monthLabel = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const prev = () => setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const next = () => setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Typography fontWeight={800} sx={{ fontSize: "1.05rem" }}>{monthLabel}</Typography>
        <Box>
          <IconButton size="small" onClick={prev}><ChevronLeftIcon /></IconButton>
          <IconButton size="small" onClick={next}><ChevronRightIcon /></IconButton>
        </Box>
      </Box>

      {/* Weekday row */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: 0.5 }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
          <Typography key={w} sx={{ textAlign: "center", fontSize: "0.68rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.03em" }}>
            {w}
          </Typography>
        ))}
      </Box>

      {/* Day grid */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
        {cells.map((d, i) => {
          if (d === null) return <Box key={`e${i}`} />;
          const ds = fmt(d);
          const info = dayMap[ds];
          const isSelected = ds === selectedDate;
          const isToday = ds === todayStr;
          const isPast = ds < todayStr;
          const dotColor = info ? (info.booked ? "#e0a800" : brandColor) : null;
          return (
            <Box
              key={ds}
              onClick={() => onSelect(ds)}
              sx={{
                display: "flex", alignItems: "center", justifyContent: "center",
                py: 0.75, cursor: "pointer",
              }}
            >
              <Box sx={{
                width: 40, height: 40, borderRadius: "50%",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                position: "relative",
                bgcolor: isSelected ? brandColor : "transparent",
                color: isSelected ? "#111" : isPast ? "rgba(0,0,0,0.3)" : "#1a1a1a",
                fontWeight: isSelected || isToday ? 800 : 500,
                border: isToday && !isSelected ? `1.5px solid ${brandColor}` : "1.5px solid transparent",
                transition: "background-color .12s",
                "&:hover": { bgcolor: isSelected ? brandColor : `${brandColor}22` },
              }}>
                <Typography sx={{ fontSize: "0.9rem", fontWeight: "inherit", lineHeight: 1 }}>{d}</Typography>
                {dotColor && (
                  <Box sx={{
                    width: 5, height: 5, borderRadius: "50%",
                    position: "absolute", bottom: 5,
                    bgcolor: isSelected ? "#111" : dotColor,
                  }} />
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Legend */}
      <Box sx={{ display: "flex", gap: 2, mt: 1.5, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: brandColor }} />
          <Typography variant="caption" color="text.secondary">Open slots</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#e0a800" }} />
          <Typography variant="caption" color="text.secondary">Has a booking</Typography>
        </Box>
      </Box>
    </Box>
  );
}
