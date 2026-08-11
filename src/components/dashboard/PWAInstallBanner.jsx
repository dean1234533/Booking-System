import React, { useState, useEffect } from "react";
import { Box, Typography, IconButton, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import GetAppIcon from "@mui/icons-material/GetApp";
import IosShareIcon from "@mui/icons-material/IosShare";

const DISMISSED_KEY = "pwa_banner_dismissed";

function getPlatform() {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/macintosh/i.test(ua) && /safari/i.test(ua) && !/chrome/i.test(ua)) return "mac-safari";
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) return "chrome";
  if (/firefox/i.test(ua)) return "firefox";
  return "other";
}

export default function PWAInstallBanner({ brandColor = "#C9A84C" }) {
  const [visible, setVisible]             = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const isPWA = window.matchMedia("(display-mode: standalone)").matches || !!window.navigator.standalone;
    if (isPWA || sessionStorage.getItem(DISMISSED_KEY)) return;

    setVisible(true);

    // Use prompt captured before React mounted (never missed)
    if (window.__pwaInstallPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt);
    }

    const handler = (e) => {
      e.preventDefault();
      window.__pwaInstallPrompt = e;
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setVisible(false);
      setDeferredPrompt(null);
      return;
    }
    // No native prompt available (already-installed, event missed, or Safari/iOS):
    // show the manual steps so the button always does something useful.
    window.alert(instructionText);
  };

  if (!visible) return null;

  const platform = getPlatform();

  const promptReady = !!deferredPrompt;

  const instructionText = {
    ios:          'Tap the Share button, then "Add to Home Screen".',
    "mac-safari": 'Click the Share icon in Safari, then "Add to Dock".',
    chrome:       promptReady
                    ? 'Click "Install app" to get the full experience.'
                    : 'Click the install icon (⊕) in your address bar, or use ⋮ → "Install Bookrightly".',
    firefox:      'Open this page in Chrome or Safari to install the app.',
    other:        'Use your browser menu to install or add to home screen.',
  }[platform];

  // Always show the install button. When the browser has offered a native
  // install prompt we trigger it directly; otherwise the button shows the
  // manual steps for the user's platform (so it's never a dead/missing button).
  const showInstallButton = true;

  return (
    <>
      <Box sx={{
        background: `linear-gradient(135deg, #1a1a1a 0%, #111 100%)`,
        borderBottom: `2px solid ${brandColor}40`,
        borderLeft: `3px solid ${brandColor}`,
        px: { xs: 2, md: 3 },
        py: 1.25,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        position: "relative",
      }}>
        {/* Logo */}
        <Box sx={{
          width: 40, height: 40, borderRadius: "10px",
          bgcolor: "#fff",
          border: `1px solid ${brandColor}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, overflow: "hidden",
        }}>
          <Box
            component="img"
            src="/images/IMG_9763-removebg-preview.png"
            alt="Bookrightly"
            sx={{ width: 34, height: 34, objectFit: "contain" }}
          />
        </Box>

        {/* Text */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{
            fontSize: { xs: "0.72rem", sm: "0.8rem" },
            color: "rgba(255,255,255,0.85)",
            lineHeight: 1.4,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <Box component="span" sx={{ color: brandColor, fontWeight: 600 }}>
              Get the full app.{" "}
            </Box>
            {instructionText}
          </Typography>
        </Box>

        {/* Install button — always shown for Chrome/desktop */}
        {showInstallButton && (
          <Button
            size="small"
            startIcon={<GetAppIcon sx={{ fontSize: "14px !important" }} />}
            onClick={handleInstall}
            sx={{
              bgcolor: brandColor,
              color: "#111",
              fontWeight: 700,
              fontSize: "0.72rem",
              px: 1.5,
              py: 0.6,
              borderRadius: "8px",
              flexShrink: 0,
              whiteSpace: "nowrap",
              "&:hover": { bgcolor: brandColor, opacity: 0.85 },
            }}
          >
            Install app
          </Button>
        )}

        {/* Dismiss */}
        <IconButton
          size="small"
          onClick={handleDismiss}
          sx={{ color: "rgba(255,255,255,0.4)", flexShrink: 0, ml: 0.5 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </>
  );
}
