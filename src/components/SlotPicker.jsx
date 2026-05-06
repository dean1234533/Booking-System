import React from "react";
import { Link } from "react-router-dom";
import { Grid, Button, Typography, CircularProgress, Box, Paper } from "@mui/material";

// ADDED: barberId as a prop
export default function SlotPicker({ slots, loading, error, barberId }) {
  if (loading) {
    return <Box display="flex" justifyContent="center" py={4}><CircularProgress color="secondary" /></Box>;
  }

  if (error) {
    return <Typography color="error" textAlign="center">{error}</Typography>;
  }

  if (!slots || slots.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: "center", bgcolor: "grey.50" }}>
        <Typography color="text.secondary">No available slots at the moment.</Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={2}>
      {slots.map((slot) => (
        <Grid item key={slot.id} xs={6} sm={4}>
          <Button
            variant="outlined" 
            fullWidth
            // UPDATED: Link now includes the barberId so the booking form can find the slot
            component={Link} 
            to={`/book/${barberId}/${slot.id}`}
            sx={{ 
              py: 2, fontWeight: 700, borderRadius: 2, borderWidth: 2, textTransform: "none", fontSize: "1rem",
              "&:hover": { borderWidth: 2, bgcolor: "secondary.main", color: "white", borderColor: "secondary.main" },
            }}
          >
            {slot.time}
          </Button>
        </Grid>
      ))}
    </Grid>
  );
}