import React from "react";
import { Box, Avatar, Typography, IconButton, Button, CircularProgress, Tooltip } from "@mui/material";
import { LogOut, Save } from "lucide-react";

function contrastColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#1A1A1A" : "#ffffff";
}

export default function DashboardHeader({
  profile, setProfile, profilePreview, brandColor, uploading, handleLogout, handleSaveProfile,
  showSave = false,
}) {
  const saveTextColor = contrastColor(brandColor);

  return (
    <Box sx={{
      background: "rgba(255,255,255,.94)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid #E4E7EC",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <Box sx={{
        maxWidth: 1360, mx: "auto",
        px: { xs: 2, sm: 3 },
        minHeight: 64,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>

        {/* ── Left: avatar + identity + colour picker ── */}
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, sm: 2.5 } }}>

          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Avatar
              src={profilePreview || profile.profilePic}
              sx={{
                width: 36, height: 36, bgcolor: `${brandColor}18`, color: brandColor,
                border: "1px solid #E4E7EC", fontSize: ".85rem", fontWeight: 750,
              }}
            >
              {(profile.name || profile.businessName || "B").slice(0, 1).toUpperCase()}
            </Avatar>
          </Box>

          {/* Name + role */}
          <Box>
            <Typography sx={{
              lineHeight: 1.2, color: "#101828", fontSize: ".9rem",
              letterSpacing: "-.01em", fontWeight: 750,
            }}>
              {profile.businessName || profile.name || "Dashboard"}
            </Typography>
            <Typography sx={{ mt: .1, fontSize: ".68rem", fontWeight: 550, color: "#98A2B3" }}>
              {profile.role === "owner" ? "Owner workspace" : "Staff workspace"}
            </Typography>
          </Box>

          {/* Brand colour picker */}
          {setProfile && (
            <Tooltip title="Brand colour" placement="bottom">
              <Box
                component="label"
                sx={{ ml: { xs: 0, sm: 0.5 }, display: "flex", alignItems: "center", gap: 0.75, cursor: "pointer", userSelect: "none" }}
              >
                <Box sx={{
                  width: 20, height: 20, borderRadius: "50%", bgcolor: brandColor, flexShrink: 0,
                  border: "2px solid #fff",
                  boxShadow: `0 0 0 2px ${brandColor}18`,
                  transition: "transform .15s",
                  "&:hover": { transform: "scale(1.1)" },
                }} />
                <Typography sx={{
                  fontSize: ".68rem", fontWeight: 650, color: "#667085",
                  display: { xs: "none", sm: "block" },
                }}>
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

        {/* ── Right: logout + save ── */}
        <Box sx={{ display: "flex", gap: { xs: 0.75, sm: 1 }, alignItems: "center" }}>
          <IconButton
            onClick={handleLogout}
            aria-label="Log out"
            size="small"
            sx={{
              color: "#667085", border: "1px solid transparent", bgcolor: "transparent",
              borderRadius: 2, p: 1,
              transition: "all .18s",
              "&:hover": { color: "#D92D20", bgcolor: "#FEF3F2" },
            }}
          >
            <LogOut size={18} strokeWidth={1.8} />
          </IconButton>

          {showSave && <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={uploading}
            size="small"
            sx={{
              bgcolor: brandColor,
              color: saveTextColor,
              px: { xs: 1.75, sm: 2.5 },
              py: 0.95,
              fontSize: { xs: "0.72rem", sm: "0.76rem" },
              fontWeight: 700, borderRadius: 2,
              transition: "filter .2s",
              "&:hover":    { bgcolor: brandColor, filter: "brightness(.94)" },
              "&:disabled": { bgcolor: brandColor, opacity: 0.55, boxShadow: "none" },
            }}
            startIcon={uploading
              ? <CircularProgress size={13} sx={{ color: saveTextColor }} />
              : <Save size={15} strokeWidth={1.9} />}
          >
            {uploading ? "Saving…" : "Save changes"}
          </Button>}
        </Box>
      </Box>
    </Box>
  );
}
