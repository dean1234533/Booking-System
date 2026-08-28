import React from "react";
import {
  Dialog, DialogContent, Box, Typography, Grid,
  Button, Chip, IconButton, Divider, Stack, Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useNavigate } from "react-router-dom";

const G = {
  gold:      "#2563EB",
  goldLight: "#60A5FA",
  dark:      "#0d0d0d",
};
const SANS  = "'DM Sans', sans-serif";
const SERIF = "'Playfair Display', serif";

const FEES = [
  {
    type: "Online bookings",
    rate: "0%",
    desc: "No commission, ever. Your client only ever pays Stripe's own real card processing cost — you receive your full deposit amount.",
  },
  {
    type: "Invoices",
    rate: "0%",
    desc: "No commission. You receive the full amount when your client pays a Stripe invoice you send from the dashboard, minus only Stripe's own processing cost.",
  },
  {
    type: "In-person QR pay",
    rate: "0%",
    desc: "No commission. Generate a QR code in seconds — no card reader needed.",
  },
];

const INCLUDES = [
  "Your own branded website",
  "Online booking system",
  "Stripe payments & deposits",
  "Invoice sending & tracking",
  "In-person QR payments",
  "Instagram, TikTok & YouTube links",
  "Custom domain support",
  "Full business dashboard",
];

