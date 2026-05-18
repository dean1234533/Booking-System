import React, { useEffect } from "react";
import {
  Box, Container, Typography, Grid,
  Skeleton, Paper, Rating,
} from "@mui/material";
import StarIcon   from "@mui/icons-material/Star";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import BarberCard from "../components/BarberCard";
import TenantHome from "./TenantHome";
import { useBarbers } from "../hooks/useBarbers";

const HERO_IMAGE  = "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=2070&q=80";

const REVIEWS = [
  { name: "Marcus J.",  text: "Best fade in London! Found my new regular via Book-eh-Trim." },
  { name: "Sarah K.",  text: "The shop quality on this platform is top-tier. Highly recommend." },
  { name: "Jordan T.", text: "Easy booking, elite barbers. Book-eh-Trim is a game changer." },
];

export default function Home({ tenant }) {
  const { barbers, loading } = useBarbers(!tenant);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tenant]);

  if (tenant) {
    return <TenantHome tenant={tenant} />;
  }

  const featuredShops = barbers.filter(b => b.role === 'owner' || !b.role);

  return (
    <Box sx={{ width: "100%", overflowX: "hidden", bgcolor: "#FFFFFF" }}>

      {/* ── 1. HERO ──────────────────────────────────────────────────── */}
      <Box sx={{
        width: "100%",
        height: "100vh", // Back to full viewport height
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        backgroundColor: "#111", 
        backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url("${HERO_IMAGE}")`,
        backgroundSize: "cover",
        backgroundPosition: "top",
        color: "white",
        px: 2,
        /* 
           THE FIX: Instead of padding the whole page, we pad the Hero.
           This allows the background image to go behind the transparent/blur nav,
           but keeps the text from being covered.
        */
        pt: { xs: "80px", md: "100px" } 
      }}>
        <Typography
          variant="overline"
          sx={{ color: "#C9A84C", fontWeight: 700, letterSpacing: "0.35em", mb: 2, fontSize: "0.75rem" }}
        >
          WELCOME TO BOOK-EH-TRIM
        </Typography>

        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: "3rem", md: "5.5rem" },
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            mb: 3,
            textTransform: "uppercase",
          }}
        >
          Find Your Next<br />Masterpiece
        </Typography>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 400,
            maxWidth: 560,
            lineHeight: 1.7,
            opacity: 0.88,
            mb: 5,
            fontSize: { xs: "1rem", md: "1.15rem" },
          }}
        >
          The curated network of elite grooming destinations. Browse the collection and secure your spot with the pros.
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <StarIcon key={i} sx={{ color: "#C9A84C", fontSize: 22 }} />
          ))}
          <Typography variant="body2" sx={{ ml: 1.5, opacity: 0.85, fontWeight: 500 }}>
            4.9 / 5 · Premier Network Choice
          </Typography>
        </Box>
      </Box>

      {/* ── 2. REVIEWS ───────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: "#FFFFFF", py: { xs: 10, md: 14 } }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Typography
              variant="overline"
              sx={{ color: "#C9A84C", fontWeight: 700, letterSpacing: "0.25em", fontSize: "0.75rem" }}
            >
              CLIENT TESTIMONIALS
            </Typography>
            <Typography variant="h3" fontWeight={900} mt={1}>
              The Gold Standard
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {REVIEWS.map((rev, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    height: "100%",
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "#EEEEEE",
                    borderLeft: "5px solid #C9A84C",
                    transition: "all 0.3s ease",
                    "&:hover": { 
                        boxShadow: "0 12px 40px rgba(201, 168, 76, 0.12)",
                        transform: "translateY(-4px)"
                    },
                  }}
                >
                  <Rating
                    value={5}
                    readOnly
                    size="small"
                    sx={{ mb: 2.5, "& .MuiRating-iconFilled": { color: "#C9A84C" } }}
                  />
                  <Typography
                    variant="body1"
                    sx={{ fontStyle: "italic", fontWeight: 500, lineHeight: 1.7, mb: 3, color: "#333" }}
                  >
                    &ldquo;{rev.text}&rdquo;
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                    — {rev.name}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── 3. ABOUT ────────────────────────────────────────────────── */}
      <Box sx={{ 
        py: { xs: 12, md: 18 },
        textAlign: "center",
        color: "white",
        backgroundColor: "#111111", 
      }}>
        <Container maxWidth="md">
          <ContentCutIcon sx={{ color: "#C9A84C", fontSize: 56, mb: 3 }} />
          <Typography
            variant="h2"
            fontWeight={900}
            mb={3}
            sx={{ 
              fontSize: { xs: "2.5rem", md: "4.5rem" }, 
              textTransform: "uppercase",
              letterSpacing: "-0.02em" 
            }}
          >
            The Marketplace
          </Typography>
          <Typography
            variant="h6"
            sx={{ 
              fontWeight: 400, 
              lineHeight: 1.9, 
              opacity: 0.9, 
              maxWidth: 750, 
              mx: "auto",
              fontSize: { xs: "1rem", md: "1.25rem" }
            }}
          >
            Book-eh-Trim connects you with the finest craftsmen in the industry. 
            From sharp fades to classic hot towel shaves, we've vetted the best so you don't have to.
          </Typography>
        </Container>
      </Box>

      {/* ── 4. SHOPS GRID ──────────────────────────────────────────── */}
      <Box id="barber-selection" sx={{ bgcolor: "#FFFFFF", py: { xs: 10, md: 16 } }}>
        <Container maxWidth="lg">
          <Box mb={8}>
            <Typography
              variant="overline"
              sx={{ color: "#C9A84C", fontWeight: 700, letterSpacing: "0.25em", fontSize: "0.75rem" }}
            >
              THE COLLECTION
            </Typography>
            <Typography variant="h3" fontWeight={900} mt={1} mb={1}>
              Partner Shops
            </Typography>
            <Typography variant="h6" color="text.secondary" fontWeight={400}>
              Select a location to explore their team and services.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {loading
              ? [1, 2, 3].map((i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Skeleton variant="rounded" height={450} sx={{ borderRadius: 4 }} />
                  </Grid>
                ))
              : featuredShops.map((shop) => (
                  <Grid item xs={12} sm={6} md={4} key={shop.id}>
                    <BarberCard barber={shop} isMarketplace={true} />
                  </Grid>
                ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}