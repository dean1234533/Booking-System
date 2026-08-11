import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Box, Container, Typography, Avatar,
  IconButton, Tooltip, Button, CircularProgress, Alert
} from "@mui/material";
import { alpha } from "@mui/material/styles";
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
          border: "1.5px solid rgba(0,0,0,0.15)",
          borderRadius: 2, p: 1,
          color: "rgba(0,0,0,0.5)",
          transition: "all 0.2s",
          "&:hover": {
            borderColor: hoverColor,
            color: hoverColor,
            bgcolor: alpha(hoverColor, 0.08),
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

  // Personal staff social links (barber-only, separate from business links)
  const staffInstagram = barber?.staffInstagram || "";
  const staffTiktok    = barber?.staffTiktok    || "";
  const staffFacebook  = barber?.staffFacebook  || "";
  const hasStaffSocial = staffInstagram || staffTiktok || staffFacebook;

  const services    = barber?.services || [];
  const visibleSvcs = showAllServices ? services : services.slice(0, 5);

  // Editable page fields
  const heroTagline  = barber?.heroTagline  || "Professional Barber";
  const heroCtaText  = barber?.heroCtaText  || "BOOK APPOINTMENT";
  const aboutBody    = barber?.aboutBody    || barber?.aboutUs || "";
  const statBar = barber?.statBar1Num ? [
    { num: barber.statBar1Num, label: barber.statBar1Label || "" },
    { num: barber.statBar2Num, label: barber.statBar2Label || "" },
    { num: barber.statBar3Num, label: barber.statBar3Label || "" },
  ] : null;

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
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", bgcolor: "#fff" }}>
      <CircularProgress sx={{ color: brandColor }} size={56} thickness={2} />
    </Box>
  );

  if (error) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", bgcolor: "#fff", p: 4 }}>
      <Alert severity="error" sx={{ maxWidth: 480 }}>{error}</Alert>
    </Box>
  );

  if (!barber) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fff", color: "#111" }}>
      <SEOConfig barber={barber} tenant={effectiveTenant} />

      {/* 4px brand strip */}
      <Box sx={{ height: 4, bgcolor: brandColor }} />

      {/* ── Hero ── */}
      <Box sx={{
        pt: { xs: 8, md: 10 },
        pb: { xs: 6, md: 8 },
        px: { xs: 2.5, sm: 4, md: 6 },
        bgcolor: "#fff",
      }}>
        <Box sx={{ width: "100%", maxWidth: 680, mx: "auto" }}>

          {/* ── Info ── */}
          <Box sx={{
            textAlign: "left",
            display: "flex", flexDirection: "column",
            alignItems: "flex-start",
          }}>
            {/* Eyebrow */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
              <Box sx={{ width: 28, height: 2, bgcolor: brandColor }} />
              <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: brandColor }}>
                {heroTagline}
              </Typography>
            </Box>

            {/* Name */}
            <Typography sx={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 900, lineHeight: 1,
              fontSize: { xs: "2.6rem", sm: "3.2rem", md: "3.6rem" },
              color: "#111", mb: 2.5,
            }}>
              {barber.name}
            </Typography>

            {/* Bio / specialty */}
            <Typography sx={{
              color: (barber.specialty || aboutBody) ? "#666" : "rgba(0,0,0,0.25)",
              lineHeight: 1.85, fontSize: "0.95rem", fontWeight: 300,
              mb: 3, maxWidth: 440,
              borderLeft: `2px solid ${brandColor}`,
              pl: 2,
              fontStyle: (barber.specialty || aboutBody) ? "normal" : "italic",
            }}>
              {barber.specialty || aboutBody || "No bio added yet."}
            </Typography>

            {/* Services */}
            <Box sx={{ mb: 3.5, width: "100%", maxWidth: { xs: 400, md: "100%" } }}>
              <Typography sx={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: brandColor, display: "block", mb: 1.5 }}>
                Services &amp; Prices
              </Typography>
              {services.length > 0 ? (
                <>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    {visibleSvcs.map((svc, i) => (
                      <Box key={i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1, borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                        <Typography sx={{ color: "#444", fontSize: "0.88rem", fontWeight: 500 }}>{svc.name}</Typography>
                        <Typography sx={{ color: brandColor, fontSize: "0.88rem", fontWeight: 800, ml: 3, flexShrink: 0 }}>{formatCurrency(svc.price)}</Typography>
                      </Box>
                    ))}
                  </Box>
                  {services.length > 5 && (
                    <Button size="small"
                      endIcon={<KeyboardArrowDownIcon sx={{ transition: "transform 0.2s", transform: showAllServices ? "rotate(180deg)" : "none" }} />}
                      onClick={() => setShowAllServices(v => !v)}
                      sx={{ mt: 1, color: "rgba(0,0,0,0.4)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", p: 0, "&:hover": { color: brandColor, bgcolor: "transparent" } }}
                    >
                      {showAllServices ? "Show less" : `+${services.length - 5} more`}
                    </Button>
                  )}
                </>
              ) : (
                <Typography sx={{ color: "rgba(0,0,0,0.25)", fontSize: "0.85rem", fontStyle: "italic", py: 1, borderTop: "1px solid rgba(0,0,0,0.07)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                  No services added yet.
                </Typography>
              )}
            </Box>

            {/* Opening hours */}
            {barber?.openingHours && (
              <Box sx={{ mb: 3, p: 2, bgcolor: "rgba(0,0,0,0.03)", borderRadius: 1, borderLeft: `3px solid ${brandColor}` }}>
                <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: brandColor, mb: 0.75 }}>
                  Opening Hours
                </Typography>
                <Typography sx={{ fontSize: "0.82rem", color: "#555", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                  {barber.openingHours}
                </Typography>
              </Box>
            )}

            {/* Social links */}
            {(hasSocial || hasStaffSocial) && (
              <Box sx={{ mb: 3.5 }}>
                {hasSocial && (
                  <Box sx={{ display: "flex", gap: 1, mb: hasStaffSocial ? 1.5 : 0 }}>
                    <SocialLink href={instagramUrl} label="Instagram" icon={<InstagramIcon sx={{ fontSize: 20 }} />} hoverColor="#E1306C" />
                    <SocialLink href={facebookUrl}  label="Facebook"  icon={<FacebookIcon  sx={{ fontSize: 20 }} />} hoverColor="#1877F2" />
                    <SocialLink href={tiktokUrl}    label="TikTok"    icon={<TikTokIcon size={20} />}                 hoverColor="#111" />
                  </Box>
                )}
                {hasStaffSocial && (
                  <Box>
                    <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", mb: 1 }}>
                      Follow me
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {staffInstagram && <SocialLink href={staffInstagram} label="Instagram" icon={<InstagramIcon sx={{ fontSize: 20 }} />} hoverColor="#E1306C" />}
                      {staffFacebook  && <SocialLink href={staffFacebook}  label="Facebook"  icon={<FacebookIcon  sx={{ fontSize: 20 }} />} hoverColor="#1877F2" />}
                      {staffTiktok    && <SocialLink href={staffTiktok}    label="TikTok"    icon={<TikTokIcon size={20} />}                 hoverColor="#111" />}
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {/* CTA */}
            <Button
              variant="contained"
              size="large"
              onClick={scrollToBooking}
              sx={{
                bgcolor: brandColor, color: btnText,
                px: { xs: 6, md: 5 }, py: 1.6,
                borderRadius: "4px", fontSize: "0.78rem", fontWeight: 900, letterSpacing: "0.18em",
                width: { xs: "100%", sm: "auto" }, maxWidth: { xs: 380, sm: "none" },
                boxShadow: `0 8px 24px ${alpha(brandColor, 0.3)}`,
                "&:hover": { bgcolor: brandColor, filter: "brightness(1.08)", boxShadow: `0 12px 32px ${alpha(brandColor, 0.4)}` },
              }}
            >
              {heroCtaText}
            </Button>
          </Box>

        </Box>
      </Box>

      {/* ── Stats bar ── */}
      {statBar && (
        <Box sx={{
          bgcolor: "#111",
          borderTop: `3px solid ${brandColor}`,
          py: { xs: 4, md: 5 }, px: 2,
        }}>
          <Box sx={{ maxWidth: 900, mx: "auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 3 }}>
            {statBar.map((s, i) => s.num ? (
              <Box key={i} sx={{ textAlign: "center" }}>
                <Typography sx={{ fontFamily: "'Playfair Display', serif", fontSize: { xs: "2rem", md: "2.6rem" }, fontWeight: 900, color: brandColor, lineHeight: 1 }}>
                  {s.num}
                </Typography>
                <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", mt: 0.75 }}>
                  {s.label}
                </Typography>
              </Box>
            ) : null)}
          </Box>
        </Box>
      )}


      {/* ── Booking section ── */}
      <Box id="booking-section" sx={{
        bgcolor: "#f8f7f4",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        py: { xs: 8, md: 12 },
      }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 7, textAlign: "center" }}>
            <Typography sx={{
              fontSize: "0.62rem", fontWeight: 800,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: brandColor, display: "block", mb: 2,
            }}>
              AVAILABILITY
            </Typography>
            <Typography variant="h3" sx={{
              fontFamily: "'Playfair Display', serif",
              color: "#111",
              fontWeight: 700,
              fontSize: { xs: "2rem", md: "2.8rem" },
            }}>
              Book Your Appointment
            </Typography>
            <Box sx={{
              width: 40, height: 3, bgcolor: brandColor, borderRadius: 2,
              mx: "auto", mt: 2.5,
            }} />
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


    </Box>
  );
}
