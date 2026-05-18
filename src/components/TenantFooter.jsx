import React, { useState } from "react";
import { 
  Box, Typography, Container, Grid, IconButton, Link, Divider, 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Avatar 
} from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import { Link as RouterLink } from "react-router-dom";

export default function TenantFooter({ tenant }) {
  const [modal, setModal] = useState({ open: false, title: "", content: null });

  if (!tenant) return null;

  // --- DATA MAPPING (Synced with TenantNav) ---
  const logo = tenant?.businessLogo || tenant?.logoUrl;
  const businessName = (tenant?.businessName || "PREMIUM BARBER SHOP").toUpperCase();
  const brandColor = tenant?.brandColor || "#C9A84C";
  
  // Contact Info
  const address = tenant?.address;
  const phone = tenant?.phone || tenant?.businessPhone;
  const email = tenant?.businessEmail || tenant?.email;
  const instagram = tenant?.instagramUrl || tenant?.instagram;
  const facebook = tenant?.facebookUrl || tenant?.facebook;

  const handleOpenLegal = (type) => {
    if (type === 'privacy') {
      setModal({
        open: true,
        title: "Privacy Policy",
        content: tenant?.privacyPolicy || "Our privacy policy details how we handle your data..."
      });
    } else {
      setModal({
        open: true,
        title: "Terms of Service",
        content: tenant?.termsConditions || "By booking, you agree to our cancellation and conduct policies..."
      });
    }
  };

  return (
    <Box component="footer" sx={{ bgcolor: "#0A0A0A", color: "white", pt: 8, pb: 4, mt: 'auto' }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          
          {/* Left Column: Logo & Contact Info */}
          <Grid item xs={12} md={6}>
            
            {/* LOGO SECTION (Synced with TenantNav logic) */}
            <Box sx={{ mb: 3 }}>
              {logo ? (
                <Avatar 
                  src={logo} 
                  variant="square"
                  sx={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: '4px',
                    border: `1.5px solid ${brandColor}`,
                    objectFit: 'contain',
                    bgcolor: 'transparent'
                  }} 
                />
              ) : (
                <Box 
                  sx={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: '4px', 
                    bgcolor: "#1A1A1A", 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: brandColor,
                    border: `1px solid ${brandColor}44`
                  }}
                >
                  <ContentCutIcon sx={{ fontSize: 30 }} />
                </Box>
              )}
            </Box>

            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 1000, 
                mb: 1, 
                letterSpacing: 1,
                fontFamily: "'Playfair Display', serif" 
              }}
            >
              {businessName}
            </Typography>
            
            {address && (
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)", mb: 3, maxWidth: 300 }}>
                {address}
              </Typography>
            )}

            <Stack spacing={1.5}>
              {phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <PhoneIcon sx={{ fontSize: 18, color: brandColor }} />
                  <Link href={`tel:${phone}`} sx={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', opacity: 0.8 }}>
                    {phone}
                  </Link>
                </Box>
              )}
              {email && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <EmailIcon sx={{ fontSize: 18, color: brandColor }} />
                  <Link href={`mailto:${email}`} sx={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', opacity: 0.8 }}>
                    {email}
                  </Link>
                </Box>
              )}
            </Stack>
          </Grid>

          {/* Right Column: Social Media */}
          <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
            <Typography variant="overline" sx={{ color: brandColor, fontWeight: 900, letterSpacing: 2, mb: 2 }}>
              STAY CONNECTED
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <IconButton 
                component="a" 
                href={instagram || "#"} 
                target={instagram ? "_blank" : "_self"}
                sx={{ 
                  color: "white", 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  '&:hover': { bgcolor: brandColor, borderColor: brandColor, color: "black" }
                }}
              >
                <InstagramIcon />
              </IconButton>

              <IconButton 
                component="a" 
                href={facebook || "#"} 
                target={facebook ? "_blank" : "_self"}
                sx={{ 
                  color: "white", 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  '&:hover': { bgcolor: brandColor, borderColor: brandColor, color: "black" }
                }}
              >
                <FacebookIcon />
              </IconButton>
            </Box>
          </Grid>

          {/* Bottom Bar */}
          <Grid item xs={12}>
            <Divider sx={{ bgcolor: 'rgba(255,255,255,0.05)', my: 4 }} />
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              
              <Stack direction="row" spacing={3} alignItems="center">
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                  © {new Date().getFullYear()} {businessName}
                </Typography>
                <Link component={RouterLink} to="/login" sx={{ fontSize: '0.7rem', color: brandColor, textDecoration: 'none', fontWeight: 900, letterSpacing: 1 }}>
                  BARBER LOGIN
                </Link>
              </Stack>

              <Stack direction="row" spacing={3}>
                <Link onClick={() => handleOpenLegal('privacy')} sx={{ cursor: 'pointer', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', '&:hover': { color: brandColor } }}>
                  Privacy Policy
                </Link>
                <Link onClick={() => handleOpenLegal('terms')} sx={{ cursor: 'pointer', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', '&:hover': { color: brandColor } }}>
                  Terms of Service
                </Link>
              </Stack>

            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Legal Dialog */}
      <Dialog 
        open={modal.open} 
        onClose={() => setModal({ ...modal, open: false })} 
        PaperProps={{ sx: { bgcolor: '#111', color: 'white', maxWidth: '600px', borderRadius: '4px' } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>{modal.title}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Typography variant="body2" sx={{ lineHeight: 1.8, color: 'rgba(255,255,255,0.6)' }}>
            {modal.content}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setModal({ ...modal, open: false })} sx={{ color: brandColor, fontWeight: 900 }}>CLOSE</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}