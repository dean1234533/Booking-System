import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardActionArea, CardMedia, Typography, Box, Avatar } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import { formatCurrency } from "../stripe/formatters";

const SERIF = "'Playfair Display', serif";
const SANS  = "'DM Sans', sans-serif";

const MARKETPLACE_PALETTES = {
  barber: {
    accent: "#2563EB",
    surface: "#EAF2FF",
    imageSurface: "#D6E7FF",
    border: "#B8D4FA",
    ink: "#171B3D",
  },
  hairdresser: {
    accent: "#0EA5E9",
    surface: "#E7F3FF",
    imageSurface: "#CFE8FF",
    border: "#B7DAF5",
    ink: "#2D183E",
  },
  decorator: {
    accent: "#D95B47",
    surface: "#FBE9E4",
    imageSurface: "#F3D3CB",
    border: "#EBC1B7",
    ink: "#391B17",
  },
  trainer: {
    accent: "#2D72A8",
    surface: "#E2EEF7",
    imageSurface: "#CDE2F0",
    border: "#B8D2E5",
    ink: "#132D42",
  },
};

export default function BarberCard({ barber, isMarketplace }) {
  const navigate = useNavigate();

  if (!barber || (!barber.id && !barber.uid) || (!barber.name && !barber.businessName)) {
    return null;
  }

  const depositValue  = Number(barber?.depositAmount) || 10;
  const brandColor    = barber?.brandColor || "#2563EB";
  const businessType  = barber?.businessType || "barber";
  const marketplacePalette = MARKETPLACE_PALETTES[businessType] || MARKETPLACE_PALETTES.barber;
  const accentColor = isMarketplace ? marketplacePalette.accent : brandColor;
  const cardSurface = isMarketplace ? marketplacePalette.surface : "#f4f1e9";
  const imageSurface = isMarketplace ? marketplacePalette.imageSurface : "#dfe1e7";
  const cardBorder = isMarketplace ? marketplacePalette.border : "#dcd8ce";
  const cardInk = isMarketplace ? marketplacePalette.ink : "#0d0d0d";

  const displayName = isMarketplace
    ? (barber?.businessName || barber?.name || "Premium Shop")
    : (barber?.name?.split(" ")[0] || "Professional");

  const shopLogo  = isMarketplace ? (barber?.businessLogo || barber?.logoUrl) : null;
  const cardImage = isMarketplace
    ? (barber?.heroImage || barber?.logoUrl || barber?.profilePic)
    : (barber?.profilePic || barber?.heroImage || barber?.logoUrl);

  const handleNavigation = () => {
    const id = barber.id || barber.uid;
    const brandingData = {
      ...barber,
      id: barber.shopId || barber.id,
      businessName: barber?.businessName || "Premium Shop",
      businessLogo: barber?.businessLogo || barber?.logoUrl,
      brandColor,
    };

    const targetCustomDomain = barber.customDomain || barber.vercelUrl;
    if (isMarketplace && targetCustomDomain) {
      const secureUrl = targetCustomDomain.startsWith("http") ? targetCustomDomain : `https://${targetCustomDomain}`;
      window.location.href = secureUrl;
      return;
    }

    let path = "";
    if (isMarketplace) {
      if (businessType === "decorator")      path = `/decorator/${id}`;
      else if (businessType === "trainer")   path = `/pt-booking/${id}`;
      else if (businessType === "hairdresser") path = `/hairdresser/${id}`;
      else                                   path = `/shop/${id}`;
    } else {
      path = `/barber/${id}`;
    }
    navigate(path, { state: { tenant: brandingData, shopId: barber.shopId } });
  };

  const getBadgeLabel = () => {
    if (isMarketplace) {
      if (businessType === "decorator")    return "Decorator";
      if (businessType === "trainer")      return "Personal Trainer";
      if (businessType === "hairdresser")  return "Hair Salon";
      return "Barber Shop";
    }
    return businessType === "barber" ? "Barber" : "Professional";
  };

  return (
    <Card sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      borderRadius: "28px 28px 28px 8px",
      overflow: "hidden",
      bgcolor: cardSurface,
      boxShadow: "none",
      border: `1px solid ${cardBorder}`,
      position: "relative",
      transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1)",
      "&:hover": {
        transform: "translateY(-5px) rotate(-.25deg)",
        boxShadow: "0 24px 54px rgba(16,17,22,0.14)",
      },
      "&::after": {
        content: '\"\"',
        position: "absolute",
        left: 18,
        right: 18,
        bottom: 0,
        height: 5,
        borderRadius: "8px 8px 0 0",
        bgcolor: accentColor,
      },
    }}>
      <CardActionArea onClick={handleNavigation} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch" }}>

        {/* Image area */}
        <Box sx={{ position: "relative", m: 1, height: 238, bgcolor: imageSurface, flexShrink: 0, overflow: "hidden", borderRadius: "22px 22px 8px 22px" }}>
          {cardImage ? (
            <CardMedia
              component="img"
              image={cardImage}
              alt={displayName}
              sx={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: barber?.businessType === "decorator" ? "top" : "center" }}
            />
          ) : (
            <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Avatar sx={{ width: 72, height: 72, bgcolor: accentColor, fontSize: 28, fontWeight: 800, fontFamily: SERIF }}>
                {displayName?.[0]?.toUpperCase() || "B"}
              </Avatar>
            </Box>
          )}

          {/* Image gradient */}
          <Box sx={{
            position: "absolute", inset: 0,
            background: "linear-gradient(145deg, transparent 35%, rgba(8,9,13,.72) 100%)",
            pointerEvents: "none",
          }} />

          {/* Category badge — top-left on image */}
          <Box sx={{
            position: "absolute", top: 14, left: 14, zIndex: 2,
            bgcolor: accentColor, px: 1.5, py: 0.55, borderRadius: 99,
          }}>
            <Typography sx={{
              fontFamily: SANS, fontSize: "0.58rem", fontWeight: 700,
              color: "#fff", letterSpacing: "0.11em", textTransform: "uppercase", lineHeight: 1.4,
            }}>
              {getBadgeLabel()}
            </Typography>
          </Box>

          {/* Demo badge — top-right */}
          {barber.isDemo && (
            <Box sx={{
              position: "absolute", top: 14, right: 14, zIndex: 2,
              bgcolor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
              px: 1.2, py: 0.35, borderRadius: "2px",
              border: "1px solid rgba(255,255,255,0.18)",
            }}>
              <Typography sx={{
                fontFamily: SANS, fontSize: "0.55rem", fontWeight: 700,
                color: "rgba(255,255,255,0.75)", letterSpacing: "0.18em",
                textTransform: "uppercase", lineHeight: 1.4,
              }}>
                Demo
              </Typography>
            </Box>
          )}

          {/* Shop logo avatar */}
          {shopLogo && isMarketplace && (
            <Avatar
              src={shopLogo}
              alt={`${displayName} logo`}
              sx={{
                position: "absolute", bottom: 14, left: 14,
                width: 48, height: 48, zIndex: 2,
                border: `3px solid ${cardSurface}`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                bgcolor: "#fff",
              }}
            />
          )}
        </Box>

        {/* Content */}
        <Box sx={{
          flex: 1,
          p: 2.5,
          pt: 1.75,
          display: "flex",
          flexDirection: "column",
          bgcolor: cardSurface,
        }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
          <Typography sx={{
            fontFamily: SERIF, fontWeight: 500,
            fontSize: "1.42rem", color: cardInk,
            lineHeight: 1.15, mb: .7,
          }}>
            {displayName}
          </Typography>

          {isMarketplace && barber.specialty && (
            <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", fontWeight: 700, color: accentColor, letterSpacing: "0.04em", mb: 0.75 }}>
              {barber.specialty}
            </Typography>
          )}

          {isMarketplace && barber.address && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
              <LocationOnIcon sx={{ fontSize: 13, color: accentColor, flexShrink: 0 }} />
              <Typography sx={{ fontFamily: SANS, fontSize: "0.75rem", color: "#7a7060", fontWeight: 500, lineHeight: 1.3 }}>
                {barber.address}
              </Typography>
            </Box>
          )}
            </Box>
            <Box sx={{ width: 42, height: 42, borderRadius: "50%", bgcolor: accentColor, color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}><ArrowOutwardIcon sx={{ fontSize: 20 }} /></Box>
          </Box>

          <Typography sx={{
            fontFamily: SANS, fontSize: "0.78rem", fontWeight: 400,
            color: "#5a5248", lineHeight: 1.7,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            flex: 1,
            mb: 2,
          }}>
            {isMarketplace
              ? (barber.aboutUs || barber.about || barber.businessAbout || barber.aboutBody || barber.aboutUs || barber.specialty || `Professional ${businessType} services available.`)
              : (barber.bio || barber.aboutBody || "Providing professional tailored services.")
            }
          </Typography>

          {/* Footer row */}
          <Box sx={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            pt: 1.6, pb: 0.5, borderTop: `1px solid ${cardBorder}`,
          }}>
            {!isMarketplace ? (
              <Box>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.58rem", fontWeight: 700, color: "#b0a898", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Deposit
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.95rem", fontWeight: 800, color: "#0d0d0d" }}>
                  {formatCurrency(depositValue)}
                </Typography>
              </Box>
            ) : <Typography sx={{ fontFamily: SANS, fontSize: ".68rem", fontWeight: 800, color: "#716d65" }}>BOOKABLE ONLINE</Typography>}
            <Typography sx={{ fontFamily: SANS, fontSize: ".68rem", fontWeight: 900, color: accentColor, letterSpacing: ".08em" }}>EXPLORE</Typography>
          </Box>
        </Box>

      </CardActionArea>
    </Card>
  );
}
