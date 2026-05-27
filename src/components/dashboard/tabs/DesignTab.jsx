import React from "react";
import {
  Paper, Grid, Typography, Box, Avatar, Button, Divider, TextField
} from "@mui/material";
import {
  Gavel as GavelIcon,
  DesktopWindows as DesktopIcon,
  Smartphone as MobileIcon,
} from "@mui/icons-material";

export default function DesignTab({
  profile, setProfile,
  logoPreview,    setLogoFile,    setLogoPreview,
  heroPreviewDesktop, setHeroFileDesktop, setHeroPreviewDesktop,
  heroPreviewMobile,  setHeroFileMobile,  setHeroPreviewMobile,
  handleImageChange,
}) {
  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={800} mb={3}>Brand Settings</Typography>

      <Grid container spacing={3}>
        {/* Business Logo */}
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

        {/* Brand Colour */}
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Brand Colour</Typography>
          <Box display="flex" alignItems="center" gap={1.5}>
            <input type="color" value={profile.brandColor || "#C9A84C"}
              onChange={e => setProfile(p => ({ ...p, brandColor: e.target.value }))}
              style={{ width: 48, height: 48, border: "none", cursor: "pointer", borderRadius: 8 }} />
            <Typography variant="caption" color="text.secondary">Used on buttons, tabs & accents</Typography>
          </Box>
        </Grid>

        {/* Nav Background */}
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Nav Background</Typography>
          <Box display="flex" alignItems="center" gap={1.5}>
            <input type="color" value={profile.navBgColor || "#ffffff"}
              onChange={e => setProfile(p => ({ ...p, navBgColor: e.target.value }))}
              style={{ width: 48, height: 48, border: "none", cursor: "pointer", borderRadius: 8 }} />
            <Typography variant="caption" color="text.secondary">Navigation bar background colour</Typography>
          </Box>
        </Grid>

        {/* Footer Background */}
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Footer Background</Typography>
          <Box display="flex" alignItems="center" gap={1.5}>
            <input type="color" value={profile.footerBgColor || "#0a0a0a"}
              onChange={e => setProfile(p => ({ ...p, footerBgColor: e.target.value }))}
              style={{ width: 48, height: 48, border: "none", cursor: "pointer", borderRadius: 8 }} />
            <Typography variant="caption" color="text.secondary">Footer background colour</Typography>
          </Box>
        </Grid>

        {/* Desktop Hero Banner */}
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            <DesktopIcon sx={{ verticalAlign: "middle", mr: 0.5, fontSize: 18 }} />
            Desktop Hero Banner
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{
              width: 100, height: 56, borderRadius: 1, bgcolor: "#eee",
              backgroundImage:    `url(${heroPreviewDesktop || profile.heroImage})`,
              backgroundSize:     "cover",
              backgroundPosition: "center",
            }} />
            <Button variant="outlined" component="label" size="small">
              Upload Desktop
              <input type="file" hidden accept="image/*"
                onChange={e => handleImageChange(e, setHeroFileDesktop, setHeroPreviewDesktop)} />
            </Button>
          </Box>
        </Grid>

        {/* Mobile Hero Banner */}
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            <MobileIcon sx={{ verticalAlign: "middle", mr: 0.5, fontSize: 18 }} />
            Mobile Hero Banner
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{
              width: 100, height: 56, borderRadius: 1, bgcolor: "#eee",
              backgroundImage:    `url(${heroPreviewMobile || profile.heroImageMobile})`,
              backgroundSize:     "cover",
              backgroundPosition: "center",
            }} />
            <Button variant="outlined" component="label" size="small">
              Upload Mobile
              <input type="file" hidden accept="image/*"
                onChange={e => handleImageChange(e, setHeroFileMobile, setHeroPreviewMobile)} />
            </Button>
          </Box>
        </Grid>

        {/* Legal Policies */}
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            <GavelIcon sx={{ verticalAlign: "middle", mr: 1 }} />
            Legal Policies
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField label="Privacy Policy" fullWidth multiline rows={4}
                placeholder="Your privacy policy text..."
                value={profile.privacyPolicy || ""}
                onChange={e => setProfile(p => ({ ...p, privacyPolicy: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Terms & Conditions" fullWidth multiline rows={4}
                placeholder="Your booking terms and conditions..."
                value={profile.termsConditions || ""}
                onChange={e => setProfile(p => ({ ...p, termsConditions: e.target.value }))} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  );
}