export default function PricingModal({ open, onClose }) {
  const navigate = useNavigate();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
    >
      {/* ── Dark header ── */}
      <Box sx={{ bgcolor: G.dark, p: { xs: 3, md: 4 }, position: "relative" }}>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: "absolute", top: 16, right: 16,
            color: "rgba(255,255,255,0.45)",
            "&:hover": { color: "#fff" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <Chip
          label="Transparent pricing"
          size="small"
          sx={{
            bgcolor: "rgba(37,99,235,0.15)", color: G.gold,
            fontFamily: SANS, fontWeight: 600, fontSize: "0.68rem",
            letterSpacing: "0.08em", mb: 2,
          }}
        />
        <Typography sx={{
          fontFamily: SERIF, fontWeight: 400, color: "#fff",
          fontSize: { xs: "1.75rem", md: "2.4rem" }, lineHeight: 1.15,
        }}>
          Simple,{" "}
          <em style={{ fontStyle: "italic", color: G.gold }}>transparent</em>
          {" "}pricing
        </Typography>
        <Typography sx={{
          fontFamily: SANS, fontSize: "0.9rem",
          color: "rgba(255,255,255,0.5)", mt: 1.5, maxWidth: 480, lineHeight: 1.75,
        }}>
          90-day free trial, then from £10-15/month depending on your business type. No commission — only Stripe's own processing cost when you earn.
        </Typography>
      </Box>

      {/* ── Body ── */}
      <DialogContent sx={{ p: { xs: 3, md: 4 }, bgcolor: "#faf8f4" }}>
        <Grid container spacing={4}>

          {/* ── Subscription card ── */}
          <Grid item xs={12} md={5}>
            <Paper elevation={0} sx={{
              p: 3, borderRadius: 2,
              border: `2px solid ${G.gold}`, bgcolor: "#fff",
              height: "100%", display: "flex", flexDirection: "column",
            }}>
              <Typography sx={{
                fontFamily: SANS, fontSize: "0.68rem", fontWeight: 700,
                letterSpacing: "0.15em", textTransform: "uppercase",
                color: G.gold, mb: 1.5,
              }}>
                Platform subscription
              </Typography>

              <Typography sx={{ fontFamily: SANS, fontSize: "0.8rem", color: "#7a7060", mb: 2.5, fontWeight: 600 }}>
                Pricing by business type:
              </Typography>

              <Box sx={{ mb: 2.5, p: 2, bgcolor: "#f9f9f9", borderRadius: 1.5, border: "1px solid #e8e2d8" }}>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.8rem", fontWeight: 600, color: G.dark }}>
                      Barber, Hairdresser, Decorator
                    </Typography>
                    <Box display="flex" alignItems="baseline" gap={0.5}>
                      <Typography sx={{ fontFamily: SERIF, fontSize: "1.8rem", fontWeight: 400, color: G.dark }}>
                        £10
                      </Typography>
                      <Typography sx={{ fontFamily: SANS, fontSize: "0.85rem", color: "#7a7060" }}>
                        /month
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.8rem", fontWeight: 600, color: G.dark }}>
                      Personal Trainers
                    </Typography>
                    <Box display="flex" alignItems="baseline" gap={0.5}>
                      <Typography sx={{ fontFamily: SERIF, fontSize: "1.8rem", fontWeight: 400, color: G.dark }}>
                        £15
                      </Typography>
                      <Typography sx={{ fontFamily: SANS, fontSize: "0.85rem", color: "#7a7060" }}>
                        /month
                      </Typography>
                    </Box>
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: "#7a7060", mt: 0.5 }}>
                      Unlimited clients
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Typography sx={{ fontFamily: SANS, fontSize: "0.8rem", color: "#7a7060", mb: 2.5 }}>
                After your 90-day free trial — no card required to start
              </Typography>

              <Divider sx={{ mb: 2.5 }} />

              <Stack spacing={1.2} flex={1}>
                {INCLUDES.map(item => (
                  <Stack key={item} direction="row" spacing={1} alignItems="center">
                    <CheckCircleIcon sx={{ fontSize: 16, color: G.gold, flexShrink: 0 }} />
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.83rem", color: G.dark }}>
                      {item}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              <Button
                fullWidth
                variant="contained"
                onClick={() => { onClose(); navigate("/signup"); }}
                sx={{
                  mt: 3, bgcolor: G.gold, color: G.dark,
                  fontFamily: SANS, fontWeight: 700, fontSize: "0.82rem",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  borderRadius: "2px", boxShadow: "none",
                  "&:hover": { bgcolor: G.goldLight, boxShadow: "none" },
                }}
              >
                Start free trial
              </Button>
              <Typography sx={{
                fontFamily: SANS, fontSize: "0.72rem", color: "#aaa",
                textAlign: "center", mt: 1.5,
              }}>
                No card required for the 90-day trial
              </Typography>
            </Paper>
          </Grid>

          {/* ── Fee breakdown ── */}
          <Grid item xs={12} md={7}>
            <Typography sx={{
              fontFamily: SANS, fontSize: "0.68rem", fontWeight: 700,
              letterSpacing: "0.15em", textTransform: "uppercase",
              color: "#7a7060", mb: 2,
            }}>
              Transaction fees
            </Typography>
            <Typography sx={{
              fontFamily: SANS, fontSize: "0.85rem", color: "#7a7060",
              mb: 3, lineHeight: 1.75,
            }}>
              No commission, ever — not on a single transaction.
              The only thing added at checkout is Stripe's own real processing cost (~1.5% + 20p), which we don't mark up.
            </Typography>
            <Box component="img" src="/images/stripe/powered-by-stripe-black.svg" alt="Powered by Stripe" sx={{ height: 16, display: "block", mb: 3 }} />

            <Stack spacing={2}>
              {FEES.map(f => (
                <Paper key={f.type} elevation={0} sx={{
                  p: 2.5, borderRadius: 2,
                  border: "1px solid #e8e2d8", bgcolor: "#fff",
                }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                    <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.9rem", color: G.dark }}>
                      {f.type}
                    </Typography>
                    <Chip
                      label={f.rate}
                      size="small"
                      sx={{
                        bgcolor: "rgba(37,99,235,0.12)", color: G.gold,
                        fontWeight: 700, fontFamily: SANS, fontSize: "0.8rem",
                      }}
                    />
                  </Stack>
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.8rem", color: "#7a7060", lineHeight: 1.65 }}>
                    {f.desc}
                  </Typography>
                </Paper>
              ))}
            </Stack>

            <Paper elevation={0} sx={{
              mt: 2.5, p: 2.5, borderRadius: 2,
              bgcolor: "#F0FFF4", border: "1px solid #C6F6D5",
            }}>
              <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.82rem", color: "#276749", mb: 0.5 }}>
                Example payout
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.8rem", color: "#2F855A", lineHeight: 1.75 }}>
                On a £20 online booking: your client pays £20.82 — just Stripe's own card processing cost, added on top, no commission from us.
                You receive the full <strong>£20.00</strong> deposit — nothing is deducted.
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* ── Footer note ── */}
        <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid #e8e2d8" }}>
          <Typography sx={{
            fontFamily: SANS, fontSize: "0.72rem", color: "#aaa",
            textAlign: "center", lineHeight: 1.85,
          }}>
            Stripe Connect is required to accept payments — free to set up from your dashboard.
            Stripe's own processing cost is collected automatically and is non-refundable once a payment is processed.
            Prices shown include VAT where applicable.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
