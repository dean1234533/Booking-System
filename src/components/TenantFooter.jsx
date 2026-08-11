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

function contrastColor(hex) {
  if (!hex || !hex.startsWith("#")) return "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#111111" : "#ffffff";
}

const LOGIN_LABEL = {
  hairdresser: 'STYLIST LOGIN',
  decorator:   'PRO LOGIN',
  trainer:     'TRAINER LOGIN',
};

export default function TenantFooter({ tenant, businessType }) {
  const [modal, setModal] = useState({ open: false, title: "", content: null });

  if (!tenant) return null;

  // --- DATA MAPPING (Synced with TenantNav) ---
  const logo = tenant?.businessLogo || tenant?.logoUrl;
  const businessName = (tenant?.businessName || "PREMIUM BARBER SHOP").toUpperCase();
  const brandColor  = tenant?.brandColor    || "#C9A84C";
  const footerBg    = tenant?.footerBgColor || "#0a0a0a";
  const footerText  = contrastColor(footerBg);
  const mutedText   = footerText === "#ffffff"
    ? "rgba(255,255,255,0.5)"
    : "rgba(0,0,0,0.45)";
  const dividerColor = footerText === "#ffffff"
    ? "rgba(255,255,255,0.05)"
    : "rgba(0,0,0,0.1)";
  
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
        content: tenant?.privacyPolicy || `${businessName} is committed to protecting your privacy. We collect your name, contact details, and appointment information to provide our booking services. Your data is stored securely via Bookrightly and is never sold to third parties. You have the right to access, correct, or delete your data by contacting us directly. For platform-level privacy information, see bookrightly.co.uk/privacy.`
      });
    } else {
      setModal({
        open: true,
        title: "Terms of Service",
        content: tenant?.termsConditions || "By booking, you agree to our cancellation and conduct policies..."
      });
    }
  };

  const socialSx = {
    color: footerText,
    border: `1px solid ${dividerColor}`,
    '&:hover': { bgcolor: brandColor, borderColor: brandColor, color: contrastColor(brandColor) },
  };

  return (
    <Box component="footer" sx={{ bgcolor: footerBg, color: footerText, pt: { xs: 6, md: 8 }, pb: 4, mt: 'auto', px: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg" disableGutters>
        {/* Top: brand/contact (left) + social (right) — centred on mobile */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'center', md: 'flex-start' }}
          spacing={{ xs: 4, md: 4 }}
          sx={{ textAlign: { xs: 'center', md: 'left' } }}
        >
          {/* Brand + contact */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', md: 'flex-start' } }}>
            {logo ? (
              <Avatar src={logo} variant="square"
                sx={{ width: 56, height: 56, borderRadius: '6px', border: `1.5px solid ${brandColor}`, objectFit: 'contain', bgcolor: 'transparent', mb: 2 }} />
            ) : (
              <Box sx={{ width: 56, height: 56, borderRadius: '6px', bgcolor: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: brandColor, border: `1px solid ${brandColor}44`, mb: 2 }}>
                <ContentCutIcon sx={{ fontSize: 28 }} />
              </Box>
            )}

            <Typography variant="h6" sx={{ fontWeight: 900, mb: address ? 1 : 2, letterSpacing: 1, fontFamily: "'Playfair Display', serif", color: footerText }}>
              {businessName}
            </Typography>

            {address && (
              <Typography variant="body2" sx={{ color: mutedText, mb: 2, maxWidth: 320 }}>
                {address}
              </Typography>
            )}

            <Stack spacing={1.25} alignItems={{ xs: 'center', md: 'flex-start' }}>
              {phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <PhoneIcon sx={{ fontSize: 18, color: brandColor }} />
                  <Link href={`tel:${phone}`} sx={{ color: footerText, textDecoration: 'none', fontSize: '0.9rem', opacity: 0.85 }}>{phone}</Link>
                </Box>
              )}
              {email && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <EmailIcon sx={{ fontSize: 18, color: brandColor }} />
                  <Link href={`mailto:${email}`} sx={{ color: footerText, textDecoration: 'none', fontSize: '0.9rem', opacity: 0.85, wordBreak: 'break-all' }}>{email}</Link>
                </Box>
              )}
            </Stack>
          </Box>

          {/* Social */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', md: 'flex-end' } }}>
            <Typography variant="overline" sx={{ color: brandColor, fontWeight: 900, letterSpacing: 2, mb: 1.5 }}>
              Stay Connected
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <IconButton component="a" href={instagram || '#'} target={instagram ? '_blank' : '_self'} sx={socialSx}><InstagramIcon /></IconButton>
              <IconButton component="a" href={facebook || '#'} target={facebook ? '_blank' : '_self'} sx={socialSx}><FacebookIcon /></IconButton>
            </Box>
          </Box>
        </Stack>

        <Divider sx={{ bgcolor: dividerColor, my: { xs: 3, md: 4 } }} />

        {/* Bottom bar */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          sx={{ textAlign: 'center' }}
        >
          <Stack direction="row" spacing={3} alignItems="center" sx={{ flexWrap: 'wrap', justifyContent: 'center', rowGap: 1 }}>
            <Typography variant="caption" sx={{ color: mutedText }}>
              © {new Date().getFullYear()} {businessName}
            </Typography>
            <Link component={RouterLink} to="/login" sx={{ fontSize: '0.7rem', color: brandColor, textDecoration: 'none', fontWeight: 900, letterSpacing: 1 }}>
              {LOGIN_LABEL[businessType] || 'BARBER LOGIN'}
            </Link>
          </Stack>

          <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', justifyContent: 'center', rowGap: 1 }}>
            <Link onClick={() => handleOpenLegal('privacy')} sx={{ cursor: 'pointer', fontSize: '0.75rem', color: mutedText, textDecoration: 'none', '&:hover': { color: brandColor } }}>
              Privacy Policy
            </Link>
            <Link onClick={() => handleOpenLegal('terms')} sx={{ cursor: 'pointer', fontSize: '0.75rem', color: mutedText, textDecoration: 'none', '&:hover': { color: brandColor } }}>
              Terms of Service
            </Link>
          </Stack>
        </Stack>
      </Container>

      {/* Legal Dialog */}
      <Dialog
        open={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        PaperProps={{ sx: { bgcolor: footerBg, color: footerText, maxWidth: '600px', borderRadius: '4px' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: footerText }}>{modal.title}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: dividerColor }}>
          <Typography variant="body2" sx={{ lineHeight: 1.8, color: mutedText }}>
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