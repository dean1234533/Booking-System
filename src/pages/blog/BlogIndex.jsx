import React from "react";
import { Box, Grid, Typography, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { BLOG_POSTS } from "./posts";

const GOLD = "#C9A84C";
const DARK = "#0d0d0d";
const DARK3 = "#1a1a1a";
const SERIF = "'Playfair Display', serif";
const SANS = "'DM Sans', sans-serif";

const CATEGORY_COLOR = {
  Barbers: "#C9A84C",
  "Personal Trainers": "#4caf80",
  Marketing: "#5b9bd5",
  Salons: "#e05c5c",
  Decorators: "#b07d4a",
};

export default function BlogIndex() {
  const navigate = useNavigate();
  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      {/* Hero */}
      <Box sx={{ pt: { xs: 10, md: 14 }, pb: { xs: 6, md: 8 }, px: { xs: 3, md: 5 }, textAlign: "center", position: "relative" }}>
        <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, mb: 2 }}>
          Bookrightly Blog
        </Typography>
        <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 400, mb: 2, maxWidth: 700, mx: "auto" }}>
          Advice for UK service professionals
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "1rem", maxWidth: 520, mx: "auto", lineHeight: 1.8 }}>
          Practical guides on bookings, payments, no-shows, marketing, and growing a service business in the UK.
        </Typography>
      </Box>

      {/* Posts grid */}
      <Box sx={{ py: { xs: 6, md: 8 }, px: { xs: 3, md: 5 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            {BLOG_POSTS.map((post) => (
              <Grid item xs={12} sm={6} md={4} key={post.slug}>
                <Box
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  sx={{
                    bgcolor: DARK3, border: "1px solid rgba(255,255,255,0.06)", p: 3.5,
                    height: "100%", display: "flex", flexDirection: "column", cursor: "pointer",
                    transition: "border-color 0.2s",
                    "&:hover": { borderColor: "rgba(201,168,76,0.3)" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
                    <Box sx={{ px: 1.5, py: 0.4, bgcolor: `${CATEGORY_COLOR[post.category] || GOLD}18`, borderRadius: 0 }}>
                      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: CATEGORY_COLOR[post.category] || GOLD, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {post.category}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>{post.readTime} read</Typography>
                  </Box>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "1.15rem", fontWeight: 400, lineHeight: 1.4, mb: 1.5, color: "#fff", flex: 1 }}>
                    {post.title}
                  </Typography>
                  <Typography sx={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, mb: 2.5 }}>
                    {post.description}
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: GOLD, fontWeight: 600, letterSpacing: "0.04em" }}>
                    Read article →
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Bottom CTA */}
      <Box sx={{ py: { xs: 10, md: 12 }, px: { xs: 3, md: 5 }, textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.6rem", md: "2.2rem" }, fontWeight: 400, mb: 2 }}>
          Ready to take your first online booking?
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.95rem", mb: 4, maxWidth: 460, mx: "auto", lineHeight: 1.8 }}>
          90-day free trial. No card. Set up in under an hour.
        </Typography>
        <Box component="button" onClick={() => navigate("/signup")} sx={{ px: 4, py: 1.75, bgcolor: GOLD, color: DARK, fontFamily: SANS, fontWeight: 800, fontSize: "0.9rem", border: "none", cursor: "pointer", "&:hover": { opacity: 0.9 } }}>
          Get started free
        </Box>
      </Box>
    </Box>
  );
}
