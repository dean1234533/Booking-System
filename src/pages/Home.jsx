// src/pages/Home.jsx
// Shop homepage — public, no auth required.
// Shows a grid of all barbers. Clicking a card goes to /barber/:id.
// Cards are capped to fill exactly one grid row for the current breakpoint
// (1 on mobile, 2 on tablet, 3 on desktop). Surplus cards live behind a
// "View All" button so there are never empty gap slots on any device.

import { useState } from "react";
import {
  Box, Container, Typography, Grid, Skeleton, Alert,
  Button, Chip, Collapse, useMediaQuery, useTheme,
} from "@mui/material";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import BarberCard from "../components/BarberCard";
import { useBarbers } from "../hooks/useBarbers";

export default function Home() {
  const { barbers, loading, error } = useBarbers();
  const [showAll, setShowAll] = useState(false);

  // Detect breakpoint — mirrors the xs/sm/md Grid column widths used below
  const theme     = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md")); // ≥900 px → 3 cols
  const isTablet  = useMediaQuery(theme.breakpoints.up("sm")); // ≥600 px → 2 cols
  const cap       = isDesktop ? 3 : isTablet ? 2 : 1;

  const visibleBarbers = showAll ? barbers : barbers.slice(0, cap);
  const extraBarbers   = barbers.slice(cap);
  const hiddenCount    = barbers.length - cap;

  return (
    <Box>
      {/* ── Hero ── */}
      <Box
        sx={{
          backgroundColor: "primary.main",
          color: "white",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          px: 2,
          textAlign: "center",
        }}
      >
        <Box display="flex" justifyContent="center" alignItems="center" gap={1.5} mb={2}>
          <ContentCutIcon sx={{ color: "secondary.main", fontSize: 32 }} />
          <Typography
            variant="overline"
            sx={{ color: "secondary.main", letterSpacing: "0.15em", fontSize: "0.85rem" }}
          >
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

      {/* ── Barber grid ── */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>

        {/* Section header + total count badge */}
        <Box
          display="flex"
          alignItems="baseline"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1}
          mb={1}
        >
          <Typography variant="h4" fontWeight={700}>
            Our Barbers
          </Typography>

          {!loading && barbers.length > 0 && (
            <Chip
              label={`${barbers.length} barber${barbers.length !== 1 ? "s" : ""}`}
              size="small"
              sx={{
                bgcolor: "secondary.main",
                color: "secondary.contrastText",
                fontWeight: 700,
                fontSize: "0.72rem",
                letterSpacing: "0.04em",
              }}
            />
          )}
        </Box>

        <Typography variant="body1" color="text.secondary" mb={5}>
          Click on a barber to see their availability and book.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            Failed to load barbers: {error}
          </Alert>
        )}

        {/* Primary row — capped to exactly one full row */}
        <Grid container spacing={3}>
          {loading
            ? Array.from({ length: cap }).map((_, i) => (
                <Grid item xs={12} sm={6} md={4} key={`skel-${i}`}>
                  <Skeleton variant="rounded" height={360} />
                </Grid>
              ))
            : visibleBarbers.map((barber) => (
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

        {/* Extra cards — animate in when "View All" is clicked */}
        {!loading && extraBarbers.length > 0 && (
          <Collapse in={showAll} timeout={320}>
            <Grid container spacing={3} sx={{ mt: 0 }}>
              {extraBarbers.map((barber) => (
                <Grid item xs={12} sm={6} md={4} key={`extra-${barber.id}`}>
                  <BarberCard barber={barber} />
                </Grid>
              ))}
            </Grid>
          </Collapse>
        )}

        {/* View All / Show Less button — only when there are hidden cards */}
        {!loading && hiddenCount > 0 && (
          <Box display="flex" justifyContent="center" mt={5}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => setShowAll((prev) => !prev)}
              endIcon={
                <KeyboardArrowDownIcon
                  sx={{
                    transition: "transform 0.3s ease",
                    transform: showAll ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              }
              sx={{
                borderColor: "primary.main",
                color: "primary.main",
                fontWeight: 700,
                letterSpacing: "0.04em",
                px: 4,
                py: 1.2,
                borderRadius: 2,
                "&:hover": {
                  bgcolor: "primary.main",
                  color: "white",
                  borderColor: "primary.main",
                },
                transition: "all 0.2s ease",
              }}
            >
              {showAll ? "Show Less" : `View All ${barbers.length} Barbers`}
            </Button>
          </Box>
        )}

      </Container>
    </Box>
  );
}
