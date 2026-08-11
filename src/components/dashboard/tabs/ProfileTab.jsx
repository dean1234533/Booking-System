import React from "react";
import {
  Box, Paper, Avatar, Button, Grid, TextField, Typography,
  Divider, InputAdornment, MenuItem, Stack,
} from "@mui/material";
import AccessTimeIcon  from "@mui/icons-material/AccessTime";
import DeleteIcon      from "@mui/icons-material/Delete";
import InstagramIcon   from "@mui/icons-material/Instagram";
import FacebookIcon    from "@mui/icons-material/Facebook";
import PersonIcon      from "@mui/icons-material/Person";
import BusinessIcon    from "@mui/icons-material/Business";
import ContactsIcon    from "@mui/icons-material/Contacts";
import ShareIcon       from "@mui/icons-material/Share";
import CameraAltIcon   from "@mui/icons-material/CameraAlt";

const TikTokIcon = ({ size = 18 }) => (
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

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2.5 }}>
      <Box sx={{ width: 34, height: 34, borderRadius: "8px", bgcolor: "grey.100", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, mt: 0.25 }}>
        <Icon sx={{ fontSize: 17, color: "text.secondary" }} />
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "text.primary", lineHeight: 1.3 }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.25 }}>{subtitle}</Typography>}
      </Box>
    </Box>
  );
}

