import React from "react";
import { Box, Avatar, Typography, IconButton, Button, CircularProgress } from "@mui/material";
import { Logout as LogoutIcon, Save as SaveIcon } from "@mui/icons-material";

export default function DashboardHeader({
  profile, profilePreview, brandColor, uploading, handleLogout, handleSaveProfile
}) {
  return (
    <Box sx={{
      bgcolor: "white", p: 2, borderBottom: "1px solid #eee",
      position: "sticky", top: 0, zIndex: 100
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
        </Box>

        <Box display="flex" gap={1}>
          <IconButton onClick={handleLogout} color="error">
            <LogoutIcon />
          </IconButton>
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={uploading}
            sx={{ bgcolor: "#1A1A1A", "&:hover": { bgcolor: "#333" } }}
            startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          >
            {uploading ? "Saving…" : "Save"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}