import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardActionArea, CardMedia, Typography, Box, Avatar } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import { formatCurrency } from "../stripe/formatters";
import { getPlumberTradeLabel } from "../utils/tradeJobs";
import { heroForProfile } from "../data/demoPortfolios";

const SERIF = "'Playfair Display', serif";
const SANS  = "'DM Sans', sans-serif";

const MARKETPLACE_PALETTES = {
  barber: {
    accent: "#4F46E5",
    surface: "#F1F2FF",
    imageSurface: "#DFE2FF",
    border: "#C9CDFD",
    ink: "#24205B",
  },
  hairdresser: {
    accent: "#B4237A",
    surface: "#FCF0F7",
    imageSurface: "#F5D9E9",
    border: "#EBC2DA",
    ink: "#4A1636",
  },
  decorator: {
    accent: "#C2410C",
    surface: "#FFF4ED",
    imageSurface: "#FDE4D3",
    border: "#F5C7A8",
    ink: "#4A1D0B",
  },
  trainer: {
    accent: "#0F766E",
    surface: "#ECF8F6",
    imageSurface: "#D2EFEB",
    border: "#AFDED8",
    ink: "#153F3B",
  },
  plumber: {
    accent: "#155EEF",
    surface: "#F1F5FB",
    imageSurface: "#DCE7F5",
    border: "#C7D7EB",
    ink: "#102A43",
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
  const savedCardImage = isMarketplace
    ? (barber?.heroImage || barber?.logoUrl || barber?.profilePic)
    : (barber?.profilePic || barber?.heroImage || barber?.logoUrl);
  const cardImage = heroForProfile(barber, savedCardImage);

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

    // A claimed booking-link slug is the canonical URL once one exists —
    // prefer it over the raw ID-based route so clicking a card never bounces
    // an owner (or their customers) off their branded link onto /shop/{id}.
    // Full page navigation, not client-side navigate(): identifyTenant's
    // slug lookup is async, and a client-side route change to /:bookingSlug
    // renders before it resolves, so the route's "not found yet" fallback
    // immediately bounces back to "/". A full load has no such race.
    // Keep local previews on the local origin so card clicks show the build
    // currently being reviewed. On a custom domain, continue sending visitors
    // to Bookrightly's canonical host so the slug always resolves correctly.
    if (isMarketplace && barber.bookingSlug) {
      const host = window.location.hostname.toLowerCase();
      const isLocalPreview = host === "localhost" || host === "127.0.0.1" || host === "::1";
      const isBookrightlyHost = host === "bookrightly.co.uk" || host.endsWith(".bookrightly.co.uk");
      const bookingOrigin = (isLocalPreview || isBookrightlyHost)
        ? window.location.origin
        : "https://bookrightly.co.uk";
      window.location.href = `${bookingOrigin}/${barber.bookingSlug}`;
      return;
    }

    let path = "";
    if (isMarketplace) {
      if (businessType === "decorator")      path = `/decorator/${id}`;
      else if (businessType === "trainer")   path = `/pt-booking/${id}`;
      else if (businessType === "hairdresser") path = `/hairdresser/${id}`;
      else if (businessType === "plumber")   path = `/plumber/${id}`;
      else                                   path = `/shop/${id}`;
    } else {
      path = `/barber/${id}`;
    }
    if (isMarketplace) {
      // A full navigation lets AppShell resolve the tenant before the public
      // template mounts. Client-side navigation could render the template with
      // a null profile on its first frame, leaving a white screen until refresh.
      // Absolute, same reasoning as the bookingSlug branch above — the
      // marketplace grid isn't always viewed from bookrightly.co.uk itself.
      window.location.href = `https://bookrightly.co.uk${path}`;
      return;
    }
    navigate(path, { state: { tenant: brandingData, shopId: barber.shopId } });
  };

  const getBadgeLabel = () => {
    if (isMarketplace) {
      if (businessType === "decorator")    return "Decorator";
      if (businessType === "trainer")      return "Personal Trainer";
      if (businessType === "hairdresser")  return "Hair Salon";
      if (businessType === "plumber")      return getPlumberTradeLabel(barber.serviceCategories);
      return "Barber Shop";
    }
    return businessType === "barber" ? "Barber" : "Professional";
  };

  return (
    <Card sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      borderRadius: "22px",
      overflow: "hidden",
      bgcolor: cardSurface,
      boxShadow: "none",
      border: `1px solid ${cardBorder}`,
      position: "relative",
      transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1)",
      "&:hover": {
        transform: "translateY(-5px)",
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
        <Box sx={{ position: "relative", m: 1, height: 238, bgcolor: imageSurface, flexShrink: 0, overflow: "hidden", borderRadius: "15px" }}>
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
            maxWidth: "calc(100% - 28px)",
          }}>
            <Typography sx={{
              fontFamily: SANS, fontSize: "0.55rem", fontWeight: 750,
              color: "#fff", letterSpacing: "0.055em", textTransform: "uppercase", lineHeight: 1.4,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {getBadgeLabel()}
            </Typography>
          </Box>

          {/* Demo badge — top-right */}
          {barber.isDemo && (
            <Box sx={{
              position: "absolute", bottom: 14, right: 14, zIndex: 2,
              bgcolor: "rgba(255,255,255,.94)", backdropFilter: "blur(6px)",
              px: 1.15, py: 0.45, borderRadius: 99,
              border: "1px solid rgba(255,255,255,.7)",
              boxShadow: "0 2px 8px rgba(16,24,40,.14)",
            }}>
              <Typography sx={{
                fontFamily: SANS, fontSize: "0.55rem", fontWeight: 800,
                color: "#344054", letterSpacing: "0.1em",
                textTransform: "uppercase", lineHeight: 1.4,
              }}>
                Demo
              </Typography>
            </Box>
          )}

          {/* Shop logo avatar — skipped when it's the same image already
              filling the card (a business with only a logo and no separate
              hero/cover photo falls back to using the logo as cardImage
              above, so showing it again here would just duplicate it). */}
          {shopLogo && isMarketplace && shopLogo !== cardImage && (
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
            fontFamily: SANS, fontWeight: 850,
            fontSize: "1.25rem", color: cardInk,
            lineHeight: 1.2, mb: .7,
          }}>
            {displayName}
          </Typography>

          {isMarketplace && barber.specialty && (
            <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", fontWeight: 700, color: accentColor, letterSpacing: "0.04em", mb: 0.75 }}>
              {barber.specialty}
            </Typography>
          )}

          {isMarketplace && (barber.address || barber.distanceLabel) && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
              <LocationOnIcon sx={{ fontSize: 13, color: accentColor, flexShrink: 0 }} />
              <Typography sx={{ fontFamily: SANS, fontSize: "0.75rem", color: "#7a7060", fontWeight: 500, lineHeight: 1.3 }}>
                {barber.address}
                {barber.address && barber.distanceLabel && " · "}
                {barber.distanceLabel && (
                  <Box component="span" sx={{ color: accentColor, fontWeight: 700 }}>{barber.distanceLabel}</Box>
                )}
              </Typography>
            </Box>
          )}
            </Box>
            <Box sx={{ width: 42, height: 42, borderRadius: "50%", bgcolor: accentColor, color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}><ArrowOutwardIcon sx={{ fontSize: 20 }} /></Box>
          </Box>

          {!isMarketplace && (
            <Typography sx={{
              fontFamily: SANS, fontSize: "0.78rem", fontWeight: 400,
              color: "#5a5248", lineHeight: 1.7, flex: 1, mb: 2,
            }}>
              {barber.bio || barber.aboutBody || "Providing professional tailored services."}
            </Typography>
          )}

          {isMarketplace && <Box sx={{ flex: 1, minHeight: 12 }} />}

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
