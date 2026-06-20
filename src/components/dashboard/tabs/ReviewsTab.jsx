import React, { useState } from "react";
import {
  Grid, Paper, Box, Typography, Alert, Rating,
  IconButton, Tooltip, Button, Stack, Divider,
} from "@mui/material";
import DeleteIcon       from "@mui/icons-material/Delete";
import StarIcon         from "@mui/icons-material/StarRate";
import ContentCopyIcon  from "@mui/icons-material/ContentCopy";
import WhatsAppIcon     from "@mui/icons-material/WhatsApp";
import CheckIcon        from "@mui/icons-material/Check";

export default function ReviewsTab({ reviews, onDeleteReview, shopId, brandColor = "#C9A84C" }) {
  const [copied, setCopied] = useState(false);

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

          <Stack direction="row" spacing={1}>
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
          </Stack>
        </Paper>
      )}

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
