import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, CircularProgress } from "@mui/material";
import QRCode from "qrcode";

/**
 * Generates a downloadable QR code for the account's booking link — for
 * flyers, business cards, shop windows, appointment cards. Client-side only
 * (no third-party image service, no network dependency, doesn't send the
 * URL anywhere else).
 */
export default function BookingLinkQrDialog({ open, onClose, bookingSlug, brandColor = "#2563EB" }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  const url = bookingSlug ? `https://bookrightly.co.uk/${bookingSlug}` : "";

  useEffect(() => {
    if (!open || !url || !canvasRef.current) return;
    setReady(false);
    QRCode.toCanvas(canvasRef.current, url, { width: 260, margin: 2, color: { dark: "#000000", light: "#ffffff" } })
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, [open, url]);

  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `bookrightly-${bookingSlug}-qr.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Your booking page QR code</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: "text.secondary", fontSize: ".85rem", mb: 2 }}>
          Scan to open {url.replace(/^https:\/\//, "")}. Use this on flyers, business cards, shop windows, or appointment cards.
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center", position: "relative", minHeight: 260 }}>
          {!ready && <CircularProgress sx={{ position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px", color: brandColor }} size={24} />}
          <canvas ref={canvasRef} style={{ visibility: ready ? "visible" : "hidden", borderRadius: 8 }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" disabled={!ready} onClick={handleDownload}
          sx={{ bgcolor: brandColor, color: "#111", "&:hover": { bgcolor: brandColor, filter: "brightness(.92)" } }}>
          Download QR code
        </Button>
      </DialogActions>
    </Dialog>
  );
}
