import React from "react";
import {
  Box, Paper, Typography, Grid, Alert, Button, TextField,
  InputAdornment, Chip, Stack, CircularProgress
} from "@mui/material";
import {
  Nfc as NfcIcon,
  QrCode as QrCodeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";

export default function PayTab({
  profile, barber, setTab, financeTabIndex, brandColor,
  terminalAmount, setTerminalAmount,
  terminalService, setTerminalService,
  terminalNote,    setTerminalNote,
  terminalStatus,  terminalSession,
  handleCreateTerminalCharge, handleCancelTerminal, handleResetTerminal, handleCopyPayLink,
}) {
  return (
    <>
      {/* Info banner */}
      <Paper sx={{
        p: 2, borderRadius: 3, mb: 3,
        bgcolor: "#F0FFF4", border: "1px solid #C6F6D5",
        display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
      }}>
        <NfcIcon sx={{ color: "#38A169" }} />
        <Box flex={1}>
          <Typography variant="subtitle2" fontWeight={800} color="#276749">
            In-Person Payments via Stripe — 1.5% + 10p per transaction · Free to set up · No hardware needed
          </Typography>
          <Typography variant="caption" color="#2F855A">
            Customer scans the QR code and pays with Apple Pay, Google Pay, or card on their phone.
          </Typography>
        </Box>
      </Paper>

      {!profile.stripeConnected && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
          You need to connect Stripe before taking payments.{" "}
          <strong style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => setTab(financeTabIndex)}>
            Go to Finance tab →
          </strong>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* ── Charge builder ── */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={3}>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${brandColor}18` }}>
                <NfcIcon sx={{ color: brandColor, fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} lineHeight={1.2}>New Charge</Typography>
                <Typography variant="caption" color="text.secondary">Tap a service or enter amount</Typography>
              </Box>
            </Box>

            {/* Quick-select services */}
            {(profile.services || []).length > 0 && (
              <Box mb={2.5}>
                <Typography variant="caption" fontWeight={700} color="text.secondary"
                  sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1 }}>
                  Quick Select
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {(profile.services || []).map((s, i) => (
                    <Chip key={i} label={`${s.name}  £${s.price}`} clickable size="small"
                      onClick={() => { setTerminalAmount(String(s.price)); setTerminalService(s.name); }}
                      sx={{
                        fontWeight: 700,
                        bgcolor:    terminalService === s.name ? brandColor : `${brandColor}18`,
                        color:      terminalService === s.name ? "white" : "inherit",
                        "&:hover":  { bgcolor: `${brandColor}40` },
                      }} />
                  ))}
                </Box>
              </Box>
            )}

            <TextField label="Amount" type="number" fullWidth value={terminalAmount}
              onChange={e => { setTerminalAmount(e.target.value); setTerminalService(""); }}
              InputProps={{ startAdornment: <InputAdornment position="start">£</InputAdornment> }}
              inputProps={{ min: 0.5, step: 0.5 }}
              sx={{ mb: 2 }} disabled={terminalStatus === "awaiting"} />

            <TextField label="Note (optional)" fullWidth
              placeholder="e.g. Walk-in, extra beard trim…"
              value={terminalNote}
              onChange={e => setTerminalNote(e.target.value)}
              sx={{ mb: 3 }} disabled={terminalStatus === "awaiting"} />

            <Button fullWidth variant="contained" size="large"
              onClick={handleCreateTerminalCharge}
              disabled={
                !terminalAmount || Number(terminalAmount) <= 0 ||
                terminalStatus === "loading" || terminalStatus === "awaiting" ||
                !profile.stripeConnected
              }
              startIcon={terminalStatus === "loading"
                ? <CircularProgress size={20} color="inherit" />
                : <NfcIcon />}
              sx={{ bgcolor: "#1A1A1A", py: 1.5, fontSize: 16, fontWeight: 800, borderRadius: 2, "&:hover": { bgcolor: "#333" } }}>
              {terminalStatus === "loading"
                ? "Creating charge…"
                : `Charge £${terminalAmount ? Number(terminalAmount).toFixed(2) : "0.00"}`}
            </Button>
          </Paper>
        </Grid>

        {/* ── QR / status panel ── */}
        <Grid item xs={12} md={7}>
          {terminalStatus === "idle" && (
            <Paper sx={{
              p: 4, borderRadius: 3, textAlign: "center",
              border: "2px dashed #E2E8F0", height: "100%",
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 2, minHeight: 320,
            }}>
              <Box sx={{ p: 3, borderRadius: "50%", bgcolor: "#F7FAFC" }}>
                <QrCodeIcon sx={{ fontSize: 56, color: "#CBD5E0" }} />
              </Box>
              <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
                QR code appears here
              </Typography>
              <Typography variant="body2" color="text.disabled" maxWidth={280}>
                Select a service or enter an amount, then tap Charge to generate the payment QR code.
              </Typography>
            </Paper>
          )}

          {terminalStatus === "error" && (
            <Paper sx={{ p: 4, borderRadius: 3, textAlign: "center", minHeight: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              <Alert severity="error" sx={{ borderRadius: 2, width: "100%" }}>
                Something went wrong creating the charge. Check your Stripe connection and try again.
              </Alert>
              <Button variant="outlined" onClick={handleResetTerminal}>Try Again</Button>
            </Paper>
          )}

          {terminalStatus === "awaiting" && terminalSession && (
            <Paper sx={{ p: 3, borderRadius: 3, textAlign: "center" }}>
              <Typography variant="subtitle1" fontWeight={800} mb={0.5}>Show this to the customer</Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2.5}>
                They tap to pay with Apple Pay, Google Pay, or card
              </Typography>
              <Box sx={{
                display: "inline-block", p: 2, bgcolor: "white", borderRadius: 3,
                border: `3px solid ${brandColor}`, boxShadow: `0 4px 24px ${brandColor}30`, mb: 2.5,
              }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(terminalSession.url)}`}
                  alt="Scan to pay" width={200} height={200}
                  style={{ display: "block", borderRadius: 8 }} />
              </Box>
              <Typography variant="h3" fontWeight={900} sx={{ color: brandColor, mb: 0.5 }}>
                £{Number(terminalAmount).toFixed(2)}
              </Typography>
              {terminalService && (
                <Chip label={terminalService} size="small"
                  sx={{ mb: 2, bgcolor: `${brandColor}18`, fontWeight: 700 }} />
              )}
              {terminalNote && !terminalService && (
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  {terminalNote}
                </Typography>
              )}
              <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={2.5}>
                <CircularProgress size={14} sx={{ color: brandColor }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Waiting for payment…
                </Typography>
              </Box>
              <Stack direction="row" spacing={1.5} justifyContent="center">
                <Button size="small" variant="outlined" startIcon={<CopyIcon />}
                  onClick={handleCopyPayLink}>Copy Link</Button>
                <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />}
                  onClick={handleCancelTerminal}>Cancel</Button>
              </Stack>
            </Paper>
          )}

          {terminalStatus === "paid" && (
            <Paper sx={{
              p: 4, borderRadius: 3, textAlign: "center",
              border: "2px solid #C6F6D5", bgcolor: "#F0FFF4", minHeight: 320,
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 1.5,
            }}>
              <Box sx={{ p: 2.5, borderRadius: "50%", bgcolor: "#C6F6D5" }}>
                <CheckCircleIcon sx={{ fontSize: 56, color: "#276749" }} />
              </Box>
              <Typography variant="h6" fontWeight={800} color="#276749">Payment Received!</Typography>
              <Typography variant="h3" fontWeight={900} sx={{ color: "#1A1A1A" }}>
                £{Number(terminalAmount).toFixed(2)}
              </Typography>
              {terminalService && (
                <Typography variant="body2" color="text.secondary" fontWeight={600}>{terminalService}</Typography>
              )}
              {terminalNote && !terminalService && (
                <Typography variant="body2" color="text.secondary">{terminalNote}</Typography>
              )}
              <Button variant="contained" sx={{ mt: 2, bgcolor: "#1A1A1A", borderRadius: 2, fontWeight: 800 }}
                startIcon={<NfcIcon />} onClick={handleResetTerminal}>
                New Charge
              </Button>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* How it works */}
      <Paper sx={{ p: 2.5, borderRadius: 3, mt: 3, bgcolor: "#FFFBF0", border: "1px solid #FEF3C7" }}>
        <Typography variant="subtitle2" fontWeight={800} mb={1.5}>How it works</Typography>
        <Grid container spacing={2}>
          {[
            ["1️⃣", "Enter amount or pick a service"],
            ["2️⃣", "Tap Charge — a QR code appears instantly"],
            ["3️⃣", "Customer scans with their phone camera"],
            ["4️⃣", "They tap Apple Pay / Google Pay to pay"],
          ].map(([num, text]) => (
            <Grid item xs={12} sm={6} md={3} key={num}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography fontSize={18}>{num}</Typography>
                <Typography variant="body2" color="text.secondary">{text}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </>
  );
}