export default function ProfileTab({
  profile, setProfile, brandColor, userRole,
  profilePreview, setProfileFile, setProfilePreview,
  handleDeleteProfile, handleImageChange,
}) {
  return (
    <Stack spacing={2.5}>

      {/* ── Photo + Business Type ── */}
      <Paper variant="outlined" sx={{ borderRadius: "14px", p: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ xs: "center", sm: "flex-start" }}>

          {/* Avatar */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={profilePreview || profile.profilePic}
                sx={{ width: 96, height: 96, border: `3px solid ${brandColor}`, boxShadow: `0 0 0 4px ${brandColor}22` }}
              />
              <Box
                component="label"
                sx={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 28, height: 28, borderRadius: "50%",
                  bgcolor: brandColor, display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", boxShadow: 2,
                  "&:hover": { filter: "brightness(0.9)" },
                }}
              >
                <CameraAltIcon sx={{ fontSize: 14, color: "#fff" }} />
                <input type="file" hidden accept="image/*" onChange={(e) => handleImageChange(e, setProfileFile, setProfilePreview)} />
              </Box>
            </Box>
            <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>Click camera to change</Typography>
          </Box>

          {/* Business Type */}
          {userRole.isOwner && (
            <Box sx={{ flex: 1, width: "100%" }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: "text.primary", mb: 0.5 }}>Business Type</Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 1.5 }}>
                Switches your dashboard tabs and public booking page to match your business.
              </Typography>
              <TextField
                select
                value={profile.businessType || "barber"}
                fullWidth
                size="small"
                onChange={e => setProfile(p => ({ ...p, businessType: e.target.value }))}
              >
                <MenuItem value="barber">Barber</MenuItem>
                <MenuItem value="hairdresser">Hairdresser</MenuItem>
                <MenuItem value="decorator">Decorator</MenuItem>
                <MenuItem value="trainer">Personal Trainer</MenuItem>
              </TextField>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* ── Personal Info ── */}
      <Paper variant="outlined" sx={{ borderRadius: "14px", p: 3 }}>
        <SectionHeader icon={PersonIcon} title="Personal Info" subtitle="Your name, bio and specialty shown on your public profile." />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Full Name"
              value={profile.name || ""}
              fullWidth size="small"
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Specialty"
              placeholder="e.g. Weight loss, strength & conditioning"
              value={profile.specialty || ""}
              fullWidth size="small"
              onChange={e => setProfile(p => ({ ...p, specialty: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Personal Bio"
              placeholder="A short intro about you and your approach…"
              value={profile.bio || ""}
              fullWidth multiline rows={3} size="small"
              onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* ── Business Details ── */}
      {userRole.isOwner && (
        <Paper variant="outlined" sx={{ borderRadius: "14px", p: 3 }}>
          <SectionHeader icon={BusinessIcon} title="Business Details" subtitle="Address, opening hours, and about section for your public page." />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Location / Address"
                value={profile.address || ""}
                fullWidth size="small"
                onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Opening Times"
                value={safeRenderOpeningHours(profile.openingHours)}
                fullWidth multiline rows={3} size="small"
                placeholder={"Mon–Fri: 9am–6pm\nSat: 10am–4pm\nSun: Closed"}
                onChange={e => setProfile(p => ({ ...p, openingHours: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}>
                      <AccessTimeIcon fontSize="small" sx={{ color: "text.disabled" }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="About Us"
                value={profile.aboutUs || ""}
                fullWidth multiline rows={3} size="small"
                placeholder="Tell customers about your business, experience, and what makes you different…"
                onChange={e => setProfile(p => ({ ...p, aboutUs: e.target.value }))}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ── Contact ── */}
      <Paper variant="outlined" sx={{ borderRadius: "14px", p: 3 }}>
        <SectionHeader icon={ContactsIcon} title="Contact" subtitle="Phone and email visible to clients on your booking page." />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone"
              value={profile.phone || ""}
              fullWidth size="small"
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Business Email"
              type="email"
              placeholder="hello@yourbusiness.com"
              value={profile.businessEmail || profile.contactEmail || ""}
              fullWidth size="small"
              onChange={e => setProfile(p => ({ ...p, businessEmail: e.target.value, contactEmail: e.target.value }))}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* ── Social Media ── */}
      <Paper variant="outlined" sx={{ borderRadius: "14px", p: 3 }}>
        <SectionHeader icon={ShareIcon} title="Social Media" subtitle="Links appear in the footer of your public booking page." />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Instagram"
              placeholder="https://instagram.com/yourhandle"
              fullWidth size="small"
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
          <Grid item xs={12} sm={6}>
            <TextField
              label="TikTok"
              placeholder="https://tiktok.com/@yourhandle"
              fullWidth size="small"
              value={profile.tiktokUrl || ""}
              onChange={e => setProfile(p => ({ ...p, tiktokUrl: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Box sx={{ display: "flex", alignItems: "center", color: "#000" }}>
                      <TikTokIcon size={16} />
                    </Box>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          {userRole.isOwner && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Facebook"
                placeholder="https://facebook.com/yourpage"
                fullWidth size="small"
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
      </Paper>

      {/* ── Barber: Personal Staff Social Links ── */}
      {(!profile.businessType || profile.businessType === "barber") && (
        <Paper variant="outlined" sx={{ borderRadius: "14px", p: 3 }}>
          <SectionHeader icon={ShareIcon} title="Your Personal Social Links" subtitle="These appear on your individual barber profile — separate from the shop's links." />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Personal Instagram"
                placeholder="https://instagram.com/yourhandle"
                fullWidth size="small"
                value={profile.staffInstagram || ""}
                onChange={e => setProfile(p => ({ ...p, staffInstagram: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <InstagramIcon fontSize="small" sx={{ color: "#E1306C" }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Personal TikTok"
                placeholder="https://tiktok.com/@yourhandle"
                fullWidth size="small"
                value={profile.staffTiktok || ""}
                onChange={e => setProfile(p => ({ ...p, staffTiktok: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box sx={{ display: "flex", alignItems: "center", color: "#000" }}>
                        <TikTokIcon size={16} />
                      </Box>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Personal Facebook"
                placeholder="https://facebook.com/yourprofile"
                fullWidth size="small"
                value={profile.staffFacebook || ""}
                onChange={e => setProfile(p => ({ ...p, staffFacebook: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FacebookIcon fontSize="small" sx={{ color: "#1877F2" }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ── Danger Zone ── */}
      <Paper variant="outlined" sx={{ borderRadius: "14px", p: 3, borderColor: "error.light" }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: "error.main", mb: 0.5 }}>Danger Zone</Typography>
        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mb: 2 }}>
          Permanently delete your profile and all associated data. This cannot be undone.
        </Typography>
        <Button
          variant="outlined" color="error" size="small"
          startIcon={<DeleteIcon />}
          onClick={handleDeleteProfile}
          sx={{ borderRadius: "8px", fontWeight: 600 }}
        >
          Delete My Profile
        </Button>
      </Paper>

    </Stack>
  );
}
