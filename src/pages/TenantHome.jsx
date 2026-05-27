import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Box, Container, Typography, Grid, Paper,
  Button, Divider, Stack, Avatar,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  useMediaQuery, useTheme, IconButton, Tooltip
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import VerifiedIcon from "@mui/icons-material/Verified";
import SanitizerIcon from "@mui/icons-material/Sanitizer";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import StarIcon from "@mui/icons-material/Star";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import RateReviewIcon from "@mui/icons-material/RateReview";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../firebase/config";
import { getShopStaff, getBarber } from "../firebase/firestore";
import BarberCard from "../components/BarberCard";

// ── Google Fonts import ────────────────────────────────────────────────────────
// Add this to your index.html or _document.js:
// <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Playfair+Display:wght@400;500&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />

// ── TikTok SVG ────────────────────────────────────────────────────────────────
const TikTokIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ display: "block" }}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5
      2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27
      0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0
      6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z" />
  </svg>
);

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Reveal wrapper ────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, direction = "up", threshold = 0.12 }) {
  const { ref, visible } = useScrollReveal(threshold);
  const transforms = { up: "translateY(32px)", left: "translateX(-24px)", right: "translateX(24px)", none: "none" };
  return (
    <Box
      ref={ref}
      sx={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : transforms[direction],
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </Box>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ text, color }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
      <Box sx={{ width: 28, height: 1, bgcolor: color || "#C9A84C" }} />
      <Typography
        sx={{
          fontFamily: "'Jost', sans-serif",
          fontSize: "0.7rem",
          fontWeight: 600,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: color || "#C9A84C",
        }}
      >
        {text}
      </Typography>
    </Box>
  );
}

