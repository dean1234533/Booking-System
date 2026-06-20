import React, { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import WifiIcon from "@mui/icons-material/Wifi";

export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 3000);
    };
    const handleOffline = () => {
      setOnline(false);
      setJustReconnected(false);
    };
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online && !justReconnected) return null;

  return (
    <Box sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.25,
      px: { xs: 2, md: 3 },
      py: 1,
      bgcolor: online ? "#0d2b1a" : "#1a0d0d",
      borderBottom: `1px solid ${online ? "#22543d" : "#7f1d1d"}`,
      borderLeft: `3px solid ${online ? "#22c55e" : "#ef4444"}`,
    }}>
      {online
        ? <WifiIcon     sx={{ fontSize: 16, color: "#22c55e" }} />
        : <WifiOffIcon  sx={{ fontSize: 16, color: "#ef4444" }} />
      }
      <Typography sx={{
        fontSize: "0.75rem",
        fontFamily: "'DM Sans', sans-serif",
        color: online ? "#86efac" : "#fca5a5",
        fontWeight: 500,
      }}>
        {online
          ? "Back online — your data is syncing."
          : "You're offline. The app will continue working; changes will sync when you reconnect."
        }
      </Typography>
    </Box>
  );
}
