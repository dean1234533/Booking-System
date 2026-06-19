import React from "react";
import {
  Box, Paper, Avatar, Button, Grid, TextField, Typography,
  Divider, InputAdornment, MenuItem
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon,
  Delete as DeleteIcon,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  Info as InfoIcon,
} from "@mui/icons-material";

// ── TikTok SVG (no MUI icon available) ───────────────────────────────────────
const TikTokIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5
      2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27
      0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0
      6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z" />
  </svg>
);

const safeRenderOpeningHours = (val) => {
  if (!val) return "";
  if (typeof val === "object") return "Schedule Set (Object)";
  return val;
};

export default function ProfileTab({
  profile, setProfile, brandColor, userRole,
  profilePreview, setProfileFile, setProfilePreview,
  handleDeleteProfile, handleImageChange,
}) {
  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>

      {/* ── Profile Photo ── */}
      <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
        <Avatar
          src={profilePreview || profile.profilePic}
          sx={{ width: 100, height: 100, mb: 2, border: `3px solid ${brandColor}` }}
        />
        <Button variant="outlined" component="label" size="small">
          Change Photo
          <input
            type="file" hidden accept="image/*"
            onChange={(e) => handleImageChange(e, setProfileFile, setProfilePreview)}
          />
        </Button>
      </Box>

      <Grid container spacing={2.5}>

        {/* Business Type — owner only. Switches the dashboard + public site. */}
        {userRole.isOwner && (
          <Grid item xs={12}>
            <TextField
              select
              label="Business Type"
              value={profile.businessType || "barber"}
              fullWidth
              onChange={e => setProfile(p => ({ ...p, businessType: e.target.value }))}
              helperText="Switches your dashboard tabs and public site to match. Press Save to apply."
            >
              <MenuItem value="barber">Barber</MenuItem>
              <MenuItem value="hairdresser">Hairdresser</MenuItem>
              <MenuItem value="decorator">Decorator</MenuItem>
              <MenuItem value="trainer">Personal Trainer</MenuItem>
            </TextField>
          </Grid>
        )}

        {/* Full Name */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Full Name"
            value={profile.name || ""}
            fullWidth
            onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
          />
        </Grid>

        {/* Opening Times — owner only */}
        {userRole.isOwner && (
          <Grid item xs={12} sm={6}>
            <TextField
              label="Opening Times"
              value={safeRenderOpeningHours(profile.openingHours)}
              fullWidth multiline rows={4}
              placeholder={"e.g. Mon-Fri 9am-6pm\nSat: 10am-4pm\nSun: Closed"}
              onChange={e => setProfile(p => ({ ...p, openingHours: e.target.value }))}
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

        {/* Phone */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Phone"
            value={profile.phone || ""}
            fullWidth
            onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
          />
        </Grid>

        {/* Business Email */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Business Email"
            type="email"
            placeholder="hello@yourbusiness.com"
            value={profile.businessEmail || profile.contactEmail || ""}
            fullWidth
            onChange={e => setProfile(p => ({ ...p, businessEmail: e.target.value, contactEmail: e.target.value }))}
          />
        </Grid>

        {/* Address — owner only */}
        {userRole.isOwner && (
          <Grid item xs={12} sm={6}>
            <TextField
              label="Location / Address"
              value={profile.address || ""}
              fullWidth
              onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
            />
          </Grid>
        )}

        {/* Specialty */}
        <Grid item xs={12}>
          <TextField
            label="Specialty"
            value={profile.specialty || ""}
            fullWidth
            onChange={e => setProfile(p => ({ ...p, specialty: e.target.value }))}
          />
        </Grid>

        {/* Bio */}
        <Grid item xs={12}>
          <TextField
            label="Personal Bio"
            value={profile.bio || ""}
            fullWidth multiline rows={2}
            onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
          />
        </Grid>

        {/* ── Social Media & Media — ALL barbers ── */}
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Social Media & Content
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            Add your social links — these appear in the footer of your public page.
          </Typography>
          <Grid container spacing={2}>

            {/* Instagram */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Instagram URL"
                placeholder="https://instagram.com/yourhandle"
                fullWidth
                value={profile.instagramUrl || ""}
                onChange={e => setProfile(p => ({ ...p, instagramUrl: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <InstagramIcon fontSize="small" sx={{ color: "#E1306C" }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* TikTok */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="TikTok URL"
                placeholder="https://tiktok.com/@yourhandle"
                fullWidth
                value={profile.tiktokUrl || ""}
                onChange={e => setProfile(p => ({ ...p, tiktokUrl: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box sx={{ display: "flex", alignItems: "center", color: "#000" }}>
                        <TikTokIcon size={18} />
                      </Box>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>


            {/* Facebook — owners only */}
            {userRole.isOwner && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Facebook URL"
                  placeholder="https://facebook.com/yourpage"
                  fullWidth
                  value={profile.facebookUrl || ""}
                  onChange={e => setProfile(p => ({ ...p, facebookUrl: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FacebookIcon fontSize="small" sx={{ color: "#1877F2" }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            )}

          </Grid>
        </Grid>

        {/* ── About Us — owners only ── */}
        {userRole.isOwner && (
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              <InfoIcon sx={{ verticalAlign: "middle", mr: 1 }} />
              Shop "About Us"
            </Typography>
            <TextField
              label="About Our Shop"
              value={profile.aboutUs || ""}
              fullWidth multiline rows={4}
              placeholder="Tell customers about your shop history..."
              onChange={e => setProfile(p => ({ ...p, aboutUs: e.target.value }))}
            />
          </Grid>
        )}

        {/* ── Danger Zone ── */}
        <Grid item xs={12}>
          <Divider sx={{ my: 4 }} />
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
        </Grid>

      </Grid>
    </Paper>
  );
}