import React, { useEffect, useState } from "react";
import { getFontFamily, loadGoogleFont } from "../utils/fontOptions";
import { 
  Box, Container, Typography, Grid, Paper, 
  Skeleton, Button, Divider, Stack, Avatar,
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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../firebase/config";
import { getShopStaff, getBarber } from "../firebase/firestore";
// ── TikTok SVG ────────────────────────────────────────────────────────────────
const TikTokIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ display: "block" }}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5
      2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27
      0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0
      6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z" />
  </svg>
);

 
// ── Social button (white variant for dark hero) ───────────────────────────────
function SocialButton({ href, label, icon, hoverColor }) {
  if (!href) return null;
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <Tooltip title={`Follow on ${label}`} arrow>
      <IconButton
        component="a" href={url} target="_blank" rel="noopener noreferrer"
        size="small"
        sx={{
          border: "1.5px solid rgba(255,255,255,0.4)",
          borderRadius: 2,
          color: "white",
          p: 1,
          transition: "all 0.2s",
          "&:hover": {
            borderColor: hoverColor,
            bgcolor: alpha(hoverColor, 0.25),
            transform: "translateY(-2px)",
          },
        }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}
 
export default function TenantHome({ tenant: initialTenant }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantId } = useParams();
  const theme = useTheme();
  
  // FIXED: Moved hook inside the component
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const [slideDir, setSlideDir] = useState("right");
  
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [freshTenant, setFreshTenant] = useState(initialTenant || location.state?.tenant);
  const [openPrivacy, setOpenPrivacy] = useState(false);
  const [openTerms, setOpenTerms] = useState(false);
 
  const fontKey     = freshTenant?.siteFont;
  const displayFont = getFontFamily(fontKey, "playfair");
  useEffect(() => { if (fontKey) loadGoogleFont(fontKey); }, [fontKey]);

  const isBarberShop    = !freshTenant?.businessType || freshTenant?.businessType === "barber";
  const brandColor      = freshTenant?.brandColor      || "#C9A84C";
  const businessName    = freshTenant?.businessName     || "TRIMZ"; 
  const address         = freshTenant?.address          || "Location TBD";
  const aboutBgColor    = freshTenant?.aboutSectionColor || "#111111";
  const trustBarBgColor = freshTenant?.trustBarColor    || "#000000";
 
  // ── Owner social links ────────────────────────────────────────────────────
  const ownerInstagram = freshTenant?.instagramUrl || "";
  const ownerTikTok    = freshTenant?.tiktokUrl    || "";
  const ownerFacebook  = freshTenant?.facebookUrl  || "";
  const ownerHasSocial = ownerInstagram || ownerTikTok || ownerFacebook;
  
  const getContrastText = (hexColor) => {
    if (!hexColor) return "#ffffff";
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness > 155 ? "#000000" : "#ffffff";
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
          const q = query(
            collection(db, "tenants"), 
            where("vercelUrl", "==", currentHost), 
            limit(1)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            activeTenantId = querySnapshot.docs[0].id;
            tenantBaseData = { id: activeTenantId, ...querySnapshot.docs[0].data() };
          }
        }
 
        if (!activeTenantId) { setLoading(false); return; }
 
        const [updatedOwnerData, staffMembers, reviewsSnap] = await Promise.all([
          getBarber(activeTenantId),
          getShopStaff(activeTenantId),
          getDocs(collection(db, "barbers", activeTenantId, "reviews"))
        ]);
        
        const fetchedReviews = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 
        const finalTenantData = {
          ...(updatedOwnerData || tenantBaseData),
          id: activeTenantId, 
          reviews: fetchedReviews
        };
 
        setFreshTenant(finalTenantData);
 
        // ── Owner object — passes through ALL their fields including social links ──
        const ownerObject = {
          ...finalTenantData,
          name:       finalTenantData.name || "Master Barber",
          profilePic: finalTenantData.profilePic || "", 
          isOwner:    true,
          shopId:     activeTenantId,
        };
 
        // ── Staff — inherit shop branding so BarberProfile gets correct colours
        const activeStaff = staffMembers
          .map(member => ({
            ...member,
            shopId:        activeTenantId,
            brandColor:    member.brandColor    || finalTenantData.brandColor    || "#C9A84C",
            businessName:  finalTenantData.businessName,
            businessLogo:  finalTenantData.businessLogo || finalTenantData.logoUrl,
          }))
          .filter(member => member.name);
 
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#000' }}>
        <CircularProgress sx={{ color: brandColor }} thickness={2} size={60} />
      </Box>
    );
  }
 
  return (
    <Box sx={{ bgcolor: "#FFFFFF", minHeight: "100vh", overflowX: 'hidden' }}>
      
      {/* ── 1. HERO ──────────────────────────────────────────────────────── */}
      {/* 100dvh = the real visible viewport on every device (handles mobile
          browser chrome), so the hero always fully covers the screen. */}
      <Box sx={{
        height: "100vh",
        minHeight: "100dvh",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url('${heroImageUrl}')`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        color: "white", textAlign: "center"
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'inline-block', 
            border: '1px solid rgba(255,255,255,0.3)', 
            px: 4, py: 1, mb: 4 
          }}>
            <Typography variant="overline" sx={{ letterSpacing: 6, color: "#fff", fontWeight: 400, fontSize: '0.8rem' }}>
              WELCOME TO
            </Typography>
          </Box>
          
          <Typography variant="h1" sx={{ 
            fontWeight: 400, 
            fontSize: { xs: '3.5rem', sm: '5rem', md: '7rem', lg: '8.5rem' }, 
            fontFamily: displayFont, 
            lineHeight: 1,
            mb: 2, 
            textTransform: 'uppercase',
            letterSpacing: { xs: -1, md: -2 }
          }}>
            {businessName}
          </Typography>
 
          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {[1,2,3,4,5].map(i => <StarIcon key={i} sx={{ color: brandColor, fontSize: 24, opacity: 0.8 }} />)}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              <Box sx={{ width: 40, height: '1px', bgcolor: 'rgba(255,255,255,0.4)' }} />
              <Typography sx={{ letterSpacing: { xs: 4, md: 8 }, fontWeight: 300, fontSize: '0.9rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>
                5.0/5.0 Top Rated Excellence
              </Typography>
              <Box sx={{ width: 40, height: '1px', bgcolor: 'rgba(255,255,255,0.4)' }} />
            </Box>
          </Box>
 
        </Container>
      </Box>
 
      {/* ── 1.5 TRUST SIGNAL BAR ─────────────────────────────────────────── */}
      <Box sx={{ bgcolor: trustBarBgColor, py: 4, borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
        <Container>
          <Grid container spacing={2} justifyContent="center">
            {[
              { icon: <VerifiedIcon />,          text: "LICENSED BARBERS" },
              { icon: <SanitizerIcon />,         text: "HYGIENE GUARANTEED" },
              { icon: <WorkspacePremiumIcon />,  text: "PREMIUM PRODUCTS" }
            ].map((signal, idx) => (
              <Grid item xs={12} md={4} key={idx}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ color: trustBarTextColor }}>
                  {React.cloneElement(signal.icon, { sx: { color: brandColor, fontSize: 22, opacity: 0.8 } })}
                  <Typography variant="subtitle2" fontWeight={400} sx={{ letterSpacing: 3, fontSize: '0.75rem' }}>
                    {signal.text}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
 
      {/* ── 2. FIND US & HOURS ───────────────────────────────────────────── */}
      <Container sx={{ mt: 10, mb: 15 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: { xs: 3, md: 6 }, borderRadius: 0, height: '100%', bgcolor: '#f9f9f9', border: '1px solid #eee' }}>
              <LocationOnIcon sx={{ color: brandColor, fontSize: 32, mb: 1 }} />
              <Typography variant="h5" sx={{ fontFamily: displayFont, mb: 2 }}>Visit Us</Typography>
              <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', minHeight: '3em', fontWeight: 300 }}>{address}</Typography>
             <Button 
    variant="outlined" 
    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)}
    sx={{ borderColor: 'black', color: 'black', fontWeight: 600, letterSpacing: 2, px: 4, py: 1.5, borderRadius: 0, '&:hover': { bgcolor: 'black', color: 'white' } }}
  >
    GET DIRECTIONS
  </Button>
            </Paper>
          </Grid>
 
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: { xs: 3, md: 6 }, borderRadius: 0, height: '100%', bgcolor: '#f9f9f9', border: '1px solid #eee' }}>
              <AccessTimeIcon sx={{ color: brandColor, fontSize: 32, mb: 1 }} />
              <Typography variant="h5" sx={{ fontFamily: displayFont, mb: 3 }}>Opening Hours</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {freshTenant?.hours ? (
                  ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day, i) => {
                    const dayData   = freshTenant?.hours?.[day] || freshTenant?.hours?.[day.toLowerCase()];
                    const isClosed = !dayData || dayData.isClosed || !dayData.open || !dayData.close;
                    const hourText = isClosed ? "Closed" : `${dayData.open} – ${dayData.close}`;
                    return (
                      <Box key={day}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography fontWeight={500} sx={{ letterSpacing: 1 }}>{day}</Typography>
                          <Typography variant="body2" fontWeight={300} color={isClosed ? 'error.main' : 'text.secondary'}>
                            {hourText}
                          </Typography>
                        </Box>
                        {i < 6 && <Divider sx={{ mt: 1.5, opacity: 0.5 }} />}
                      </Box>
                    );
                  })
                ) : (
                  <Typography variant="body1" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
                    {freshTenant?.openingHours || "Contact us for opening times"}
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
 
      {/* ── 3. ABOUT ─────────────────────────────────────────────────────── */}
      <Box sx={{ py: { xs: 12, md: 20 }, textAlign: 'center', backgroundColor: aboutBgColor, color: aboutTextColor }}>
        <Container maxWidth="md">
          <ContentCutIcon sx={{ color: brandColor, fontSize: 40, mb: 3, opacity: 0.6 }} />
          <Typography variant="h3" sx={{ fontFamily: displayFont, mb: 4, letterSpacing: 2 }}>
            Our Story
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 300, lineHeight: 2, opacity: 0.8, maxWidth: '750px', mx: 'auto', fontSize: '1.2rem' }}>
            {freshTenant?.aboutUs || `Welcome to ${businessName}. Share your mission, your craft, and what sets your business apart.`}
          </Typography>
        </Container>
      </Box>
 
      {/* ── 4. TEAM GRID ─────────────────────────────────────────────────── */}
      <Container id="barber-section" sx={{ py: 15 }}>
        <Box sx={{ mb: 10, textAlign: 'center' }}>
          <Typography variant="overline" sx={{ color: brandColor, fontWeight: 600, letterSpacing: 5 }}>EXPERTS</Typography>
          <Typography variant="h3" mt={1} mb={2} sx={{ fontFamily: displayFont }}>Our Master Barbers</Typography>
          <Box sx={{ width: 40, height: 2, bgcolor: brandColor, mx: 'auto' }} />
        </Box>
        
        <Grid container spacing={4}>
          {team.map(barber => {
            const depositValue   = Number(barber?.depositAmount) || 10;
            const cardColor      = barber?.brandColor || brandColor;
            const displayName    = barber?.name?.split(" ")[0] || "Professional";
            const cardImage      = barber?.profilePic || barber?.heroImage;
            const handleBooking  = () => navigate(
              `/barber/${barber.id || barber.uid}`,
              { state: { tenant: { ...barber, businessName: barber.name, businessLogo: barber.profilePic, brandColor } } }
            );
            return (
              <Grid item xs={12} sm={6} md={4} key={barber.id}>
                <Box
                  onClick={handleBooking}
                  sx={{
                    cursor: "pointer", bgcolor: "#111", overflow: "hidden",
                    transition: "box-shadow 0.3s ease",
                    "&:hover": { boxShadow: "0 20px 56px rgba(0,0,0,0.45)" },
                    "&:hover .staff-zoom": { transform: "scale(1.05)" },
                  }}
                >
                  {/* Brand accent bar */}
                  <Box sx={{ height: 3, bgcolor: cardColor }} />

                  {/* Portrait image */}
                  <Box sx={{ position: "relative", paddingTop: "115%", bgcolor: "#1a1a1a", overflow: "hidden" }}>
                    {cardImage ? (
                      <Box
                        className="staff-zoom"
                        component="img"
                        src={cardImage}
                        alt={displayName}
                        sx={{
                          position: "absolute", inset: 0,
                          width: "100%", height: "100%",
                          objectFit: "cover", objectPosition: "center top",
                          transition: "transform 0.5s ease",
                        }}
                      />
                    ) : (
                      <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Typography sx={{ fontFamily: displayFont, fontSize: "5rem", fontWeight: 400, color: cardColor, opacity: 0.4 }}>
                          {displayName[0]}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "35%", background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)" }} />
                  </Box>

                  {/* Content */}
                  <Box sx={{ p: 3 }}>
                    <Typography sx={{ fontFamily: displayFont, fontSize: "1.25rem", fontWeight: 400, color: "#fff", lineHeight: 1.2, mb: 0.5 }}>
                      {displayName}
                    </Typography>
                    <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: cardColor, mb: barber.bio ? 2 : 0 }}>
                      Professional Barber
                    </Typography>
                    {barber.bio && (
                      <Typography sx={{
                        fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", fontWeight: 300, lineHeight: 1.7,
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                        mt: 1.5,
                      }}>
                        {barber.bio}
                      </Typography>
                    )}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2.5, pt: 2.5, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      <Box>
                        <Typography sx={{ fontSize: "0.55rem", fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Deposit</Typography>
                        <Typography sx={{ fontSize: "0.92rem", fontWeight: 800, color: "#fff" }}>£{depositValue}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: cardColor, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        BOOK NOW →
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Container>
 
      {/* ── 5. REVIEWS ───────────────────────────────────────────────────────── */}
      <Box sx={{
        py: { xs: 10, md: 15 }, bgcolor: "#0d0d0d",
        borderTop: `3px solid ${brandColor}`,
        position: "relative", overflow: "hidden",
      }}>
        <style>{`
          @keyframes slideInRight { from { opacity: 0; transform: translateX(52px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes slideInLeft  { from { opacity: 0; transform: translateX(-52px); } to { opacity: 1; transform: translateX(0); } }
        `}</style>

        <Container maxWidth="sm">
          {/* Header */}
          <Box sx={{ mb: { xs: 6, md: 8 }, textAlign: "center" }}>
            <Typography sx={{ color: brandColor, fontWeight: 700, letterSpacing: "0.3em", fontSize: "0.62rem", textTransform: "uppercase", mb: 1.5 }}>
              Testimonials
            </Typography>
            <Typography sx={{ fontFamily: displayFont, fontSize: { xs: "2rem", md: "2.6rem" }, fontWeight: 400, color: "#fff", lineHeight: 1.15 }}>
              What Our Clients Say
            </Typography>
            <Box sx={{ width: 36, height: 2, bgcolor: brandColor, mx: "auto", mt: 2.5 }} />
          </Box>

          {/* Review slider */}
          {freshTenant?.reviews?.length > 0 ? (
            <>
              <Box sx={{ minHeight: { xs: 280, md: 300 } }}>
                {freshTenant.reviews.map((rev, idx) => {
                  if (idx !== activeReviewIndex) return null;
                  const rawName  = rev.customerName || rev.name || "Client";
                  const initial  = rawName.charAt(0).toUpperCase();
                  const stars    = Math.min(Math.max(Number(rev.rating) || 5, 1), 5);
                  return (
                    <Box key={`rev-${idx}-${activeReviewIndex}`} sx={{ animation: `${slideDir === "right" ? "slideInRight" : "slideInLeft"} 0.42s cubic-bezier(0.4,0,0.2,1) both` }}>
                      <Paper elevation={0} sx={{ p: { xs: 4, md: 5 }, borderRadius: 0, bgcolor: "#faf8f4", position: "relative", overflow: "hidden" }}>
                        {/* Decorative quote */}
                        <Typography sx={{ position: "absolute", top: 12, left: 20, fontFamily: displayFont, fontSize: "7rem", lineHeight: 1, color: brandColor, opacity: 0.12, userSelect: "none", pointerEvents: "none" }}>
                          "
                        </Typography>
                        {/* Stars */}
                        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.3, mb: 3 }}>
                          {[...Array(5)].map((_, i) => (
                            <StarIcon key={i} sx={{ fontSize: 16, color: i < stars ? brandColor : "rgba(201,168,76,0.2)" }} />
                          ))}
                        </Box>
                        {/* Review text */}
                        <Typography sx={{
                          fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
                          fontSize: { xs: "1.1rem", md: "1.22rem" }, color: "#1a1a1a",
                          lineHeight: 1.85, textAlign: "center", mb: 4, px: { xs: 0, md: 1 },
                        }}>
                          "{rev.comment || rev.text || "Great experience!"}"
                        </Typography>
                        {/* Separator */}
                        <Box sx={{ width: 28, height: "1px", bgcolor: brandColor, mx: "auto", mb: 4, opacity: 0.5 }} />
                        {/* Reviewer */}
                        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                          <Avatar sx={{ width: 44, height: 44, bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "1rem", fontFamily: displayFont }}>
                            {initial}
                          </Avatar>
                          <Box sx={{ textAlign: "left" }}>
                            <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: "#0d0d0d", letterSpacing: "0.03em" }}>
                              {rawName}
                            </Typography>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <VerifiedIcon sx={{ fontSize: 11, color: brandColor }} />
                              <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888" }}>
                                Verified Client
                              </Typography>
                            </Stack>
                          </Box>
                        </Stack>
                      </Paper>
                    </Box>
                  );
                })}
              </Box>

              {/* Controls */}
              {freshTenant.reviews.length > 1 && (
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={3} sx={{ mt: 4 }}>
                  <IconButton
                    onClick={() => {
                      setSlideDir("left");
                      setActiveReviewIndex(i => (i === 0 ? freshTenant.reviews.length - 1 : i - 1));
                    }}
                    sx={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.45)", "&:hover": { borderColor: brandColor, color: brandColor } }}
                  >
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                  <Stack direction="row" spacing={0.75}>
                    {freshTenant.reviews.map((_, i) => (
                      <Box
                        key={i}
                        onClick={() => { setSlideDir(i > activeReviewIndex ? "right" : "left"); setActiveReviewIndex(i); }}
                        sx={{ width: i === activeReviewIndex ? 24 : 7, height: 7, borderRadius: "99px", bgcolor: i === activeReviewIndex ? brandColor : "rgba(255,255,255,0.18)", cursor: "pointer", transition: "all .3s ease" }}
                      />
                    ))}
                  </Stack>
                  <IconButton
                    onClick={() => {
                      setSlideDir("right");
                      setActiveReviewIndex(i => (i === freshTenant.reviews.length - 1 ? 0 : i + 1));
                    }}
                    sx={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.45)", "&:hover": { borderColor: brandColor, color: brandColor } }}
                  >
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Stack>
              )}
            </>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography sx={{ color: "rgba(255,255,255,0.3)", fontFamily: displayFont, fontSize: "1.1rem", mb: 1 }}>
                No reviews yet
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.2)", fontSize: "0.82rem", fontWeight: 300 }}>
                Be the first to share your experience.
              </Typography>
            </Box>
          )}

        </Container>
      </Box>

    </Box>
  );
}