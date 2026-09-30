import React from "react";
import { Paper, Grid, Typography, Box, Avatar, Button, TextField, Divider } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

// The entire "handle booking and the logo upload" dashboard surface for
// Free-plan accounts (£0, MinimalBookingPage.jsx-adjacent but even
// barer — no nav, no footer). Deliberately not a cut-down EditPageTab/
// DesignTab — those carry hero images, nav/footer colour pickers and a
// font picker, none of which apply to a page with no hero, no nav and no
// footer to style. Mini also has no Profile or Integrations tab (see
// Dashboard.jsx), so — like Widget's IntegrationsTab — this is the only
// place a Mini account can reach Delete Account from.
export default function MiniPageTab({
  profile, setProfile,
  logoPreview, setLogoFile, setLogoPreview,
  handleImageChange,
  handleDeleteProfile,
}) {
  const set = (key, val) => setProfile(p => ({ ...p, [key]: val }));

  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={800} mb={0.5}>Your Page</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Everything customers see on your booking page, then press <strong>Save changes</strong> in the header to publish it.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Logo</Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar src={logoPreview || profile.logoUrl} variant="rounded" sx={{ width: 56, height: 56 }} />
            <Button variant="outlined" component="label" size="small">
              Upload Logo
              <input type="file" hidden accept="image/*"
                onChange={e => handleImageChange(e, setLogoFile, setLogoPreview)} />
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Brand Colour</Typography>
          <Box display="flex" alignItems="center" gap={1.5}>
            <input type="color" value={profile.brandColor || "#2563EB"}
              onChange={e => set("brandColor", e.target.value)}
              style={{ width: 48, height: 48, border: "none", cursor: "pointer", borderRadius: 8 }} />
            <Typography variant="caption" color="text.secondary">Accents on your booking page</Typography>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth size="small" label="Tagline"
            placeholder="e.g. Sharp cuts, no fuss"
            helperText="One short line shown under your business name"
            value={profile.heroTagline || ""}
            onChange={e => set("heroTagline", e.target.value)}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth size="small" label="City / Area"
            placeholder="e.g. Manchester"
            helperText="Shown on your page, and used in your page's Google search title"
            value={profile.city || ""}
            onChange={e => set("city", e.target.value)}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth size="small" label="Instagram link"
            placeholder="https://instagram.com/yourbusiness"
            helperText="Shown as a clear 'Follow us' button — this page has no gallery or about section, so it's the only way visitors can see more of your work"
            value={profile.instagramUrl || ""}
            onChange={e => set("instagramUrl", e.target.value)}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />
      <Typography variant="subtitle2" color="error" gutterBottom fontWeight={700}>
        Danger Zone
      </Typography>
      <Button
        variant="outlined"
        color="error"
        startIcon={<DeleteIcon />}
        onClick={handleDeleteProfile}
      >
        Delete My Account
      </Button>
    </Paper>
  );
}
