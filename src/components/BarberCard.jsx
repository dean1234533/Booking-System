import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardActionArea, CardMedia, CardContent, Typography, Box, Avatar } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { formatCurrency } from "../stripe/formatters";

const SERIF = "'Playfair Display', serif";
const SANS  = "'DM Sans', sans-serif";

export default function BarberCard({ barber, isMarketplace }) {
  const navigate = useNavigate();

  if (!barber || (!barber.id && !barber.uid) || (!barber.name && !barber.businessName)) {
    return null;
  }

  const depositValue  = Number(barber?.depositAmount) || 10;
  const brandColor    = barber?.brandColor || "#C9A84C";
  const businessType  = barber?.businessType || "barber";

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

  const getActionLabel = () => {
    if (isMarketplace) {
      return businessType === "barber" ? "VIEW SHOP →" : "VIEW PORTFOLIO →";
    }
    return "BOOK NOW →";
  };

  return (
    <Card sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      borderRadius: 0,
      overflow: "hidden",
      border: "none",
      boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 6px 20px rgba(0,0,0,0.06)",
      transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1)",
      "&:hover": {
        transform: "translateY(-6px)",
        boxShadow: "0 14px 44px rgba(0,0,0,0.14)",
      },
    }}>
      <CardActionArea onClick={handleNavigation} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch" }}>

        {/* Image area */}
        <Box sx={{ position: "relative", height: 256, bgcolor: "#f0ece4", flexShrink: 0 }}>
          {cardImage ? (
            <CardMedia
              component="img"
              image={cardImage}
              alt={displayName}
              sx={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: barber?.businessType === "decorator" ? "top" : "center" }}
            />
          ) : (
            <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Avatar sx={{ width: 72, height: 72, bgcolor: brandColor, fontSize: 28, fontWeight: 800, fontFamily: SERIF }}>
                {displayName?.[0]?.toUpperCase() || "B"}
              </Avatar>
            </Box>
          )}

          {/* Image gradient */}
          <Box sx={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.06) 45%, transparent 100%)",
            pointerEvents: "none",
          }} />

          {/* Category badge — top-left on image */}
          <Box sx={{
            position: "absolute", top: 14, left: 14, zIndex: 2,
            bgcolor: brandColor, px: 1.5, py: 0.4,
          }}>
            <Typography sx={{
              fontFamily: SANS, fontSize: "0.58rem", fontWeight: 700,
              color: "#0d0d0d", letterSpacing: "0.15em", textTransform: "uppercase", lineHeight: 1.4,
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
                position: "absolute", bottom: -20, left: 18,
                width: 52, height: 52, zIndex: 2,
                border: "3px solid #fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                bgcolor: "#fff",
              }}
            />
          )}
        </Box>

        {/* Content */}
        <CardContent sx={{
          flex: 1,
          p: 3,
          pt: shopLogo && isMarketplace ? "32px" : "22px",
          display: "flex",
          flexDirection: "column",
          bgcolor: "#fff",
        }}>
          <Typography sx={{
            fontFamily: SERIF, fontWeight: 400,
            fontSize: "1.15rem", color: "#0d0d0d",
            lineHeight: 1.25, mb: 1,
          }}>
            {displayName}
          </Typography>

          {isMarketplace && barber.specialty && (
            <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", fontWeight: 500, color: brandColor, letterSpacing: "0.04em", mb: 0.75 }}>
              {barber.specialty}
            </Typography>
          )}

          {isMarketplace && barber.address && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
              <LocationOnIcon sx={{ fontSize: 13, color: brandColor, flexShrink: 0 }} />
              <Typography sx={{ fontFamily: SANS, fontSize: "0.75rem", color: "#7a7060", fontWeight: 500, lineHeight: 1.3 }}>
                {barber.address}
              </Typography>
            </Box>
          )}

          <Typography sx={{
            fontFamily: SANS, fontSize: "0.83rem", fontWeight: 300,
            color: "#5a5248", lineHeight: 1.7,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            flex: 1,
            mb: 2.5,
          }}>
            {isMarketplace
              ? (barber.aboutUs || barber.about || barber.businessAbout || barber.aboutBody || barber.aboutUs || barber.specialty || `Professional ${businessType} services available.`)
              : (barber.bio || barber.aboutBody || "Providing professional tailored services.")
            }
          </Typography>

          {/* Footer row */}
          <Box sx={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            pt: 2, borderTop: "1px solid #f0ece4",
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
            ) : <Box />}
            <Typography sx={{
              fontFamily: SANS, fontSize: "0.7rem", fontWeight: 700,
              color: brandColor, letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              {getActionLabel()}
            </Typography>
          </Box>
        </CardContent>

      </CardActionArea>
    </Card>
  );
}
