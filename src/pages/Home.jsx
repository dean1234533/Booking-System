import React from "react";

// src/pages/Home.jsx
// Shop homepage — public, no auth required.
// Shows a grid of all barbers. Clicking a card goes to /barber/:id

import { Box, Container, Typography, Grid, Skeleton, Alert } from "@mui/material";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import BarberCard from "../components/BarberCard";
import { useBarbers } from "../hooks/useBarbers.js";

export default function Home() {
  const { barbers, loading, error } = useBarbers();

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          backgroundColor: "primary.main",
          color: "white",
          py: { xs: 8, md: 12 },
          px: 2,
          textAlign: "center",
        }}
      >
        <Box display="flex" justifyContent="center" alignItems="center" gap={1.5} mb={2}>
          <ContentCutIcon sx={{ color: "secondary.main", fontSize: 32 }} />
          <Typography variant="overline" sx={{ color: "secondary.main", letterSpacing: "0.15em", fontSize: "0.85rem" }}>
            Book Your Barber
          </Typography>
        </Box>
        <Typography
          variant="h1"
          sx={{ fontSize: { xs: "2.4rem", md: "3.5rem" }, fontWeight: 700, mb: 2, letterSpacing: "-0.03em" }}
        >
          Find Your Barber
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: "rgba(255,255,255,0.65)", maxWidth: 480, mx: "auto", fontSize: "1.1rem", lineHeight: 1.7 }}
        >
          Browse our team, check availability and book a time that suits you. No account needed.
        </Typography>
      </Box>

      {/* Barber grid */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography variant="h4" fontWeight={700} mb={1}>
          Our Barbers
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={5}>
          Click on a barber to see their availability and book.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            Failed to load barbers: {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {loading
            ? [1, 2, 3].map((i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Skeleton variant="rounded" height={360} />
                </Grid>
              ))
            : barbers.map((barber) => (
                <Grid item xs={12} sm={6} md={4} key={barber.id}>
                  <BarberCard barber={barber} />
                </Grid>
              ))}

          {!loading && !error && barbers.length === 0 && (
            <Grid item xs={12}>
              <Alert severity="info">
                No barbers have set up their profiles yet. Check back soon.
              </Alert>
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
  );
}
