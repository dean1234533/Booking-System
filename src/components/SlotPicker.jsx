import React from "react";

// src/components/SlotPicker.jsx
// Shows available time slots for a barber grouped by date.
// Client clicks a slot to proceed to /book/:slotId

import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Divider,
  Skeleton,
  Alert,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { formatDate, formatTime } from "../stripe/formatters.js";

// Group slots by date string for display
function groupByDate(slots) {
  return slots.reduce((acc, slot) => {
    const dateKey = formatDate(slot.date);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {});
}

export default function SlotPicker({ slots, loading, error }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Box>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={40} sx={{ mb: 1 }} />
        ))}
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load availability: {error}</Alert>;
  }

  if (!slots.length) {
    return (
      <Alert severity="info" icon={<CalendarTodayIcon />}>
        No available slots right now. Check back soon.
      </Alert>
    );
  }

  const grouped = groupByDate(slots);

  return (
    <Box>
      {Object.entries(grouped).map(([date, dateSlots]) => (
        <Box key={date} mb={3}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            color="text.secondary"
            textTransform="uppercase"
            letterSpacing="0.08em"
            mb={1.5}
          >
            {date}
          </Typography>

          <Box display="flex" flexWrap="wrap" gap={1}>
            {dateSlots.map((slot) => (
              <Button
                key={slot.id}
                variant="outlined"
                size="small"
                onClick={() => navigate(`/book/${slot.id}`)}
                sx={{
                  borderColor: "divider",
                  color: "text.primary",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  px: 2,
                  "&:hover": {
                    borderColor: "secondary.main",
                    backgroundColor: "rgba(201,168,76,0.08)",
                    color: "secondary.main",
                  },
                }}
              >
                {formatTime(slot.time)}
              </Button>
            ))}
          </Box>

          <Divider sx={{ mt: 2 }} />
        </Box>
      ))}
    </Box>
  );
}
