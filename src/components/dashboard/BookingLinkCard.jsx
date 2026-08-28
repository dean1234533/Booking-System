import React, { useState } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ShareIcon from "@mui/icons-material/Share";
import QrCodeIcon from "@mui/icons-material/QrCode2";

/**
 * The account's always-on Bookrightly booking link — "Your booking page is
 * live" everywhere it's shown (dashboard overview, Domain tab, end of
 * onboarding). One component, several call sites, so Copy/Share never gets
 * re-implemented slightly differently in each place.
 */
export default function BookingLinkCard({ bookingSlug, brandColor = "#2563EB", showQrButton = true, onShowQr, sx = {} }) {
  const [copied, setCopied] = useState(false);

  if (!bookingSlug) return null;

  const url = `https://bookrightly.co.uk/${bookingSlug}`;

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: "Book with me on Bookrightly", url }); }
      catch { /* user cancelled — not an error */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Paper sx={{ position: "relative", overflow: "hidden", p: { xs: 2.5, md: 3.5 }, borderRadius: "8px 30px 30px 30px", border: 0, bgcolor: "#111116", color: "#fff", ...sx }}>
      <Box sx={{ position: "absolute", width: 210, height: 210, borderRadius: "50%", border: `42px solid ${brandColor}33`, right: -85, top: -110 }} />
      <Box sx={{ position: "relative", display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr auto" }, gap: 3, alignItems: "end" }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}><Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#93C5FD", boxShadow: "0 0 0 5px rgba(147,197,253,.14)" }} /><Typography sx={{ color: "#ffffff77", fontWeight: 900, fontSize: ".66rem", letterSpacing: ".12em", textTransform: "uppercase" }}>Your page is live</Typography></Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.25rem", md: "1.7rem" }, letterSpacing: "-.04em", wordBreak: "break-all" }}>{url.replace(/^https:\/\//, "")}</Typography>
          <Typography sx={{ color: "#ffffff66", fontSize: ".72rem", mt: 1, maxWidth: 550 }}>One link for Instagram, TikTok, Facebook and WhatsApp. Clients can book whenever they are ready.</Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" startIcon={<ContentCopyIcon />} onClick={handleCopy} sx={{ bgcolor: brandColor, color: "#fff", borderRadius: 99, px: 2, "&:hover": { bgcolor: brandColor, filter: "brightness(.92)" } }}>{copied ? "Copied" : "Copy"}</Button>
          <Button size="small" startIcon={<OpenInNewIcon />} component="a" href={url} target="_blank" rel="noopener noreferrer" sx={{ color: "#fff", border: "1px solid #ffffff30", borderRadius: 99 }}>Open</Button>
          <Button size="small" startIcon={<ShareIcon />} onClick={handleShare} sx={{ color: "#fff", border: "1px solid #ffffff30", borderRadius: 99 }}>Share</Button>
          {showQrButton && <Button size="small" aria-label="Show QR code" onClick={onShowQr} sx={{ minWidth: 40, width: 40, color: "#111116", bgcolor: "#93C5FD", borderRadius: "50%", "&:hover": { bgcolor: "#93C5FD", filter: "brightness(.92)" } }}><QrCodeIcon /></Button>}
        </Stack>
      </Box>
    </Paper>
  );
}
