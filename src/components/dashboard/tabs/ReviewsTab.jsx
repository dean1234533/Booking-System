import React, { useState } from "react";
import {
  Grid, Paper, Box, Typography, Alert, Rating,
  IconButton, Tooltip, Button, Stack, Divider, Dialog,
} from "@mui/material";
import DeleteIcon       from "@mui/icons-material/Delete";
import StarIcon         from "@mui/icons-material/StarRate";
import ContentCopyIcon  from "@mui/icons-material/ContentCopy";
import WhatsAppIcon     from "@mui/icons-material/WhatsApp";
import CheckIcon        from "@mui/icons-material/Check";
import QrCode2Icon      from "@mui/icons-material/QrCode2";
import FullscreenIcon   from "@mui/icons-material/Fullscreen";

export default function ReviewsTab({ reviews, onDeleteReview, shopId, brandColor = "#C9A84C" }) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const reviewLink = shopId ? `${window.location.origin}/review/${shopId}` : null;

  const handleCopy = async () => {
    if (!reviewLink) return;
    try {
      await navigator.clipboard.writeText(reviewLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt("Copy this link to send to clients:", reviewLink);
    }
  };

  const handleWhatsApp = () => {
    if (!reviewLink) return;
    const msg = encodeURIComponent(
      `Hi! Thank you for your visit — I'd really appreciate a quick review 🙏\n${reviewLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <>
      {/* ── Send review link ── */}
      {reviewLink && (
        <Paper sx={{
          p: 2.5, mb: 4, borderRadius: "14px",
          background: `linear-gradient(135deg, ${brandColor}18 0%, ${brandColor}08 100%)`,
          border: `1px solid ${brandColor}33`,
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: "10px",
              bgcolor: `${brandColor}22`, border: `1px solid ${brandColor}44`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <StarIcon sx={{ color: brandColor, fontSize: 22 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", lineHeight: 1.2 }}>
                Ask for a review
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.25 }}>
                Send this link to clients — they can leave a review without needing an account
              </Typography>
            </Box>
          </Box>

          <Box sx={{
            px: 2, py: 1.25, borderRadius: "8px",
            bgcolor: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)",
            mb: 2, fontFamily: "monospace", fontSize: "0.78rem",
            color: "text.secondary", wordBreak: "break-all",
          }}>
            {reviewLink}
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            <Button
              size="small"
              variant={copied ? "contained" : "outlined"}
              startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
              onClick={handleCopy}
              sx={{
                borderColor: brandColor, color: copied ? "#fff" : brandColor,
                bgcolor: copied ? brandColor : "transparent",
                fontWeight: 600, fontSize: "0.78rem", textTransform: "none",
                "&:hover": { bgcolor: brandColor, color: "#fff", borderColor: brandColor },
              }}
            >
              {copied ? "Copied!" : "Copy link"}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<WhatsAppIcon />}
              onClick={handleWhatsApp}
              sx={{
                borderColor: "#25D366", color: "#25D366",
                fontWeight: 600, fontSize: "0.78rem", textTransform: "none",
                "&:hover": { bgcolor: "#25D36615", borderColor: "#25D366" },
              }}
            >
              Send via WhatsApp
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<QrCode2Icon />}
              onClick={() => setQrOpen(true)}
              sx={{
                borderColor: brandColor, color: brandColor,
                fontWeight: 600, fontSize: "0.78rem", textTransform: "none",
                "&:hover": { bgcolor: `${brandColor}15`, borderColor: brandColor },
              }}
            >
              Show QR code
            </Button>
          </Stack>
        </Paper>
      )}

      {/* ── QR code fullscreen dialog ── */}
      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: "20px", p: 0, overflow: "hidden" } }}>
        <Box sx={{ bgcolor: "#111", p: 4, textAlign: "center" }}>
          <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", mb: 1 }}>
            Leave a Review
          </Typography>
          <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem", mb: 3 }}>
            Scan to share your experience
          </Typography>
          <Box sx={{ bgcolor: "#fff", borderRadius: "16px", p: 2.5, display: "inline-block", mb: 3 }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=6&data=${encodeURIComponent(reviewLink)}`}
              alt="Review QR code"
              width={240}
              height={240}
              style={{ display: "block" }}
            />
          </Box>
          <Typography sx={{ color: "rgba(255,255,255,0.35)", fontSize: "0.78rem", mb: 3 }}>
            Show this to your client — takes 30 seconds to complete
          </Typography>
          <Stack direction="row" spacing={1.5} justifyContent="center">
            <Button
              variant="outlined"
              startIcon={<FullscreenIcon />}
              onClick={() => {
                const el = document.querySelector('[data-qr-dialog]');
                if (el?.requestFullscreen) el.requestFullscreen();
              }}
              sx={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff", textTransform: "none", fontWeight: 600, "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.08)" } }}
            >
              Fullscreen
            </Button>
            <Button
              variant="contained"
              onClick={() => setQrOpen(false)}
              sx={{ bgcolor: brandColor, color: "#000", fontWeight: 700, textTransform: "none", "&:hover": { bgcolor: brandColor, filter: "brightness(0.9)" } }}
            >
              Done
            </Button>
          </Stack>
        </Box>
      </Dialog>

      {/* ── Review list ── */}
      <Typography variant="h6" fontWeight={800} mb={2}>
        Received Reviews {reviews.length > 0 && `(${reviews.length})`}
      </Typography>

      {reviews.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: "10px" }}>
          No reviews yet — send your review link to clients to start collecting them.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {reviews.map(rev => (
            <Grid item xs={12} sm={6} key={rev.id}>
              <Paper sx={{ p: 2.5, borderRadius: "12px", border: `1px solid rgba(0,0,0,0.08)` }} variant="outlined">
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Box>
                    <Typography fontWeight={800}>{rev.customerName || "Anonymous"}</Typography>
                    <Rating value={rev.rating} readOnly size="small" />
                  </Box>
                  <Tooltip title="Delete review">
                    <IconButton size="small" color="error" onClick={() => onDeleteReview(rev.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary">{rev.comment}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}
