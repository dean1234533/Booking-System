import React from "react";
import { Box, Avatar, Typography, IconButton, Button, CircularProgress, Tooltip } from "@mui/material";
import { Logout as LogoutIcon, Save as SaveIcon } from "@mui/icons-material";

function contrastColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#1A1A1A" : "#ffffff";
}

export default function DashboardHeader({
  profile, setProfile, profilePreview, brandColor, uploading, handleLogout, handleSaveProfile
}) {
  const saveTextColor = contrastColor(brandColor);

  return (
    <Box sx={{
      bgcolor: "white",
      borderTop: `4px solid ${brandColor}`,
      borderBottom: "1px solid #eee",
      p: 2,
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            src={profilePreview || profile.profilePic}
            sx={{ width: 46, height: 46, border: `2px solid ${brandColor}` }}
          />
          <Box>
            <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2}>
              {profile.name || "Dashboard"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {profile.role === "owner" ? "Shop Owner" : "Staff Barber"}
            </Typography>
          </Box>

          {/* Inline brand-color picker */}
          {setProfile && (
            <Tooltip title="Brand colour" placement="bottom">
              <Box
                component="label"
                sx={{
                  ml: 1, display: "flex", alignItems: "center", gap: 0.75,
                  cursor: "pointer", userSelect: "none",
                }}
              >
                <Box sx={{
                  width: 24, height: 24, borderRadius: "50%",
                  bgcolor: brandColor,
                  border: "2px solid rgba(0,0,0,0.15)",
                  boxShadow: `0 0 0 3px ${brandColor}26`,
                  flexShrink: 0,
                  transition: "transform 0.15s",
                  "&:hover": { transform: "scale(1.15)" },
                }} />
                <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "text.secondary" }}>
                  Brand
                </Typography>
                <input
                  type="color"
                  value={brandColor}
                  onChange={e => setProfile(p => ({ ...p, brandColor: e.target.value }))}
                  style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                />
              </Box>
            </Tooltip>
          )}
        </Box>

        <Box display="flex" gap={1}>
          <IconButton onClick={handleLogout} color="error">
            <LogoutIcon />
          </IconButton>
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={uploading}
            sx={{
              bgcolor: brandColor,
              color: saveTextColor,
              "&:hover": { bgcolor: brandColor, filter: "brightness(0.88)" },
              "&:disabled": { bgcolor: brandColor, opacity: 0.6 },
            }}
            startIcon={uploading ? <CircularProgress size={16} sx={{ color: saveTextColor }} /> : <SaveIcon />}
          >
            {uploading ? "Saving…" : "Save"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}