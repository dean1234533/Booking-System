import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Container, Typography, Button } from "@mui/material";
import { alpha } from "@mui/material/styles";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LocationOnIcon from "@mui/icons-material/LocationOn";

import SlotPicker from "../components/SlotPicker";
import { useSlots } from "../hooks/useSlots";
import { getWhatsAppBookingUrl } from "../utils/whatsapp";
import { formatCurrency } from "../stripe/formatters";

// The public page for "Basic" plan accounts (£5/mo, booking only, no
// hosted marketing site) — same visual language as BarberProfile.jsx (brand
// strip, hero, services list, booking section) but without the gallery,
// team grid, stat strip, or reviews sections — those aren't part of what Basic
// pays for, and nothing in the dashboard collects that data for this tier.
export default function MinimalBookingPage({ tenant }) {
  const navigate = useNavigate();
  const [showAllServices, setShowAllServices] = useState(false);
  const id = tenant?.id || tenant?.uid;
  const brandColor = tenant?.brandColor || "#2563EB";
  const businessName = tenant?.businessName || tenant?.name || "Book an appointment";
  const heroTagline = tenant?.heroTagline || "Book Online";
  const heroCtaText = tenant?.heroCtaText || "BOOK APPOINTMENT";
  const heroImage = tenant?.heroImage || tenant?.logoUrl || "";
  const aboutBody = tenant?.aboutBody || tenant?.aboutUs || "";
  const city = tenant?.city || tenant?.location || "";
  const services = Array.isArray(tenant?.services) ? tenant.services.filter(s => s?.name) : [];
  const visibleSvcs = showAllServices ? services : services.slice(0, 5);

  const { slots, loading: slotsLoading, error: slotsError } = useSlots(id);
  const whatsappUrl = tenant?.whatsappBookingEnabled !== false
    ? getWhatsAppBookingUrl(tenant?.whatsappNumber, businessName)
    : null;

  function handleSlotSelect(slot) {
    navigate(`/book/${id}/${slot.id}?isStaff=false&shopId=${id}`, {
      state: { tenant },
    });
  }

  const scrollToBooking = () =>
    document.getElementById("barber-section")?.scrollIntoView({ behavior: "smooth" });

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fff", color: "#111" }}>
      {/* 4px brand strip */}
      <Box sx={{ height: 4, bgcolor: brandColor }} />

      {/* ── Hero ── */}
      <Box sx={{
        // TenantNav (App.jsx) is a fixed floating bar meant to sit over a
        // big hero image on the full templates — clear it the same way.
        pt: { xs: "calc(104px + env(safe-area-inset-top, 0px))", md: 10 },
        pb: { xs: 6, md: 8 },
        px: { xs: 2.5, sm: 4, md: 6 },
      }}>
        <Box sx={{
          width: "100%", maxWidth: 1120, mx: "auto",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: heroImage ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 680px)" },
          justifyContent: "center", alignItems: "start", gap: { xs: 5, md: 7 },
        }}>
          {heroImage && (
            <Box
              component="img" src={heroImage} alt={`${businessName} — book an appointment`}
              sx={{
                width: "100%", height: { xs: 320, sm: 420, md: 560 },
                objectFit: "cover", objectPosition: "center",
                borderRadius: 2, boxShadow: "0 24px 60px rgba(0,0,0,0.16)",
              }}
            />
          )}

          <Box sx={{ textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
              <Box sx={{ width: 28, height: 2, bgcolor: brandColor }} />
              <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: brandColor }}>
                {heroTagline}
              </Typography>
            </Box>

            <Typography sx={{
              fontFamily: "'Playfair Display', serif", fontWeight: 900, lineHeight: 1,
              fontSize: { xs: "2.4rem", sm: "3rem", md: "3.4rem" }, color: "#111", mb: city ? 1 : 2.5,
            }}>
              {businessName}
            </Typography>

            {city && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 2.5 }}>
                <LocationOnIcon sx={{ fontSize: 16, color: "rgba(0,0,0,0.4)" }} />
                <Typography sx={{ fontSize: "0.85rem", color: "rgba(0,0,0,0.5)", fontWeight: 500 }}>
                  {city}
                </Typography>
              </Box>
            )}

            <Typography sx={{
              color: aboutBody ? "#666" : "rgba(0,0,0,0.25)",
              lineHeight: 1.85, fontSize: "0.95rem", fontWeight: 300,
              mb: 3.5, maxWidth: 440,
              borderLeft: `2px solid ${brandColor}`, pl: 2,
              fontStyle: aboutBody ? "normal" : "italic",
            }}>
              {aboutBody || "No bio added yet."}
            </Typography>

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

            <Button
              variant="contained" size="large" onClick={scrollToBooking}
              sx={{
                bgcolor: brandColor, color: "#fff",
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

      {/* ── Booking section ── */}
      <Box id="barber-section" sx={{ bgcolor: "#f8f7f4", borderTop: "1px solid rgba(0,0,0,0.06)", py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 7, textAlign: "center" }}>
            <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: brandColor, display: "block", mb: 2 }}>
              AVAILABILITY
            </Typography>
            <Typography variant="h3" sx={{ fontFamily: "'Playfair Display', serif", color: "#111", fontWeight: 700, fontSize: { xs: "2rem", md: "2.8rem" } }}>
              Book Your Appointment
            </Typography>
            <Box sx={{ width: 40, height: 3, bgcolor: brandColor, borderRadius: 2, mx: "auto", mt: 2.5 }} />
          </Box>

          <SlotPicker
            slots={slots}
            loading={slotsLoading}
            error={slotsError}
            brandColor={brandColor}
            onSelect={handleSlotSelect}
          />

          {whatsappUrl && (
            <Box sx={{ textAlign: "center", mt: 3 }}>
              <Box
                component="a" href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                sx={{
                  display: "inline-flex", alignItems: "center", gap: 1,
                  px: 3, py: 1.25, border: "1px solid #25D36680", borderRadius: 1,
                  color: "#25D366", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none",
                }}
              >
                Or book via WhatsApp
              </Box>
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  );
}
