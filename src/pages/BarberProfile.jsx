import React from "react";

// src/pages/BarberProfile.jsx
// Public page — shows a barber's full profile + available slots.
// Reached via /barber/:id

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Container, Grid, Typography, Avatar,
  Chip, Divider, Skeleton, Alert, Paper,
} from "@mui/material";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import PhoneIcon      from "@mui/icons-material/Phone";
import SlotPicker     from "../components/SlotPicker";
import { getBarber }  from "../firebase/firestore";
import { useSlots }   from "../hooks/useSlots.js";
import { formatCurrency } from "../stripe/formatters.js";

export default function BarberProfile() {
  const { id } = useParams();

  const [barber,  setBarber]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const { slots, loading: slotsLoading, error: slotsError } = useSlots(id);

  useEffect(() => {
    async function fetch() {
      try {
        const data = await getBarber(id);
        if (!data) setError("Barber not found.");
        else setBarber(data);
      } catch (err) {
        setError("Failed to load barber profile.");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [id]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Skeleton variant="circular" width={120} height={120} sx={{ mb: 2 }} />
        <Skeleton width="40%" height={40} sx={{ mb: 1 }} />
        <Skeleton width="60%" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Grid container spacing={5}>

        {/* Left — profile info */}
        <Grid item xs={12} md={4}>
          <Box textAlign={{ xs: "center", md: "left" }}>
            {barber.photoURL ? (
              <Box
                component="img"
                src={barber.photoURL}
                alt={barber.name}
                sx={{
                  width: 140, height: 140,
                  borderRadius: "50%",
                  objectFit: "cover",
                  mb: 2,
                  border: "3px solid",
                  borderColor: "secondary.main",
                }}
              />
            ) : (
              <Avatar
                sx={{
                  width: 140, height: 140,
                  bgcolor: "primary.main",
                  fontSize: 48,
                  mb: 2,
                  mx: { xs: "auto", md: 0 },
                  border: "3px solid",
                  borderColor: "secondary.main",
                }}
              >
                {barber.name?.[0]?.toUpperCase()}
              </Avatar>
            )}

            <Typography variant="h4" fontWeight={700} gutterBottom>
              {barber.name}
            </Typography>

            {barber.specialty && (
              <Chip
                icon={<ContentCutIcon fontSize="small" />}
                label={barber.specialty}
                sx={{
                  mb: 2,
                  bgcolor: "secondary.main",
                  color: "secondary.contrastText",
                  fontWeight: 600,
                }}
              />
            )}

            {barber.phone && (
              <Box display="flex" alignItems="center" justifyContent={{ xs: "center", md: "flex-start" }} gap={1} mb={1}>
                <PhoneIcon fontSize="small" sx={{ color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">{barber.phone}</Typography>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
              {barber.bio}
            </Typography>

            <Paper
              variant="outlined"
              sx={{ mt: 3, p: 2, borderRadius: 2, borderColor: "divider" }}
            >
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Deposit to book
              </Typography>
              <Typography variant="h6" fontWeight={700} color="secondary.main">
                {formatCurrency(barber.depositAmount ?? 10)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Remaining paid after your appointment
              </Typography>
            </Paper>
          </Box>
        </Grid>

        {/* Right — availability */}
        <Grid item xs={12} md={8}>
          <Typography variant="h5" fontWeight={700} mb={0.5}>
            Available Times
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Pick a slot below to start your booking. No account needed.
          </Typography>

          <SlotPicker slots={slots} loading={slotsLoading} error={slotsError} />
        </Grid>

      </Grid>
    </Container>
  );
}