// ── Social button ─────────────────────────────────────────────────────────────
function SocialButton({ href, label, icon, hoverColor }) {
  if (!href) return null;
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <Tooltip title={`Follow on ${label}`} arrow>
      <IconButton
        component="a" href={url} target="_blank" rel="noopener noreferrer"
        size="small"
        sx={{
          width: 38, height: 38,
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "50%",
          color: "rgba(255,255,255,0.75)",
          transition: "all 0.25s",
          "&:hover": {
            borderColor: hoverColor,
            color: hoverColor,
            bgcolor: alpha(hoverColor, 0.12),
            transform: "translateY(-2px)",
          },
        }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}

// ── Review Carousel ───────────────────────────────────────────────────────────
function ReviewCarousel({ reviews, brandColor }) {
  const [current, setCurrent] = useState(0);
  const total = reviews.length;
  const [animating, setAnimating] = useState(false);

  const go = useCallback((dir) => {
    if (animating || total <= 1) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(i => dir === "next" ? (i + 1) % total : (i - 1 + total) % total);
      setAnimating(false);
    }, 200);
  }, [animating, total]);

  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(() => go("next"), 6000);
    return () => clearInterval(timer);
  }, [total, go]);

  if (total === 0) {
    return (
      <Typography textAlign="center" color="text.secondary" sx={{ fontFamily: "'Jost', sans-serif", fontWeight: 300 }}>
        No testimonials yet — be the first to leave one.
      </Typography>
    );
  }

  const rev = reviews[current];
  const rawName = rev.customerName || rev.name || "Client";
  const starRating = Math.min(5, Math.max(1, Number(rev.rating) || 5));

  return (
    <Box sx={{ position: "relative", maxWidth: 720, mx: "auto" }}>
      {/* Large decorative quote mark */}
      <Typography
        sx={{
          position: "absolute",
          top: -20,
          left: { xs: 24, md: 48 },
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "10rem",
          lineHeight: 1,
          color: brandColor,
          opacity: 0.12,
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        "
      </Typography>

      <Box
        sx={{
          px: { xs: 3, md: 8 },
          py: { xs: 6, md: 8 },
          opacity: animating ? 0 : 1,
          transform: animating ? "translateY(8px)" : "none",
          transition: "opacity 0.2s ease, transform 0.2s ease",
        }}
      >
        {/* Stars */}
        <Box sx={{ display: "flex", gap: 0.5, mb: 4 }}>
          {[...Array(5)].map((_, i) => (
            <StarIcon
              key={i}
              sx={{ fontSize: 16, color: i < starRating ? brandColor : "#e0e0e0" }}
            />
          ))}
        </Box>

        {/* Quote */}
        <Typography
          sx={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: { xs: "1.35rem", md: "1.65rem" },
            lineHeight: 1.65,
            color: "#1a1a1a",
            mb: 5,
          }}
        >
          "{rev.comment || rev.text || "An exceptional experience from start to finish."}"
        </Typography>

        {/* Divider + author */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Box sx={{ width: 32, height: 1, bgcolor: brandColor }} />
          <Box>
            <Typography
              sx={{
                fontFamily: "'Jost', sans-serif",
                fontWeight: 600,
                fontSize: "0.8rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              {rawName}
            </Typography>
            <Typography
              sx={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "0.7rem",
                color: "text.secondary",
                letterSpacing: "0.1em",
                mt: 0.3,
              }}
            >
              Verified Client
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Arrows */}
      {total > 1 && (
        <Box sx={{ display: "flex", justifyContent: "space-between", px: { xs: 0, md: 0 }, mt: 2 }}>
          <IconButton
            onClick={() => go("prev")}
            size="small"
            sx={{
              width: 48, height: 48,
              border: "1px solid #e0e0e0",
              borderRadius: "50%",
              color: "#333",
              transition: "all 0.2s",
              "&:hover": { bgcolor: brandColor, borderColor: brandColor, color: "white" },
            }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>

          {/* Dots */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {reviews.map((_, i) => (
              <Box
                key={i}
                onClick={() => setCurrent(i)}
                sx={{
                  width: i === current ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: i === current ? brandColor : "#ddd",
                  cursor: "pointer",
                  transition: "all 0.35s ease",
                }}
              />
            ))}
          </Box>

          <IconButton
            onClick={() => go("next")}
            size="small"
            sx={{
              width: 48, height: 48,
              border: "1px solid #e0e0e0",
              borderRadius: "50%",
              color: "#333",
              transition: "all 0.2s",
              "&:hover": { bgcolor: brandColor, borderColor: brandColor, color: "white" },
            }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}

// ── Hours row ─────────────────────────────────────────────────────────────────
function HoursRow({ day, dayData, isLast }) {
  const isClosed = !dayData || dayData.isClosed || !dayData.open || !dayData.close;
  const isToday = new Date().toLocaleDateString("en-GB", { weekday: "long" }) === day;
  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          py: 1.5,
          px: isToday ? 1.5 : 0,
          bgcolor: isToday ? "rgba(0,0,0,0.04)" : "transparent",
          borderRadius: 1,
          transition: "background 0.2s",
        }}
      >
        <Typography
          sx={{
            fontFamily: "'Jost', sans-serif",
            fontWeight: isToday ? 600 : 400,
            fontSize: "0.9rem",
            letterSpacing: "0.03em",
          }}
        >
          {day}
        </Typography>
        <Typography
          sx={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "0.85rem",
            fontWeight: 300,
            color: isClosed ? "#c0392b" : isToday ? "inherit" : "text.secondary",
            letterSpacing: "0.02em",
          }}
        >
          {isClosed ? "Closed" : `${dayData.open} – ${dayData.close}`}
        </Typography>
      </Box>
      {!isLast && <Divider sx={{ opacity: 0.35 }} />}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TenantHome({ tenant: initialTenant }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantId } = useParams();
  const theme = useTheme();
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));

  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [freshTenant, setFreshTenant] = useState(initialTenant || location.state?.tenant);

  const brandColor      = freshTenant?.brandColor      || "#C9A84C";
  const businessName    = freshTenant?.businessName     || "TRIMZ";
  const address         = freshTenant?.address          || "Location TBD";
  const aboutBgColor    = freshTenant?.aboutSectionColor || "#0d0d0d";
  const trustBarBgColor = freshTenant?.trustBarColor    || "#080808";

  const ownerInstagram = freshTenant?.instagramUrl || "";
  const ownerTikTok    = freshTenant?.tiktokUrl    || "";
  const ownerFacebook  = freshTenant?.facebookUrl  || "";

  const getContrastText = (hex) => {
    if (!hex) return "#ffffff";
    const h = hex.replace("#", "");
    const r = parseInt(h.substr(0, 2), 16);
    const g = parseInt(h.substr(2, 2), 16);
    const b = parseInt(h.substr(4, 2), 16);
    return ((r * 299 + g * 587 + b * 114) / 1000) > 155 ? "#000000" : "#ffffff";
  };

  const aboutTextColor    = getContrastText(aboutBgColor);
  const trustBarTextColor = getContrastText(trustBarBgColor);

  const heroImageUrl = isMobileOrTablet
    ? (freshTenant?.heroImageMobile || freshTenant?.heroImage || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1")
    : (freshTenant?.heroImage || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1");

  useEffect(() => { window.scrollTo(0, 0); }, [tenantId, initialTenant?.id]);

  useEffect(() => {
    async function fetchTenantData() {
      setLoading(true);
      try {
        let activeTenantId = initialTenant?.id || tenantId || location.state?.tenant?.id;
        let tenantBaseData = initialTenant || location.state?.tenant;

        if (!activeTenantId) {
          const currentHost = window.location.hostname;
          const q = query(collection(db, "tenants"), where("vercelUrl", "==", currentHost), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            activeTenantId = snap.docs[0].id;
            tenantBaseData = { id: activeTenantId, ...snap.docs[0].data() };
          }
        }

        if (!activeTenantId) { setLoading(false); return; }

        const [updatedOwnerData, staffMembers, reviewsSnap] = await Promise.all([
          getBarber(activeTenantId),
          getShopStaff(activeTenantId),
          getDocs(collection(db, "barbers", activeTenantId, "reviews")),
        ]);

        const fetchedReviews = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const finalTenantData = { ...(updatedOwnerData || tenantBaseData), id: activeTenantId, reviews: fetchedReviews };

        setFreshTenant(finalTenantData);

        const ownerObject = {
          ...finalTenantData,
          name:       finalTenantData.name || "Master Barber",
          profilePic: finalTenantData.profilePic || "",
          isOwner:    true,
          shopId:     activeTenantId,
        };

        const activeStaff = staffMembers
          .map(m => ({ ...m, shopId: activeTenantId }))
          .filter(m => m.name);

        setTeam([ownerObject, ...activeStaff]);
      } catch (err) {
        console.error("Error loading shop data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTenantData();
  }, [initialTenant?.id, tenantId, location.state]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: "#000" }}>
        <CircularProgress sx={{ color: brandColor }} thickness={1.5} size={48} />
      </Box>
    );
  }

  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  return (
    <Box sx={{ bgcolor: "#FAFAFA", minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── 1. HERO ──────────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: "relative",
          height: "100vh",
          minHeight: 640,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          color: "white",
          textAlign: "center",
        }}
      >
        {/* Background image with subtle parallax feel */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url('${heroImageUrl}')`,
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
            transform: "scale(1.04)",
            filter: "brightness(0.45)",
          }}
        />

        {/* Gradient overlay — richer depth */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(160deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.85) 100%)",
          }}
        />

        {/* Content */}
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          {/* Social links — top right */}
          {(ownerInstagram || ownerTikTok || ownerFacebook) && (
            <Box
              sx={{
                position: "absolute",
                top: { xs: -60, md: -80 },
                right: 0,
                display: "flex",
                gap: 1,
              }}
            >
              <SocialButton href={ownerInstagram} label="Instagram" icon={<InstagramIcon sx={{ fontSize: 18 }} />} hoverColor="#E1306C" />
              <SocialButton href={ownerTikTok}    label="TikTok"    icon={<TikTokIcon size={18} />}                hoverColor="#69C9D0" />
              <SocialButton href={ownerFacebook}  label="Facebook"  icon={<FacebookIcon sx={{ fontSize: 18 }} />}  hoverColor="#1877F2" />
            </Box>
          )}

          {/* Eye-line separator */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              mb: 5,
              animation: "fadeUp 0.9s ease both",
              "@keyframes fadeUp": {
                from: { opacity: 0, transform: "translateY(20px)" },
                to:   { opacity: 1, transform: "none" },
              },
            }}
          >
            <Box sx={{ width: 36, height: "1px", bgcolor: brandColor, opacity: 0.7 }} />
            <Typography
              sx={{
                fontFamily: "'Jost', sans-serif",
                fontWeight: 500,
                fontSize: "0.68rem",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.75)",
              }}
            >
              Welcome to
            </Typography>
            <Box sx={{ width: 36, height: "1px", bgcolor: brandColor, opacity: 0.7 }} />
          </Box>

          {/* Business name */}
          <Typography
            variant="h1"
            sx={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 400,
              fontSize: { xs: "3.2rem", sm: "5rem", md: "7.5rem", lg: "9rem" },
              lineHeight: 0.9,
              letterSpacing: { xs: "-0.02em", md: "-0.03em" },
              textTransform: "uppercase",
              mb: 5,
              animation: "fadeUp 0.9s 0.15s ease both",
            }}
          >
            {businessName}
          </Typography>

          {/* Stars + tagline */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
              animation: "fadeUp 0.9s 0.3s ease both",
            }}
          >
            <Box sx={{ display: "flex", gap: 0.5 }}>
              {[1,2,3,4,5].map(i => (
                <StarIcon key={i} sx={{ color: brandColor, fontSize: 18, opacity: 0.9 }} />
              ))}
            </Box>
            <Typography
              sx={{
                fontFamily: "'Jost', sans-serif",
                fontWeight: 300,
                fontSize: "0.78rem",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.65)",
              }}
            >
              5.0 · Top Rated Excellence
            </Typography>
          </Box>

          {/* CTA */}
          <Box sx={{ mt: 7, animation: "fadeUp 0.9s 0.45s ease both" }}>
            <Button
              onClick={() => {
                document.getElementById("barber-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              sx={{
                fontFamily: "'Jost', sans-serif",
                fontWeight: 500,
                fontSize: "0.75rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "white",
                px: 5,
                py: 2,
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "2px",
                bgcolor: "transparent",
                transition: "all 0.3s",
                "&:hover": {
                  bgcolor: brandColor,
                  borderColor: brandColor,
                  color: "white",
                },
              }}
            >
              Book a Barber
            </Button>
          </Box>
        </Container>

        {/* Scroll cue */}
        <Box
          sx={{
            position: "absolute",
            bottom: 36,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            opacity: 0.45,
            animation: "bounce 2s 1.2s infinite",
            "@keyframes bounce": {
              "0%,100%": { transform: "translateX(-50%) translateY(0)" },
              "50%":     { transform: "translateX(-50%) translateY(6px)" },
            },
          }}
        >
          <Box sx={{ width: 1, height: 40, bgcolor: "white" }} />
          <KeyboardArrowDownIcon sx={{ color: "white", fontSize: 18 }} />
        </Box>
      </Box>

      {/* ── 2. TRUST BAR ─────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: trustBarBgColor }}>
        <Container maxWidth="lg">
          <Grid container>
            {[
              { icon: <VerifiedIcon />,         text: "Licensed Barbers",    sub: "All staff fully certified" },
              { icon: <SanitizerIcon />,        text: "Hygiene Guaranteed",  sub: "Sanitised tools, every cut" },
              { icon: <WorkspacePremiumIcon />, text: "Premium Products",    sub: "Professional-grade only" },
            ].map((signal, idx) => (
              <Grid item xs={12} md={4} key={idx}>
                <Box
                  sx={{
                    py: 5,
                    px: { xs: 3, md: 5 },
                    borderRight: { md: idx < 2 ? `1px solid rgba(255,255,255,0.07)` : "none" },
                    borderBottom: { xs: idx < 2 ? `1px solid rgba(255,255,255,0.07)` : "none", md: "none" },
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  {React.cloneElement(signal.icon, {
                    sx: { color: brandColor, fontSize: 26, flexShrink: 0 }
                  })}
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: "'Jost', sans-serif",
                        fontWeight: 500,
                        fontSize: "0.85rem",
                        letterSpacing: "0.08em",
                        color: trustBarTextColor,
                        mb: 0.4,
                      }}
                    >
                      {signal.text}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: "'Jost', sans-serif",
                        fontWeight: 300,
                        fontSize: "0.75rem",
                        letterSpacing: "0.03em",
                        color: alpha(trustBarTextColor, 0.45),
                      }}
                    >
                      {signal.sub}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── 3. FIND US & HOURS ───────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 10, md: 16 } }}>
        <Grid container spacing={6} alignItems="stretch">
          {/* Location */}
          <Grid item xs={12} md={6}>
            <Reveal direction="left">
              <Box sx={{ height: "100%" }}>
                <SectionLabel text="Find Us" color={brandColor} />
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 400,
                    mb: 2,
                    fontSize: { xs: "1.9rem", md: "2.3rem" },
                  }}
                >
                  Visit the Shop
                </Typography>
                <Typography
                  sx={{
                    fontFamily: "'Jost', sans-serif",
                    fontWeight: 300,
                    color: "text.secondary",
                    mb: 5,
                    lineHeight: 1.8,
                    fontSize: "1rem",
                  }}
                >
                  {address}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)}
                  sx={{
                    fontFamily: "'Jost', sans-serif",
                    fontWeight: 500,
                    fontSize: "0.72rem",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    bgcolor: "#0d0d0d",
                    color: "white",
                    px: 4.5,
                    py: 1.75,
                    borderRadius: "2px",
                    boxShadow: "none",
                    "&:hover": { bgcolor: brandColor, boxShadow: "none" },
                    transition: "background 0.3s",
                  }}
                >
                  Get Directions
                </Button>
              </Box>
            </Reveal>
          </Grid>

          {/* Hours */}
          <Grid item xs={12} md={6}>
            <Reveal direction="right" delay={0.1}>
              <Box
                sx={{
                  bgcolor: "white",
                  border: "1px solid #ebebeb",
                  p: { xs: 3.5, md: 5 },
                  height: "100%",
                }}
              >
                <SectionLabel text="Opening Hours" color={brandColor} />
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 400,
                    mb: 3,
                    fontSize: { xs: "1.9rem", md: "2.3rem" },
                  }}
                >
                  When We're Open
                </Typography>
                {freshTenant?.hours ? (
                  <Box>
                    {DAYS.map((day, i) => {
                      const dayData = freshTenant.hours[day] || freshTenant.hours[day.toLowerCase()];
                      return <HoursRow key={day} day={day} dayData={dayData} isLast={i === 6} />;
                    })}
                  </Box>
                ) : (
                  <Typography
                    sx={{
                      fontFamily: "'Jost', sans-serif",
                      fontWeight: 300,
                      color: "text.secondary",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {freshTenant?.openingHours || "Contact us for opening times"}
                  </Typography>
                )}
              </Box>
            </Reveal>
          </Grid>
        </Grid>
      </Container>

      {/* ── 4. ABOUT ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          bgcolor: aboutBgColor,
          color: aboutTextColor,
          py: { xs: 14, md: 22 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle decorative element */}
        <Box
          sx={{
            position: "absolute",
            right: { xs: -60, md: 80 },
            top: "50%",
            transform: "translateY(-50%)",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: { xs: "18rem", md: "24rem" },
            lineHeight: 1,
            opacity: 0.04,
            color: brandColor,
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          &amp;
        </Box>

        <Container maxWidth="md" sx={{ position: "relative" }}>
          <Reveal threshold={0.1}>
            <Box sx={{ textAlign: "center" }}>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    border: `1px solid ${alpha(brandColor, 0.4)}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                  }}
                >
                  <ContentCutIcon sx={{ color: brandColor, fontSize: 22 }} />
                </Box>
              </Box>

              <Typography
                sx={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: "0.68rem",
                  fontWeight: 500,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: brandColor,
                  mb: 2.5,
                }}
              >
                Our Story
              </Typography>

              <Typography
                variant="h3"
                sx={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 400,
                  fontSize: { xs: "2rem", md: "3rem" },
                  mb: 5,
                  color: aboutTextColor,
                  lineHeight: 1.2,
                }}
              >
                Craft, Care &<br />Character
              </Typography>

              <Typography
                sx={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 400,
                  fontStyle: "italic",
                  fontSize: { xs: "1.25rem", md: "1.55rem" },
                  lineHeight: 1.8,
                  color: alpha(aboutTextColor, 0.75),
                  maxWidth: 680,
                  mx: "auto",
                }}
              >
                {freshTenant?.aboutUs || `Welcome to ${businessName}. Share your mission, your craft, and what sets your business apart.`}
              </Typography>
            </Box>
          </Reveal>
        </Container>
      </Box>

      {/* ── 5. TEAM GRID ─────────────────────────────────────────────────── */}
      <Box id="barber-section" sx={{ py: { xs: 12, md: 18 }, bgcolor: "#FAFAFA" }}>
        <Container maxWidth="lg">
          <Reveal>
            <Box sx={{ mb: 10, textAlign: "center" }}>
              <SectionLabel text="The Experts" color={brandColor} />
              <Typography
                variant="h3"
                sx={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 400,
                  fontSize: { xs: "2rem", md: "2.8rem" },
                  mt: 0.5,
                  mb: 3,
                }}
              >
                Meet the Barbers
              </Typography>
              <Box sx={{ width: 36, height: 1, bgcolor: brandColor, mx: "auto" }} />
            </Box>
          </Reveal>

          <Grid container spacing={4}>
            {team.map((barber, idx) => (
              <Grid item xs={12} sm={6} md={4} key={barber.id}>
                <Reveal delay={idx * 0.08}>
                  <BarberCard
                    barber={{
                      ...barber,
                      businessName: barber.name,
                      logoUrl:      barber.profilePic,
                    }}
                    isMarketplace={false}
                  />
                </Reveal>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── 6. REVIEWS ───────────────────────────────────────────────────── */}
      <Box sx={{ py: { xs: 12, md: 18 }, bgcolor: "#ffffff", borderTop: "1px solid #efefef" }}>
        <Container maxWidth="lg">
          <Reveal>
            <Box sx={{ mb: { xs: 8, md: 12 }, textAlign: "center" }}>
              <SectionLabel text="Testimonials" color={brandColor} />
              <Typography
                variant="h3"
                sx={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 400,
                  fontSize: { xs: "2rem", md: "2.8rem" },
                  mt: 0.5,
                }}
              >
                What Clients Say
              </Typography>
            </Box>
          </Reveal>

          <Reveal delay={0.1}>
            <ReviewCarousel reviews={freshTenant?.reviews || []} brandColor={brandColor} />
          </Reveal>

          <Box sx={{ mt: 10, textAlign: "center" }}>
            <Button
              startIcon={<RateReviewIcon sx={{ fontSize: "16px !important" }} />}
              onClick={() => navigate(`/review/${freshTenant?.id || freshTenant?.uid}`)}
              sx={{
                fontFamily: "'Jost', sans-serif",
                fontWeight: 500,
                fontSize: "0.72rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#0d0d0d",
                px: 5,
                py: 2,
                border: "1px solid #d0d0d0",
                borderRadius: "2px",
                bgcolor: "transparent",
                transition: "all 0.25s",
                "&:hover": {
                  borderColor: brandColor,
                  color: brandColor,
                  bgcolor: "transparent",
                },
              }}
            >
              Leave a Review
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ── 7. FOOTER ────────────────────────────────────────────────────── */}
      <Box
        sx={{
          bgcolor: "#0d0d0d",
          color: "rgba(255,255,255,0.45)",
          py: 5,
          borderTop: `2px solid ${brandColor}`,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              justifyContent: "space-between",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Typography
              sx={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 400,
                fontSize: "1.3rem",
                color: "white",
                letterSpacing: "0.04em",
              }}
            >
              {businessName}
            </Typography>

            <Typography
              sx={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "0.72rem",
                letterSpacing: "0.08em",
                textAlign: "center",
              }}
            >
              © {new Date().getFullYear()} {businessName}. All rights reserved.
            </Typography>

            {(ownerInstagram || ownerTikTok || ownerFacebook) && (
              <Box sx={{ display: "flex", gap: 1 }}>
                <SocialButton href={ownerInstagram} label="Instagram" icon={<InstagramIcon sx={{ fontSize: 17 }} />} hoverColor="#E1306C" />
                <SocialButton href={ownerTikTok}    label="TikTok"    icon={<TikTokIcon size={17} />}                hoverColor="#69C9D0" />
                <SocialButton href={ownerFacebook}  label="Facebook"  icon={<FacebookIcon sx={{ fontSize: 17 }} />}  hoverColor="#1877F2" />
              </Box>
            )}
          </Box>
        </Container>
      </Box>

    </Box>
  );
}