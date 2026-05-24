import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardActionArea, CardMedia, CardContent, Typography, Box, Avatar, Stack } from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn"; 
import InfoIcon from "@mui/icons-material/Info";
import { formatCurrency } from "../stripe/formatters";

export default function BarberCard({ barber, isMarketplace }) {
  const navigate = useNavigate();
  
  if (!barber || (!barber.id && !barber.uid) || (!barber.name && !barber.businessName)) {
    return null;
  }
  
  const depositValue = Number(barber?.depositAmount) || 10;
  const brandColor = barber?.brandColor || "#C9A84C";
  const businessType = barber?.businessType || "barber";
  
  const displayName = isMarketplace 
    ? (barber?.businessName || barber?.name || "Premium Shop")
    : (barber?.name?.split(" ")[0] || "Professional");

  const shopLogo = isMarketplace ? (barber?.businessLogo || barber?.logoUrl) : null;
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
      brandColor: brandColor
    };

    const targetCustomDomain = barber.customDomain || barber.vercelUrl;
    
    if (isMarketplace && targetCustomDomain) {
      const secureUrl = targetCustomDomain.startsWith('http') ? targetCustomDomain : `https://${targetCustomDomain}`;
      window.location.href = secureUrl;
      return;
    }

    let path = "";
    if (isMarketplace) {
      // 🌟 UPDATED: Routing logic now recognizes decorators
      if (businessType === "decorator") {
        path = `/decorator/${id}`;
      } else if (businessType === "trainer") {
        path = `/pt-booking/${id}`;
      } else {
        path = `/shop/${id}`;
      }
    } else {
      path = `/barber/${id}`;
    }

    navigate(path, { state: { tenant: brandingData, shopId: barber.shopId } });
  };

  // ── Dynamic industry-specific badging ──
  const getOverlineText = () => {
    if (isMarketplace) {
      if (businessType === "decorator") return "Featured Decorator";
      if (businessType === "trainer") return "Featured Trainer";
      return "Featured Shop";
    }
    return businessType === "barber" ? "Professional Barber" : "Professional Service";
  };

  // ── Dynamic action label ──
  const getActionLabel = () => {
    if (isMarketplace) {
      return businessType === "barber" ? "VIEW SHOP →" : "VIEW PORTFOLIO →";
    }
    return "BOOK NOW →";
  };

  return (
    <Card 
      sx={{ 
        height: "100%", 
        display: "flex", 
        flexDirection: "column", 
        borderRadius: 4, 
        overflow: "hidden",
        transition: "all 0.3s ease", 
        border: "1px solid", 
        borderColor: brandColor,
        "&:hover": { 
          transform: "translateY(-8px)", 
          boxShadow: `0 20px 40px ${brandColor}25` 
        }
      }}
    >
      <CardActionArea onClick={handleNavigation} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        
        <Box sx={{ position: 'relative' }}>
          {cardImage ? (
            <CardMedia 
              component="img" 
              height="280" 
              image={cardImage} 
              alt={displayName} 
              sx={{ objectFit: "cover", objectPosition: "center" }} 
            />
          ) : (
            <Box height={280} display="flex" alignItems="center" justifyContent="center" sx={{ bgcolor: 'grey.100' }}>
              <Avatar sx={{ width: 80, height: 80, bgcolor: brandColor, fontSize: 32, fontWeight: 800 }}>
                {displayName?.[0]?.toUpperCase() || "B"}
              </Avatar>
            </Box>
          )}

          {shopLogo && isMarketplace && (
            <Avatar 
              src={shopLogo}
              sx={{ 
                position: 'absolute', 
                bottom: -20, 
                left: 20, 
                width: 60, 
                height: 60, 
                border: `4px solid ${brandColor}`, 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                bgcolor: 'white'
              }}
            />
          )}
        </Box>

        <CardContent sx={{ flex: 1, p: 3, pt: (shopLogo && isMarketplace) ? 4 : 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Typography variant="overline" color={brandColor} fontWeight={700} sx={{ display: 'block' }}>
              {getOverlineText()}
            </Typography>
          </Box>

          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            {displayName}
          </Typography>

          <Stack spacing={1} mb={2}>
            {isMarketplace && barber.address && (
              <Box display="flex" alignItems="flex-start" gap={1} color="text.secondary">
                <LocationOnIcon sx={{ fontSize: 18, color: brandColor, mt: 0.2 }} />
                <Typography variant="caption" fontWeight={600} sx={{ lineHeight: 1.4 }}>
                  {barber.address}
                </Typography>
              </Box>
            )}

            <Box display="flex" alignItems="flex-start" gap={1} color="text.secondary">
              <InfoIcon sx={{ fontSize: 18, color: brandColor, mt: 0.2 }} />
              <Typography 
                variant="body2" 
                sx={{ 
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.5,
                  fontSize: '0.85rem'
                }}
              >
                {isMarketplace 
                  ? (barber.aboutUs || barber.about || barber.businessAbout || `Professional ${businessType} services available.`)
                  : (barber.bio || `Providing professional tailored services.`)
                }
              </Typography>
            </Box>
          </Stack>

          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} pt={2} sx={{ borderTop: '1px solid #eee' }}>
            <Box>
              {!isMarketplace && (
                <>
                  <Typography variant="caption" display="block" color="text.secondary" fontWeight={600}>DEPOSIT</Typography>
                  <Typography variant="body2" fontWeight={900}>{formatCurrency(depositValue)}</Typography>
                </>
              )}
            </Box>
            <Typography variant="caption" fontWeight={900} sx={{ color: brandColor }}>
              {getActionLabel()}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}