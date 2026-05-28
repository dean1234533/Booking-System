import React, { useEffect } from "react";
import {
  Paper, Grid, Typography, Box, Avatar, Button, Divider, TextField,
} from "@mui/material";
import {
  Gavel as GavelIcon,
  DesktopWindows as DesktopIcon,
  Smartphone as MobileIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { FONT_OPTIONS, loadGoogleFont } from "../../../utils/fontOptions";

export default function DesignTab({
  profile, setProfile,
  logoPreview,         setLogoFile,         setLogoPreview,
  heroPreviewDesktop,  setHeroFileDesktop,  setHeroPreviewDesktop,
  heroPreviewMobile,   setHeroFileMobile,   setHeroPreviewMobile,
  handleImageChange,
}) {
  const set = (key, val) => setProfile(p => ({ ...p, [key]: val }));
  const brandColor   = profile.brandColor || "#C9A84C";
  const selectedFont = profile.siteFont   || "playfair";

  useEffect(() => { FONT_OPTIONS.forEach(f => loadGoogleFont(f.key)); }, []);

  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={800} mb={3}>Brand &amp; Design Settings</Typography>

      <Grid container spacing={3}>

        {/* ── Logo ── */}
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Business Logo</Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar src={logoPreview || profile.logoUrl} variant="rounded" sx={{ width: 56, height: 56 }} />
            <Button variant="outlined" component="label" size="small">
              Upload Logo
              <input type="file" hidden accept="image/*"
                onChange={e => handleImageChange(e, setLogoFile, setLogoPreview)} />
            </Button>
          </Box>
        </Grid>

        {/* ── Brand colour ── */}
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Brand Colour</Typography>
          <Box display="flex" alignItems="center" gap={1.5}>
            <input type="color" value={profile.brandColor || "#C9A84C"}
              onChange={e => set("brandColor", e.target.value)}
              style={{ width: 48, height: 48, border: "none", cursor: "pointer", borderRadius: 8 }} />
            <Typography variant="caption" color="text.secondary">Buttons, tabs &amp; accents</Typography>
          </Box>
        </Grid>

        {/* ── Nav background ── */}
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Nav Background</Typography>
          <Box display="flex" alignItems="center" gap={1.5}>
            <input type="color" value={profile.navBgColor || "#ffffff"}
              onChange={e => set("navBgColor", e.target.value)}
              style={{ width: 48, height: 48, border: "none", cursor: "pointer", borderRadius: 8 }} />
            <Typography variant="caption" color="text.secondary">Navigation bar background</Typography>
          </Box>
        </Grid>

        {/* ── Footer background ── */}
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Footer Background</Typography>
          <Box display="flex" alignItems="center" gap={1.5}>
            <input type="color" value={profile.footerBgColor || "#0a0a0a"}
              onChange={e => set("footerBgColor", e.target.value)}
              style={{ width: 48, height: 48, border: "none", cursor: "pointer", borderRadius: 8 }} />
            <Typography variant="caption" color="text.secondary">Footer background</Typography>
          </Box>
        </Grid>

        {/* ── Hero images ── */}
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            <DesktopIcon sx={{ verticalAlign: "middle", mr: 0.5, fontSize: 18 }} />
            Desktop Hero Image
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{
              width: 100, height: 56, borderRadius: 1, bgcolor: "#eee",
              backgroundImage:    `url(${heroPreviewDesktop || profile.heroImage})`,
              backgroundSize:     "cover", backgroundPosition: "center",
            }} />
            <Button variant="outlined" component="label" size="small">
              Upload Desktop
              <input type="file" hidden accept="image/*"
                onChange={e => handleImageChange(e, setHeroFileDesktop, setHeroPreviewDesktop)} />
            </Button>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            <MobileIcon sx={{ verticalAlign: "middle", mr: 0.5, fontSize: 18 }} />
            Mobile Hero Image
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{
              width: 100, height: 56, borderRadius: 1, bgcolor: "#eee",
              backgroundImage:    `url(${heroPreviewMobile || profile.heroImageMobile})`,
              backgroundSize:     "cover", backgroundPosition: "center",
            }} />
            <Button variant="outlined" component="label" size="small">
              Upload Mobile
              <input type="file" hidden accept="image/*"
                onChange={e => handleImageChange(e, setHeroFileMobile, setHeroPreviewMobile)} />
            </Button>
          </Box>
        </Grid>

        {/* ── Font style ── */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle1" fontWeight={700} mb={0.5} mt={1}>Font Style</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            Heading font used across your public website.
          </Typography>
          <Box sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2,1fr)", sm: "repeat(3,1fr)", md: "repeat(5,1fr)" },
            gap: 1.5,
          }}>
            {FONT_OPTIONS.map(f => {
              const active = selectedFont === f.key;
              return (
                <Box
                  key={f.key}
                  onClick={() => set("siteFont", f.key)}
                  sx={{
                    border: active ? `2px solid ${brandColor}` : "1.5px solid #e5e5e5",
                    borderRadius: 2, p: 2, cursor: "pointer",
                    bgcolor: active ? `${brandColor}10` : "#fafafa",
                    position: "relative", transition: "border-color .15s, background-color .15s",
                    "&:hover": { borderColor: brandColor, bgcolor: `${brandColor}06` },
                  }}
                >
                  {active && (
                    <CheckCircleIcon sx={{ position: "absolute", top: 8, right: 8, fontSize: 16, color: brandColor }} />
                  )}
                  <Typography sx={{ fontFamily: f.family, fontSize: "1.15rem", lineHeight: 1.25, color: "#1a1a1a", mb: 0.5, pr: active ? 2 : 0 }}>
                    {f.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#888", display: "block", fontSize: "0.67rem", letterSpacing: "0.04em" }}>
                    {f.cat}
                  </Typography>
                  <Typography sx={{ fontFamily: f.family, fontSize: "0.72rem", color: "#aaa", mt: 0.75 }}>
                    Aa Bb Cc
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Grid>

        {/* ── Social media ── */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle1" fontWeight={700} mb={0.5} mt={1}>Social Media Links</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            These appear in the footer of your public page.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Instagram URL"
                placeholder="https://instagram.com/yourhandle"
                value={profile.instagramUrl || ""}
                onChange={e => set("instagramUrl", e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="TikTok URL"
                placeholder="https://tiktok.com/@yourhandle"
                value={profile.tiktokUrl || ""}
                onChange={e => set("tiktokUrl", e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Facebook URL"
                placeholder="https://facebook.com/yourpage"
                value={profile.facebookUrl || ""}
                onChange={e => set("facebookUrl", e.target.value)} />
            </Grid>
          </Grid>
        </Grid>

        {/* ── Contact info ── */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle1" fontWeight={700} mb={0.5} mt={1}>Contact Information</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            Shown in your footer so clients can reach you.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Address"
                placeholder="123 High Street, London, W1A 1AA"
                value={profile.address || ""}
                onChange={e => set("address", e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Phone Number"
                placeholder="+44 7700 900000"
                value={profile.phone || ""}
                onChange={e => set("phone", e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Business Email"
                placeholder="hello@yourbusiness.com"
                value={profile.businessEmail || profile.contactEmail || ""}
                onChange={e => { set("businessEmail", e.target.value); set("contactEmail", e.target.value); }} />
            </Grid>
          </Grid>
        </Grid>

        {/* ── Legal ── */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle1" fontWeight={700} gutterBottom mt={1}>
            <GavelIcon sx={{ verticalAlign: "middle", mr: 1 }} />
            Legal Policies
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            These appear in a popup when visitors click Privacy / Terms links in your footer.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth multiline rows={4} label="Privacy Policy"
                placeholder="Your privacy policy text…"
                value={profile.privacyPolicy || ""}
                onChange={e => set("privacyPolicy", e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth multiline rows={4} label="Terms &amp; Conditions"
                placeholder="Your booking terms and conditions…"
                value={profile.termsConditions || ""}
                onChange={e => set("termsConditions", e.target.value)} />
            </Grid>
          </Grid>
        </Grid>

      </Grid>
    </Paper>
  );
}
