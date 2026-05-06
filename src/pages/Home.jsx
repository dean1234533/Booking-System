import React from "react";
import {
  Box, Container, Typography, Grid, Skeleton, Alert,
  Paper, Button, Divider,
} from "@mui/material";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import StarIcon       from "@mui/icons-material/Star";
import BarberCard     from "../components/BarberCard";
import { useBarbers } from "../hooks/useBarbers";

// ── Free Unsplash images ──
const HERO_IMAGE  = "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=2070&q=80";
const ABOUT_IMAGE = "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=2070&q=80";

const REVIEWS = [
  { text: "Best fade in London!", author: "Marcus J." },
  { text: "Dean is incredible, always on time.", author: "Sarah K." },
  { text: "Wouldn't go anywhere else. Absolute class.", author: "Jordan T." },
];

const HOURS = [
  { day: "Mon – Fri",  hours: "9:00 AM – 7:00 PM" },
  { day: "Saturday",   hours: "9:00 AM – 6:00 PM" },
  { day: "Sunday",     hours: "Closed" },
];

export default function Home() {
  const { barbers, loading, error } = useBarbers();

  return (
    <Box sx={{ width: "100%", overflowX: "hidden" }}>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          width: "100%",
          minHeight: { xs: "75vh", md: "80vh" },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          // LIGHTENED: Changed alpha from 0.68 to 0.45
          background: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('${HERO_IMAGE}')`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          color: "white",
          textAlign: "center",
          px: 2,
        }}
      >
        <Box display="flex" justifyContent="center" alignItems="center" gap={1.5} mb={2}>
          <ContentCutIcon sx={{ color: "secondary.main", fontSize: 34 }} />
          <Typography variant="overline" sx={{ color: "secondary.main", letterSpacing: "0.3em", fontWeight: 900 }}>
            The Cutting Edge
          </Typography>
        </Box>
        <Typography
          variant="h1"
          sx={{ fontSize: { xs: "3rem", md: "5rem" }, fontWeight: 900, mb: 3, textTransform: "uppercase", letterSpacing: "-0.02em" }}
        >
          Find Your Barber
        </Typography>
        <Typography
          variant="body1"
          sx={{ maxWidth: 600, mx: "auto", fontSize: "1.15rem", lineHeight: 1.8, color: "rgba(255,255,255,0.82)" }}
        >
          Experience world-class grooming. Browse our elite team and secure your chair in seconds.
        </Typography>
      </Box>

      {/* ── REVIEWS ───────────────────────────────────────────────── */}
      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={5}>
            <Box display="flex" justifyContent="center" gap={0.5} mb={1}>
              {[1, 2, 3, 4, 5].map((i) => (
                <StarIcon key={i} sx={{ color: "secondary.main", fontSize: 28 }} />
              ))}
            </Box>
            <Typography variant="h5" fontWeight={800}>4.9 / 5</Typography>
            <Typography variant="body2" color="text.secondary">Based on 127 reviews</Typography>
          </Box>

          <Grid container spacing={3}>
            {REVIEWS.map((r, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Paper
                  variant="outlined"
                  sx={{ p: 3.5, borderRadius: 2, height: "100%", borderLeft: "4px solid", borderColor: "secondary.main" }}
                >
                  <Box display="flex" mb={1.5}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <StarIcon key={s} sx={{ fontSize: 16, color: "secondary.main" }} />
                    ))}
                  </Box>
                  <Typography variant="body1" fontStyle="italic" mb={2}>&ldquo;{r.text}&rdquo;</Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary">— {r.author}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── LOCATION + HOURS ──────────────────────────────────────── */}
      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, height: "100%" }}>
                <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                  <LocationOnIcon sx={{ color: "secondary.main", fontSize: 28 }} />
                  <Typography variant="h6" fontWeight={700}>Find Us</Typography>
                </Box>
                <Typography variant="body1" color="text.secondary">123 High Street</Typography>
                <Typography variant="body1" color="text.secondary" mb={3}>London, SW1 1AA</Typography>
                <Button
                  variant="contained"
                  href="https://maps.google.com/?q=123+High+Street+London"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Directions
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, height: "100%" }}>
                <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                  <AccessTimeIcon sx={{ color: "secondary.main", fontSize: 28 }} />
                  <Typography variant="h6" fontWeight={700}>Opening Hours</Typography>
                </Box>
                {HOURS.map((h, i) => (
                  <Box key={i}>
                    <Box display="flex" justifyContent="space-between" py={1}>
                      <Typography variant="body2" fontWeight={600}>{h.day}</Typography>
                      <Typography variant="body2" color={h.hours === "Closed" ? "error.main" : "text.secondary"}>
                        {h.hours}
                      </Typography>
                    </Box>
                    {i < HOURS.length - 1 && <Divider />}
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── ABOUT ────────────────────────────────────────────────── */}
      <Box
        sx={{
          width: "100%",
          minHeight: { xs: "420px", md: "520px" },
          display: "flex",
          alignItems: "center",
          // LIGHTENED: Changed alpha from 0.78 to 0.55
          background: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('${ABOUT_IMAGE}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          color: "white",
          py: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <ContentCutIcon sx={{ color: "secondary.main", fontSize: 48, mb: 3 }} />
          <Typography variant="h3" sx={{ fontWeight: 900, mb: 3, letterSpacing: "-0.02em", fontSize: { xs: "2rem", md: "3rem" } }}>
            About The Cutting Edge
          </Typography>
          <Typography variant="body1" sx={{ fontSize: "1.15rem", lineHeight: 1.9, color: "rgba(255,255,255,0.82)", maxWidth: 640, mx: "auto" }}>
            Established in 2015, we bring traditional craftsmanship to modern style.
            Our shop is more than just a place for a haircut — it&apos;s a sanctuary for
            the modern gentleman who values precision, community, and the art of the blade.
          </Typography>
        </Container>
      </Box>

      {/* ── OUR BARBERS ───────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box mb={5}>
          <Typography variant="h4" fontWeight={700} mb={1}>Our Barbers</Typography>
          <Typography variant="body1" color="text.secondary">
            Click on a barber to see their availability and book.
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

        <Grid container spacing={3}>
          {loading
            ? [1, 2, 3].map((i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Skeleton variant="rounded" height={380} />
                </Grid>
              ))
            : barbers.map((barber) => (
                <Grid item xs={12} sm={6} md={4} key={barber.id}>
                  <BarberCard barber={barber} />
                </Grid>
              ))}
        </Grid>
      </Container>
    </Box>
  );
}