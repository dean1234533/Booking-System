import React from "react";
import { Box, Avatar, Typography, IconButton, Button, CircularProgress, Tooltip, Stack } from "@mui/material";
import { Logout as LogoutIcon, Save as SaveIcon } from "@mui/icons-material";

const SERIF = "'Playfair Display', serif";
const SANS  = "'DM Sans', sans-serif";

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
      background: "rgba(245,243,237,.9)",
      backdropFilter: "blur(18px)",
      borderBottom: "1px solid #DEDDD8",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      {/* Subtle ambient glow strip beneath the brand border */}
      <Box sx={{ height: 3, background: `linear-gradient(to right, #2563EB, ${brandColor}, #FF735C)` }} />

      <Box sx={{
        maxWidth: 1200, mx: "auto",
        px: { xs: 2, sm: 3 },
        py: { xs: 1.5, sm: 2 },
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>

        {/* ── Left: avatar + identity + colour picker ── */}
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, sm: 2.5 } }}>

          {/* Avatar with glow ring */}
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Avatar
              src={profilePreview || profile.profilePic}
              sx={{
                width:  { xs: 38, sm: 46 },
                height: { xs: 38, sm: 46 },
                border: `2px solid ${brandColor}`,
                boxShadow: `0 0 0 4px ${brandColor}18`,
                fontFamily: SERIF,
              }}
            />
            {/* Online dot */}
            <Box sx={{
              position: "absolute", bottom: 1, right: 1,
              width: 9, height: 9, borderRadius: "50%",
              bgcolor: "#4ade80",
              border: "2px solid #F5F3ED",
              boxShadow: "0 0 5px rgba(74,222,128,0.6)",
            }} />
          </Box>

          {/* Name + role */}
          <Box>
            <Typography sx={{
              fontFamily: SERIF, lineHeight: 1.15,
              color: "#111116", fontSize: { xs: "0.95rem", sm: "1.05rem" },
              letterSpacing: "-.025em", fontWeight: 800,
            }}>
              {profile.name || "Dashboard"}
            </Typography>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
              <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: brandColor, flexShrink: 0 }} />
              <Typography sx={{
                fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: "#85858D",
              }}>
                {profile.role === "owner" ? "Shop Owner" : "Staff"}
              </Typography>
            </Stack>
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
                  boxShadow: `0 0 0 3px ${brandColor}22, 0 0 10px ${brandColor}35`,
                  transition: "transform .15s, box-shadow .15s",
                  "&:hover": { transform: "scale(1.2)", boxShadow: `0 0 0 3px ${brandColor}40, 0 0 18px ${brandColor}50` },
                }} />
                <Typography sx={{
                  fontFamily: SANS, fontSize: "0.57rem", fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: "#85858D",
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
              color: "#696A73",
              border: "1px solid #DEDDD8", bgcolor: "#fff",
              borderRadius: 99, p: 0.9,
              transition: "all .18s",
              "&:hover": { color: "#ff6b6b", borderColor: "rgba(255,107,107,0.3)", bgcolor: "rgba(255,107,107,0.06)" },
            }}
          >
            <LogoutIcon sx={{ fontSize: 17 }} />
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
              fontFamily: SANS,
              fontWeight: 700,
              letterSpacing: "0.08em",
              borderRadius: 99,
              boxShadow: `0 10px 26px ${brandColor}28`,
              transition: "box-shadow .2s, filter .2s",
              "&:hover":    { bgcolor: brandColor, filter: "brightness(1.1)", boxShadow: `0 0 24px ${brandColor}55` },
              "&:disabled": { bgcolor: brandColor, opacity: 0.55, boxShadow: "none" },
            }}
            startIcon={uploading
              ? <CircularProgress size={13} sx={{ color: saveTextColor }} />
              : <SaveIcon sx={{ fontSize: { xs: 14, sm: 15 } }} />}
          >
            {uploading ? "Saving…" : "Save changes"}
          </Button>}
        </Box>
      </Box>
    </Box>
  );
}
