import React, { useCallback, useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, CircularProgress } from "@mui/material";
import QRCode from "qrcode";

/**
 * Generates a downloadable QR code for a link — for flyers, business cards,
 * shop windows, appointment cards. Client-side only (no third-party image
 * service, no network dependency, doesn't send the URL anywhere else).
 *
 * Originally booking-link-only (hence the name and the bookingSlug prop,
 * still supported so existing callers don't need to change); pass `url`
 * directly to encode anything else, e.g. the live queue join link.
 */
export default function BookingLinkQrDialog({
  open, onClose, bookingSlug, brandColor = "#2563EB",
  url: urlProp, title = "Your booking page QR code", description, filename,
}) {
  // A plain useRef here raced MUI's Dialog transition: the effect that draws
  // the QR code ran on mount, but the <canvas> wasn't always attached to the
  // DOM yet on that same pass, so canvasRef.current was still null and the
  // draw call never happened — stuck on the loading spinner forever. A
  // callback ref fires exactly when the node actually mounts, so it can't
  // race the effect.
  const [canvasNode, setCanvasNode] = useState(null);
  const canvasRef = useCallback((node) => setCanvasNode(node), []);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  // Bumped to force the draw effect to re-run when the user hits "Try again".
  const [attempt, setAttempt] = useState(0);

  const url = urlProp || (bookingSlug ? `https://bookrightly.co.uk/${bookingSlug}` : "");

  useEffect(() => {
    if (!open || !url || !canvasNode) return;
    setReady(false);
    setError("");
    let settled = false;
    // Belt-and-braces: if toCanvas ever hangs instead of resolving or
    // rejecting, this stops it being an infinite, unexplained spinner.
    const timeout = setTimeout(() => {
      if (!settled) { settled = true; setError("Timed out generating the QR code."); }
    }, 6000);
    QRCode.toCanvas(canvasNode, url, { width: 260, margin: 2, color: { dark: "#000000", light: "#ffffff" } })
      .then(() => { if (!settled) { settled = true; clearTimeout(timeout); setReady(true); } })
      .catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        // Previously failed silently — stuck spinner forever with nothing to
        // go on. Surface the real reason so a repeat failure is diagnosable
        // instead of another guess.
        console.error("QR code generation failed:", err);
        setError(err?.message || "Something went wrong generating the QR code.");
        setReady(false);
      });
    return () => { settled = true; clearTimeout(timeout); };
  }, [open, url, canvasNode, attempt]);

  function handleDownload() {
    if (!canvasNode) return;
    const link = document.createElement("a");
    link.download = `${filename || `bookrightly-${bookingSlug || "link"}-qr`}.png`;
    link.href = canvasNode.toDataURL("image/png");
    link.click();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: "text.secondary", fontSize: ".85rem", mb: 2 }}>
          {description || `Scan to open ${url.replace(/^https:\/\//, "")}. Use this on flyers, business cards, shop windows, or appointment cards.`}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", minHeight: 260 }}>
          {!ready && !error && <CircularProgress sx={{ color: brandColor }} size={24} />}
          {error && (
            <Box sx={{ textAlign: "center", px: 2 }}>
              <Typography sx={{ color: "error.main", fontSize: ".82rem", fontWeight: 700, mb: .5 }}>Couldn't generate the QR code</Typography>
              <Typography sx={{ color: "text.secondary", fontSize: ".75rem", mb: 1.5 }}>{error}</Typography>
              <Button size="small" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
            </Box>
          )}
          <canvas ref={canvasRef} style={{ display: ready ? "block" : "none", borderRadius: 8 }} />
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
