import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import LiveQueueSection from "../components/LiveQueueSection";
import { getFontFamily, loadGoogleFont } from "../utils/fontOptions";


export default function QueuePage() {
  const { shopId }    = useParams();
  const [shop, setShop]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "barbers", shopId));
        if (snap.exists()) setShop({ id: snap.id, ...snap.data() });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [shopId]);

  const brandColor  = shop?.brandColor  || "#C9A84C";
  const fontKey     = shop?.siteFont;
  const displayFont = getFontFamily(fontKey, "playfair");

  useEffect(() => { if (fontKey) loadGoogleFont(fontKey); }, [fontKey]);

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ color: brandColor }} thickness={2} size={44} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0a0a0a" }}>

      {/* Shop header */}
      <Box sx={{ borderBottom: `3px solid ${brandColor}`, bgcolor: "#111", py: { xs: 3, md: 4 } }}>
        <Box sx={{ maxWidth: 600, mx: "auto", px: 3, display: "flex", alignItems: "center", gap: 2 }}>
          {(shop?.businessLogo || shop?.logoUrl) && (
            <Box
              component="img"
              src={shop.businessLogo || shop.logoUrl}
              alt="logo"
              sx={{ height: 44, width: 44, objectFit: "contain" }}
            />
          )}
          <Box>
            <Typography sx={{ fontFamily: displayFont, fontSize: "1.3rem", color: "#fff", lineHeight: 1.2 }}>
              {shop?.businessName || "The Barber Shop"}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", mt: 0.25 }}>
              Live Queue
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Queue section — handles open, paused, and closed states */}
      <LiveQueueSection
        shopId={shopId}
        brandColor={brandColor}
        displayFont={displayFont}
        showWhenClosed
      />
    </Box>
  );
}
