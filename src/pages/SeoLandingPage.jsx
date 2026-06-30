import React, { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Box, Container, Typography, Button, Divider } from "@mui/material";
import { SEO_PAGE_MAP } from "../data/seoPages";

const G = {
  gold:      "#C9A84C",
  goldLight: "#e8c97a",
  dark:      "#0d0d0d",
  dark2:     "#1a1a1a",
  warmWhite: "#faf8f4",
  muted:     "#6b6257",
};
const SERIF = "'Playfair Display', serif";
const SANS  = "'DM Sans', sans-serif";

const CTA_TEXT =
  "Join the hundreds of UK businesses getting online with Bookrightly. Start your site today at bookrightly.co.uk.";

export default function SeoLandingPage() {
  const { industry, city } = useParams();
  const navigate = useNavigate();
  const page = SEO_PAGE_MAP[`${industry}/${city}`];

  useEffect(() => { window.scrollTo(0, 0); }, [industry, city]);

  if (!page) {
    navigate("/", { replace: true });
    return null;
  }

  const metaDescription = `Bookrightly helps ${page.industry} businesses in ${page.city} get a professional, mobile-friendly website with built-in booking — no tech skills needed. Start today at bookrightly.co.uk.`;

  return (
    <Box sx={{ bgcolor: G.warmWhite, minHeight: "100vh", fontFamily: SANS }}>
      <Helmet>
        <title>{`${page.h1} | Bookrightly`}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={`https://bookrightly.co.uk/website-design/${industry}/${city}`} />
      </Helmet>

      {/* Hero band */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${G.dark} 0%, ${G.dark2} 100%)`,
          px: { xs: 2, md: 5 },
          py: { xs: 6, md: 10 },
          borderBottom: `3px solid ${G.gold}`,
        }}
      >
        <Container maxWidth="md" disableGutters>
          <Typography
            component="p"
            sx={{
              color: G.gold,
              fontFamily: SANS,
              fontSize: "0.75rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              mb: 2,
            }}
          >
            Website Design for UK Businesses
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: SERIF,
              color: "#fff",
              fontSize: { xs: "1.9rem", md: "3rem" },
              fontWeight: 400,
              lineHeight: 1.15,
              mb: 3,
            }}
          >
            {page.h1}
          </Typography>
          <Button
            component="a"
            href="https://bookrightly.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            sx={{
              bgcolor: G.gold,
              color: G.dark,
              fontFamily: SANS,
              fontWeight: 700,
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: "none",
              fontSize: "0.95rem",
              "&:hover": { bgcolor: G.goldLight },
            }}
          >
            Start Your Free Website →
          </Button>
        </Container>
      </Box>

      {/* Body */}
      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
        {page.sections.map((section, i) => (
          <Box key={i} sx={{ mb: 6 }}>
            <Typography
              component="h2"
              sx={{
                fontFamily: SERIF,
                color: G.dark2,
                fontSize: { xs: "1.35rem", md: "1.75rem" },
                fontWeight: 600,
                mb: 2.5,
                lineHeight: 1.2,
              }}
            >
              {section.h2}
            </Typography>
            {section.paragraphs.map((para, j) => (
              <Typography
                key={j}
                sx={{
                  color: "#4a443d",
                  fontSize: "0.97rem",
                  lineHeight: 1.9,
                  mb: 2,
                  fontFamily: SANS,
                }}
              >
                {para}
              </Typography>
            ))}
          </Box>
        ))}

        <Divider sx={{ borderColor: "#e8e2d8", my: 5 }} />

        {/* CTA block */}
        <Box
          sx={{
            bgcolor: G.dark,
            borderRadius: 3,
            p: { xs: 3, md: 5 },
            textAlign: "center",
            border: `1px solid ${G.gold}33`,
          }}
        >
          <Typography
            sx={{
              fontFamily: SERIF,
              color: "#fff",
              fontSize: { xs: "1.2rem", md: "1.5rem" },
              fontWeight: 400,
              lineHeight: 1.5,
              mb: 3,
            }}
          >
            {CTA_TEXT}
          </Typography>
          <Button
            component="a"
            href="https://bookrightly.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            size="large"
            sx={{
              bgcolor: G.gold,
              color: G.dark,
              fontFamily: SANS,
              fontWeight: 700,
              px: 5,
              py: 1.75,
              borderRadius: 2,
              textTransform: "none",
              fontSize: "1rem",
              "&:hover": { bgcolor: G.goldLight },
            }}
          >
            Get Started at bookrightly.co.uk
          </Button>
        </Box>

        {/* Back link */}
        <Box sx={{ mt: 5, textAlign: "center" }}>
          <Button
            component={Link}
            to="/"
            sx={{
              color: G.muted,
              textTransform: "none",
              fontFamily: SANS,
              fontSize: "0.85rem",
              "&:hover": { color: G.gold, bgcolor: "transparent" },
            }}
          >
            ← Back to Bookrightly
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
