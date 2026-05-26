import React, { useState, useMemo } from "react";
import { 
  Grid, Button, Typography, CircularProgress, Box, 
  Paper, Divider, Stack 
} from "@mui/material";
import { CalendarMonth as CalendarIcon } from "@mui/icons-material";

export default function SlotPicker({ 
  slots, 
  loading, 
  error, 
  brandColor, 
  onSelect // New prop to handle click actions
}) {
  const activeColor = brandColor || "#C9A84C";
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const availableSlots = useMemo(() => {
    return (slots || []).filter(slot => !slot.status || slot.status.toLowerCase() === "open");
  }, [slots]);

  const groupedSlots = useMemo(() => {
    return availableSlots.reduce((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {});
  }, [availableSlots]);

  const uniqueDates = useMemo(() => {
    return Object.keys(groupedSlots).sort((a, b) => new Date(a) - new Date(b));
  }, [groupedSlots]);

  if (loading) return <Box display="flex" justifyContent="center" py={4}><CircularProgress sx={{ color: activeColor }} /></Box>;
  if (error) return <Typography color="error" textAlign="center">{error}</Typography>;

  if (availableSlots.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: "center", bgcolor: "grey.50", borderRadius: 3 }}>
        <Typography color="text.secondary" fontWeight={600}>No available slots found.</Typography>
      </Paper>
    );
  }

  const slotsForSelectedDate = groupedSlots[selectedDate] || [];

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return {
      dayName: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      dayNum: d.getDate(),
      month: d.toLocaleDateString('en-GB', { month: 'short' })
    };
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <CalendarIcon sx={{ color: activeColor }} />
          <Typography variant="h6" fontWeight={800}>Select a Date</Typography>
        </Stack>
        
        <Box sx={{ display: 'flex', overflowX: 'auto', pb: 2, gap: 1.5, scrollSnapType: 'x mandatory' }}>
          {uniqueDates.map((dateStr) => {
            const isSelected = selectedDate === dateStr;
            const meta = formatDate(dateStr);
            return (
              <Button key={dateStr} onClick={() => setSelectedDate(dateStr)} sx={{
                minWidth: 70, height: 90, display: 'flex', flexDirection: 'column',
                borderRadius: 3, border: '2px solid', borderColor: isSelected ? activeColor : '#eee',
                bgcolor: isSelected ? activeColor : 'white', color: isSelected ? 'white' : 'text.primary',
                '&:hover': { borderColor: activeColor, bgcolor: isSelected ? activeColor : `${activeColor}10` }
              }}>
                <Typography variant="caption" sx={{ opacity: isSelected ? 0.9 : 0.6, fontWeight: 700 }}>{meta.dayName}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, my: -0.5 }}>{meta.dayNum}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>{meta.month}</Typography>
              </Button>
            );
          })}
        </Box>
      </Box>

      <Divider sx={{ mb: 4 }} />

      <Box>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
          Available Times for {new Date(selectedDate).toLocaleDateString('en-GB', { dateStyle: 'full' })}
        </Typography>

        {slotsForSelectedDate.length > 0 ? (
          <Grid container spacing={2}>
            {slotsForSelectedDate.map((slot) => (
              <Grid item key={slot.id} xs={6} sm={4}>
                <Button
                  variant="outlined" fullWidth
                  onClick={() => onSelect(slot)} // Uses the passed function
                  sx={{ 
                    py: 2, fontWeight: 700, borderRadius: 2, borderWidth: 2, textTransform: "none", fontSize: "1rem",
                    borderColor: "divider", color: "text.primary", transition: "all 0.2s ease",
                    "&:hover": { bgcolor: activeColor, color: "white", borderColor: activeColor }
                  }}
                >
                  {slot.time}
                </Button>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: '#fafafa' }}>
            <Typography color="text.secondary">Please select a date from the list above.</Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
}