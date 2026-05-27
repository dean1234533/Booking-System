import React, { useEffect, useState } from "react";
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
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import { useNavigate, useParams, useLocation } from "react-router-dom";
 
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../firebase/config";
import { getShopStaff, getBarber } from "../firebase/firestore";
import BarberCard from "../components/BarberCard"; 
 
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
  
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [freshTenant, setFreshTenant] = useState(initialTenant || location.state?.tenant);
  const [openPrivacy, setOpenPrivacy] = useState(false);
  const [openTerms, setOpenTerms] = useState(false);
 
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
 
        // ── Staff — each member carries their own instagramUrl + tiktokUrl
        const activeStaff = staffMembers
          .map(member => ({ ...member, shopId: activeTenantId }))
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
      <Box sx={{
        height: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url('${heroImageUrl}')`,
        backgroundSize: "cover", 
        backgroundPosition: "bottom center",
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
            fontFamily: "'Playfair Display', serif", 
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
              <Typography variant="h5" sx={{ fontFamily: "'Playfair Display', serif", mb: 2 }}>Visit Us</Typography>
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
              <Typography variant="h5" sx={{ fontFamily: "'Playfair Display', serif", mb: 3 }}>Opening Hours</Typography>
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
          <Typography variant="h3" sx={{ fontFamily: "'Playfair Display', serif", mb: 4, letterSpacing: 2 }}>
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
          <Typography variant="h3" mt={1} mb={2} sx={{ fontFamily: "'Playfair Display', serif" }}>Our Master Barbers</Typography>
          <Box sx={{ width: 40, height: 2, bgcolor: brandColor, mx: 'auto' }} />
        </Box>
        
        <Grid container spacing={5}>
          {team.map(barber => (
            <Grid item xs={12} sm={6} md={4} key={barber.id}>
              {/* 🎯 CHANGED: isMarketplace={false} here signals the BarberCard to navigate directly to the individual booking path `/barber/:id` */}
              <BarberCard 
                barber={{
                  ...barber,
                  businessName: barber.name,
                  logoUrl:      barber.profilePic,
                }} 
                isMarketplace={false} 
              />
            </Grid>
          ))}
        </Grid>
      </Container>
 
     
        {/* ── 5. REVIEWS (CAROUSEL VIEW) ───────────────────────────────────── */}
      {freshTenant?.reviews?.length > 0 && (
        <Box sx={{ py: 15, bgcolor: '#fcfcfc', borderTop: '1px solid #EEE' }}>
          <Container maxWidth="sm">
            <Box sx={{ mb: 8, textAlign: 'center' }}>
              <Typography variant="overline" sx={{ color: brandColor, fontWeight: 600, letterSpacing: 5 }}>TESTIMONIALS</Typography>
              <Typography variant="h3" mt={1} sx={{ fontFamily: "'Playfair Display', serif" }}>Client Experiences</Typography>
            </Box>

            <Box sx={{ position: 'relative', minHeight: '300px' }}>
              {freshTenant.reviews.map((rev, idx) => {
                const isActive = idx === activeReviewIndex;
                if (!isActive) return null;

                const rawName = rev.customerName || rev.name || "Client";
                const displayInitial = rawName.charAt(0).toUpperCase() || "C";
                const starRating = Number(rev.rating) || 5;

                return (
                  <Paper key={rev.id || idx} elevation={0} sx={{ p: 4, borderRadius: 0, bgcolor: 'white', border: '1px solid #eee' }}>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', color: brandColor, justifyContent: 'center' }}>
                        {[...Array(starRating)].map((_, i) => <StarIcon key={i} sx={{ fontSize: 18, opacity: 0.7 }} />)}
                      </Box>
                      <Typography variant="body1" sx={{ fontStyle: 'italic', color: 'text.secondary', fontWeight: 300, textAlign: 'center' }}>
                        "{rev.comment || rev.text || "Great experience!"}"
                      </Typography>
                      <Divider />
                      <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                        <Avatar sx={{ bgcolor: '#f0f0f0', color: 'black' }}>{displayInitial}</Avatar>
                        <Box>
                          <Typography fontWeight={600} variant="subtitle2">{rawName}</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.5, textTransform: 'uppercase' }}>Verified</Typography>
                        </Box>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}

              {/* CONTROLS */}
              <Stack direction="row" justifyContent="center" spacing={2} sx={{ mt: 4 }}>
                <Button 
                  onClick={() => setActiveReviewIndex(prev => (prev === 0 ? freshTenant.reviews.length - 1 : prev - 1))}
                  sx={{ color: 'black', fontWeight: 700 }}
                >
                  PREV
                </Button>
                <Button 
                  onClick={() => setActiveReviewIndex(prev => (prev === freshTenant.reviews.length - 1 ? 0 : prev + 1))}
                  sx={{ color: 'black', fontWeight: 700 }}
                >
                  NEXT
                </Button>
              </Stack>
            </Box>
          </Container>
          
          <Box sx={{ mt: 10, textAlign: 'center' }}>
            <Button 
              variant="text" 
              startIcon={<RateReviewIcon />}
              onClick={() => navigate(`/review/${freshTenant?.id || freshTenant?.uid}`)}
              sx={{ color: 'black', px: 6, py: 2, fontWeight: 600, borderRadius: 0, letterSpacing: 2, '&:hover': { bgcolor: 'transparent', color: brandColor } }}
            >
              LEAVE A REVIEW
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}