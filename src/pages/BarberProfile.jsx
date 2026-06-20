import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Box, Container, Typography, Avatar,
  IconButton, Tooltip, Button, CircularProgress, Alert
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowBackIcon    from "@mui/icons-material/ArrowBack";
import InstagramIcon    from "@mui/icons-material/Instagram";
import FacebookIcon     from "@mui/icons-material/Facebook";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

import SlotPicker from "../components/SlotPicker";
import SEOConfig  from "../components/SEOConfig";

import { db } from "../firebase/config";
import { doc, getDoc, collectionGroup, query, where, getDocs } from "firebase/firestore";
import { formatCurrency } from "../stripe/formatters";
import { useSlots }       from "../hooks/useSlots";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TikTokIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: "block", flexShrink: 0 }}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5
      2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27
      0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0
      6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z" />
  </svg>
);

function contrastColor(hex) {
  if (!hex || !hex.startsWith("#")) return "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#111111" : "#ffffff";
}

function SocialLink({ href, label, icon, hoverColor }) {
  if (!href) return null;
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <Tooltip title={`Follow on ${label}`} arrow>
      <IconButton
        component="a" href={url} target="_blank" rel="noopener noreferrer" size="small"
        sx={{
          border: "1.5px solid rgba(255,255,255,0.25)",
          borderRadius: 2, p: 1,
          color: "rgba(255,255,255,0.6)",
          transition: "all 0.2s",
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

// ── Main component ────────────────────────────────────────────────────────────

export default function BarberProfile({ tenant: initialTenant }) {
  const { id: barberId } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [barber,     setBarber]     = useState(null);
  const [footerData, setFooterData] = useState(initialTenant || null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [showAllServices, setShowAllServices] = useState(false);

  const { slots, loading: slotsLoading, error: slotsError } = useSlots(
    barberId,
    barber?.isStaff || false,
    barber?.shopId
  );

  useEffect(() => {
    window.scrollTo(0, 0);
    async function loadBarberData() {
      if (!barberId) return;
      try {
        setLoading(true);
        let staffData = null;

        const ownerSnap = await getDoc(doc(db, "barbers", barberId));
        if (ownerSnap.exists()) {
          const data = ownerSnap.data();
          if (data.role !== "staff" && data.name) {
            staffData = { id: ownerSnap.id, ...data, isStaff: false, shopId: ownerSnap.id };
          }
        }

        if (!staffData) {
          const shopId = initialTenant?.id || ownerSnap?.data()?.shopId;
          if (shopId) {
            const staffSnap = await getDoc(doc(db, "barbers", shopId, "staff", barberId));
            if (staffSnap.exists() && staffSnap.data().name) {
              staffData = { id: staffSnap.id, ...staffSnap.data(), isStaff: true, shopId };
            }
          }
        }

        if (!staffData) {
          const q    = query(collectionGroup(db, "staff"), where("uid", "==", barberId));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const docData      = snap.docs[0].data();
            const parentShopId = snap.docs[0].ref.path.split("/")[1];
            if (docData.name) {
              staffData = { id: snap.docs[0].id, ...docData, isStaff: true, shopId: parentShopId };
            }
          }
        }

        if (staffData) {
          setBarber(staffData);
          if (staffData.shopId && !initialTenant) {
            const shopSnap = await getDoc(doc(db, "tenants", staffData.shopId));
            if (shopSnap.exists()) setFooterData({ id: shopSnap.id, ...shopSnap.data() });
          }
          setError(null);
        } else {
          setError("Barber profile not found.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    }
    loadBarberData();
  }, [barberId, initialTenant]);

  // Navigation state (from BarberCard) takes priority for branding
  const effectiveTenant = location.state?.tenant || initialTenant || footerData;
  const brandColor  = effectiveTenant?.brandColor || barber?.brandColor || "#C9A84C";
  const btnText     = contrastColor(brandColor);

  const instagramUrl = barber?.instagramUrl || "";
  const tiktokUrl    = barber?.tiktokUrl    || "";
  const facebookUrl  = barber?.facebookUrl  || "";
  const hasSocial    = instagramUrl || tiktokUrl || facebookUrl;

  const services    = barber?.services || [];
  const visibleSvcs = showAllServices ? services : services.slice(0, 5);

  const scrollToBooking = () =>
    document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" });

  const handleSlotSelect = (slot) => {
    navigate(
      `/book/${barberId}/${slot.id}?isStaff=${barber.isStaff ? "true" : "false"}&shopId=${barber.shopId || barberId}`,
      { state: { tenant: effectiveTenant } }
    );
  };

  // ── Loading / error ───────────────────────────────────────────────────────

  if (loading) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", bgcolor: "#0a0a0a" }}>
      <CircularProgress sx={{ color: brandColor }} size={56} thickness={2} />
    </Box>
  );

  if (error) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", bgcolor: "#0a0a0a", p: 4 }}>
      <Alert severity="error" sx={{ maxWidth: 480 }}>{error}</Alert>
    </Box>
  );

  if (!barber) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0a0a0a", color: "white" }}>
      <SEOConfig barber={barber} tenant={effectiveTenant} />

      {/* 4px brand strip */}
      <Box sx={{ height: 4, bgcolor: brandColor }} />

      {/* Back button */}
      <Box sx={{ position: "fixed", top: 16, left: 20, zIndex: 1000 }}>
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            bgcolor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.15)",
            "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* ── Hero: centred profile ── */}
      <Box sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2.5, sm: 4, md: 6 },
        py: { xs: 10, md: 7 },
        bgcolor: "#0a0a0a",
      }}>
        <Box sx={{
          width: "100%",
          maxWidth: 980,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
          gap: { xs: 5, md: 7 },
          alignItems: "center",
        }}>

          {/* ── Photo ── */}
          <Box sx={{
            position: "relative",
            overflow: "hidden",
            borderTop: `4px solid ${brandColor}`,
            aspectRatio: { xs: "4/5", md: "3/4" },
            mx: { xs: "auto", md: 0 },
            maxWidth: { xs: 340, md: "100%" },
            width: "100%",
            flexShrink: 0,
          }}>
            {barber.profilePic ? (
              <Box
                component="img"
                src={barber.profilePic}
                alt={barber.name}
                sx={{
                  position: "absolute", inset: 0,
                  width: "100%", height: "100%",
                  objectFit: "cover", objectPosition: "center top",
                  display: "block",
                }}
              />
            ) : (
              <Box sx={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                bgcolor: "#111",
              }}>
                <Avatar sx={{ width: 120, height: 120, bgcolor: brandColor, fontSize: 48, fontWeight: 900 }}>
                  {barber.name?.[0]?.toUpperCase()}
                </Avatar>
              </Box>
            )}
            {/* Subtle bottom fade */}
            <Box sx={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: "25%",
              background: "linear-gradient(to top, rgba(10,10,10,0.5) 0%, transparent 100%)",
            }} />
          </Box>

          {/* ── Info ── */}
          <Box sx={{
            textAlign: { xs: "center", md: "left" },
            display: "flex", flexDirection: "column",
            alignItems: { xs: "center", md: "flex-start" },
          }}>
            {/* Eyebrow */}
            <Typography sx={{
              fontSize: "0.62rem", fontWeight: 800,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: brandColor, mb: 2,
            }}>
              Professional Barber
            </Typography>

            {/* Name */}
            <Typography sx={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 900,
              lineHeight: 1,
              fontSize: { xs: "2.8rem", sm: "3.5rem", md: "3.8rem", lg: "4.2rem" },
              color: "white",
              mb: barber.specialty ? 3 : 4,
            }}>
              {barber.name}
            </Typography>

            {/* Specialty */}
            {barber.specialty && (
              <Typography sx={{
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.85,
                fontSize: "0.95rem",
                fontWeight: 300,
                mb: 4,
                maxWidth: 420,
                borderLeft: { xs: "none", md: `2px solid ${brandColor}` },
                borderTop: { xs: `1px solid ${alpha(brandColor, 0.4)}`, md: "none" },
                borderBottom: { xs: `1px solid ${alpha(brandColor, 0.4)}`, md: "none" },
                pl: { xs: 0, md: 2 },
                py: { xs: 1.5, md: 0 },
              }}>
                {barber.specialty}
              </Typography>
            )}

            {/* Services */}
            {services.length > 0 && (
              <Box sx={{ mb: 4, width: "100%", maxWidth: { xs: 380, md: "100%" } }}>
                <Typography sx={{
                  fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.2em",
                  textTransform: "uppercase", color: brandColor,
                  display: "block", mb: 1.5,
                }}>
                  Services
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  {visibleSvcs.map((svc, i) => (
                    <Box key={i} sx={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      py: 1,
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                    }}>
                      <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: "0.88rem", fontWeight: 500 }}>
                        {svc.name}
                      </Typography>
                      <Typography sx={{ color: brandColor, fontSize: "0.88rem", fontWeight: 800, ml: 3, flexShrink: 0 }}>
                        {formatCurrency(svc.price)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                {services.length > 5 && (
                  <Button
                    size="small"
                    endIcon={<KeyboardArrowDownIcon sx={{ transition: "transform 0.2s", transform: showAllServices ? "rotate(180deg)" : "none" }} />}
                    onClick={() => setShowAllServices(v => !v)}
                    sx={{ mt: 1, color: "rgba(255,255,255,0.4)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", p: 0, "&:hover": { color: brandColor, bgcolor: "transparent" } }}
                  >
                    {showAllServices ? "Show less" : `+${services.length - 5} more`}
                  </Button>
                )}
              </Box>
            )}

            {/* Social links */}
            {hasSocial && (
              <Box sx={{ display: "flex", gap: 1, mb: 4 }}>
                <SocialLink href={instagramUrl} label="Instagram" icon={<InstagramIcon sx={{ fontSize: 20 }} />} hoverColor="#E1306C" />
                <SocialLink href={facebookUrl}  label="Facebook"  icon={<FacebookIcon  sx={{ fontSize: 20 }} />} hoverColor="#1877F2" />
                <SocialLink href={tiktokUrl}    label="TikTok"    icon={<TikTokIcon size={20} />}                 hoverColor="#ffffff" />
              </Box>
            )}

            {/* CTA */}
            <Button
              variant="contained"
              size="large"
              onClick={scrollToBooking}
              sx={{
                bgcolor: brandColor,
                color: btnText,
                px: { xs: 6, md: 5 },
                py: 1.6,
                borderRadius: 0,
                fontSize: "0.78rem",
                fontWeight: 900,
                letterSpacing: "0.18em",
                width: { xs: "100%", sm: "auto" },
                maxWidth: { xs: 380, sm: "none" },
                boxShadow: `0 0 32px ${alpha(brandColor, 0.35)}`,
                "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)", boxShadow: `0 0 48px ${alpha(brandColor, 0.5)}` },
              }}
            >
              BOOK APPOINTMENT
            </Button>
          </Box>

        </Box>
      </Box>

      {/* ── Booking section ── */}
      <Box id="booking-section" sx={{ bgcolor: "#f8f9fa", py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 7, textAlign: "center" }}>
            <Typography sx={{
              fontSize: "0.65rem", fontWeight: 800,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: brandColor, display: "block", mb: 1,
            }}>
              AVAILABILITY
            </Typography>
            <Typography variant="h3" sx={{
              fontFamily: "'Playfair Display', serif",
              color: "#0a0a0a",
              fontWeight: 700,
              fontSize: { xs: "2rem", md: "2.8rem" },
            }}>
              Book Your Appointment
            </Typography>
          </Box>

          <SlotPicker
            slots={slots}
            loading={slotsLoading}
            error={slotsError}
            brandColor={brandColor}
            onSelect={handleSlotSelect}
          />
        </Container>
      </Box>

      {/* ── Footer ── */}
      <Box component="footer" sx={{ bgcolor: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.06)", py: { xs: 5, md: 6 }, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 4, mb: 4 }}>

            {/* Brand */}
            <Box>
              <Typography sx={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: brandColor, mb: 0.5 }}>
                {barber?.businessName || barber?.name || ""}
              </Typography>
              <Typography sx={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.7, maxWidth: 220 }}>
                {barber?.address || ""}
              </Typography>
            </Box>

            {/* Social icons */}
            {hasSocial && (
              <Box>
                <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", mb: 1.5 }}>
                  Follow Us
                </Typography>
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <SocialLink href={instagramUrl} label="Instagram" icon={<InstagramIcon sx={{ fontSize: 20 }} />} hoverColor="#E1306C" />
                  <SocialLink href={facebookUrl}  label="Facebook"  icon={<FacebookIcon  sx={{ fontSize: 20 }} />} hoverColor="#1877F2" />
                  <SocialLink href={tiktokUrl}    label="TikTok"    icon={<TikTokIcon size={20} />}                 hoverColor="#ffffff" />
                </Box>
              </Box>
            )}

          </Box>

          <Box sx={{ pt: 3, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
            <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.04em" }}>
              © {new Date().getFullYear()} {barber?.businessName || barber?.name || ""}. All rights reserved.
            </Typography>
            <Typography
              component="a" href="/login"
              sx={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", textDecoration: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "2px", px: 1.5, py: 0.6, transition: "color 0.2s, border-color 0.2s", "&:hover": { color: brandColor, borderColor: brandColor } }}
            >
              Barber Login
            </Typography>
          </Box>
        </Container>
      </Box>

    </Box>
  );
}
