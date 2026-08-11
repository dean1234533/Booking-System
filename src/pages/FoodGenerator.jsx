import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Box, Typography, CircularProgress } from "@mui/material";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import FoodGeneratorContent from "../components/FoodGeneratorContent";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FoodGenerator() {
  const { barberId, token } = useParams();

  const [status,      setStatus]      = useState("loading");
  const [trainerInfo, setTrainerInfo] = useState(null);

  useEffect(() => {
    if (!barberId || !token) { setStatus("error"); return; }
    (async () => {
      try {
        const linkSnap = await getDoc(doc(db, "barbers", barberId, "foodGeneratorLinks", token));
        if (!linkSnap.exists() || linkSnap.data().active === false) { setStatus("inactive"); return; }
        const barberSnap = await getDoc(doc(db, "barbers", barberId));
        if (barberSnap.exists()) setTrainerInfo(barberSnap.data());
        setStatus("active");
      } catch { setStatus("error"); }
    })();
  }, [barberId, token]);

  const brandColor = trainerInfo?.brandColor || "#C9A84C";

  if (status === "loading") {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ color: brandColor }} />
      </Box>
    );
  }

  if (status === "inactive" || status === "error") {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Box sx={{ textAlign: "center", maxWidth: 400 }}>
          <Typography variant="h3" sx={{ mb: 2 }}>{status === "inactive" ? "🔒" : "⚠️"}</Typography>
          <Typography variant="h5" fontWeight={800} sx={{ color: "#fff", mb: 1 }}>
            {status === "inactive" ? "Link Not Active" : "Something Went Wrong"}
          </Typography>
          <Typography variant="body2" sx={{ color: "#777" }}>
            {status === "inactive"
              ? "This nutrition guide link has been deactivated by your trainer. Contact them for a new link."
              : "We couldn't load this page. Please check your link and try again."}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0a0a0a", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
      <Box sx={{ borderBottom: "1px solid #1e1e1e", py: 3, px: { xs: 2, md: 4 }, display: "flex", alignItems: "center", gap: 2 }}>
        {trainerInfo?.logoUrl && (
          <Box component="img" src={trainerInfo.logoUrl} alt="logo" sx={{ height: 40, borderRadius: 1 }} />
        )}
        <Box>
          <Typography variant="h6" fontWeight={900} sx={{ color: "#fff", lineHeight: 1 }}>
            {trainerInfo?.businessName || trainerInfo?.name || "Nutrition Guide"}
          </Typography>
          <Typography variant="caption" sx={{ color: "#555" }}>Personalised Nutrition & Food Generator</Typography>
        </Box>
        <Box sx={{ ml: "auto" }}>
          <FitnessCenterIcon sx={{ color: brandColor, fontSize: 28 }} />
        </Box>
      </Box>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 4 }, py: 4 }}>
        <FoodGeneratorContent brandColor={brandColor} />
      </Box>
    </Box>
  );
}
