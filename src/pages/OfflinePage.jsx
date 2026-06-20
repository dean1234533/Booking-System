import React from "react";
import { Box, Typography, Button } from "@mui/material";
import WifiOffIcon from "@mui/icons-material/WifiOff";

const SERIF = "'Playfair Display', serif";
const SANS  = "'DM Sans', sans-serif";

export default function OfflinePage() {
  return (
    <Box sx={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      bgcolor: "#0d1117",
      color: "#fff",
      textAlign: "center",
      px: 3,
    }}>
      <WifiOffIcon sx={{ fontSize: 64, color: "#374151", mb: 3 }} />

      <Typography
        variant="h4"
        fontWeight={800}
        mb={2}
        sx={{ fontFamily: SERIF, letterSpacing: "0.02em" }}
      >
        This site is temporarily offline
      </Typography>

      <Typography sx={{
        fontFamily: SANS,
        color: "#9ca3af",
        fontSize: "1rem",
        lineHeight: 1.75,
        maxWidth: 480,
        mb: 5,
      }}>
        The business's subscription has lapsed and their booking site is currently
        unavailable. If you're the owner, log in to your dashboard to reactivate.
      </Typography>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
        <Button
          variant="contained"
          href="/login"
          sx={{
            bgcolor: "#C9A84C",
            color: "#0d0d0d",
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: "0.8rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            px: 4,
            py: 1.5,
            borderRadius: 0,
            "&:hover": { bgcolor: "#b8943e" },
          }}
        >
          Owner login
        </Button>
        <Button
          variant="outlined"
          href="/"
          sx={{
            color: "rgba(255,255,255,0.5)",
            borderColor: "rgba(255,255,255,0.15)",
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: "0.8rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            px: 4,
            py: 1.5,
            borderRadius: 0,
            "&:hover": { borderColor: "rgba(255,255,255,0.35)", bgcolor: "rgba(255,255,255,0.04)" },
          }}
        >
          Back to Bookrty
        </Button>
      </Box>

      <Typography sx={{
        mt: 8,
        fontFamily: SANS,
        fontSize: "0.7rem",
        color: "#374151",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}>
        Powered by Bookrty
      </Typography>
    </Box>
  );
}
