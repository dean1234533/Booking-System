import React, { useEffect } from "react";
import {
  Box, Grid, Paper, Typography, Divider,
  TextField, Button, Avatar, InputAdornment,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  AccessTime as AccessTimeIcon,
} from "@mui/icons-material";
import DesignTab from "./DesignTab";
import WebsiteTab from "./WebsiteTab";

const TikTokIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5
      2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27
      0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0
      6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z" />
  </svg>
);

export default function PageEditorTab({
  profile, setProfile, brandColor, businessType,
  profilePreview,      setProfileFile,      setProfilePreview,
  logoPreview,         setLogoFile,         setLogoPreview,
  heroPreviewDesktop,  setHeroFileDesktop,  setHeroPreviewDesktop,
  heroPreviewMobile,   setHeroFileMobile,   setHeroPreviewMobile,
  handleImageChange,
  handleDeleteProfile,
}) {
  const set = (key, val) => setProfile(p => ({ ...p, [key]: val }));

  return (
    <Box>

      {/* ── 1. Personal Info ──────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={800} mb={3}>Personal Info</Typography>

        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <Avatar
            src={profilePreview || profile.profilePic}
            sx={{ width: 88, height: 88, mb: 1.5, border: `3px solid ${brandColor}` }}
          />
          <Button variant="outlined" component="label" size="small">
            Change Photo
            <input
              type="file" hidden accept="image/*"
              onChange={e => handleImageChange(e, setProfileFile, setProfilePreview)}
            />
          </Button>
        </Box>

        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Full Name"
              value={profile.name || ""}
              onChange={e => set("name", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Specialty / Title"
              placeholder={businessType === "trainer" ? "e.g. Personal Trainer" : "e.g. Senior Stylist"}
              value={profile.specialty || ""}
              onChange={e => set("specialty", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth multiline rows={2} label="Personal Bio"
              value={profile.bio || ""}
              onChange={e => set("bio", e.target.value)}
            />
          </Grid>
          {(businessType !== "trainer") && (
            <Grid item xs={12}>
              <TextField
                fullWidth multiline rows={3} label="Opening Hours"
                placeholder={"Mon–Fri: 9am–6pm\nSat: 10am–4pm\nSun: Closed"}
                value={typeof profile.openingHours === "string" ? profile.openingHours : ""}
                onChange={e => set("openingHours", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}>
                      <AccessTimeIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* ── 2. Contact & Social ───────────────────────────────────────────── */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={800} mb={0.5}>Contact &amp; Social</Typography>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          These appear in the footer of your public page.
        </Typography>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Phone"
              value={profile.phone || ""}
              onChange={e => set("phone", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Business Email" type="email"
              placeholder="hello@yourbusiness.com"
              value={profile.businessEmail || profile.contactEmail || ""}
              onChange={e => { set("businessEmail", e.target.value); set("contactEmail", e.target.value); }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth label="Address"
              placeholder="123 High Street, London"
              value={profile.address || ""}
              onChange={e => set("address", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth label="Instagram URL"
              placeholder="https://instagram.com/yourhandle"
              value={profile.instagramUrl || ""}
              onChange={e => set("instagramUrl", e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><InstagramIcon fontSize="small" sx={{ color: "#E1306C" }} /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth label="TikTok URL"
              placeholder="https://tiktok.com/@yourhandle"
              value={profile.tiktokUrl || ""}
              onChange={e => set("tiktokUrl", e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Box sx={{ display: "flex", alignItems: "center" }}><TikTokIcon /></Box></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth label="Facebook URL"
              placeholder="https://facebook.com/yourpage"
              value={profile.facebookUrl || ""}
              onChange={e => set("facebookUrl", e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><FacebookIcon fontSize="small" sx={{ color: "#1877F2" }} /></InputAdornment> }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* ── 3. Brand & Design (reuses DesignTab — logo, colours, font, images, legal) ── */}
      <DesignTab
        profile={profile} setProfile={setProfile}
        logoPreview={logoPreview}               setLogoFile={setLogoFile}               setLogoPreview={setLogoPreview}
        heroPreviewDesktop={heroPreviewDesktop} setHeroFileDesktop={setHeroFileDesktop} setHeroPreviewDesktop={setHeroPreviewDesktop}
        heroPreviewMobile={heroPreviewMobile}   setHeroFileMobile={setHeroFileMobile}   setHeroPreviewMobile={setHeroPreviewMobile}
        handleImageChange={handleImageChange}
      />

      {/* ── 4. Page Content (reuses WebsiteTab — type-specific text/services/stats) ── */}
      <Box mt={3}>
        <WebsiteTab
          profile={profile} setProfile={setProfile}
          brandColor={brandColor} businessType={businessType}
        />
      </Box>

      {/* ── 5. Danger Zone ───────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, borderRadius: 3, mt: 3 }}>
        <Divider sx={{ mb: 3 }} />
        <Typography variant="subtitle2" color="error" gutterBottom fontWeight={700}>
          Danger Zone
        </Typography>
        <Button
          variant="outlined" color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDeleteProfile}
        >
          Delete My Profile
        </Button>
      </Paper>

    </Box>
  );
}
