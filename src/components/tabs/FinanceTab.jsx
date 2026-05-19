import React from "react";
import {
  Grid, Paper, Typography, Alert, Button, Divider, TextField,
  Box, IconButton
} from "@mui/material";
import {
  Payments as PaymentsIcon,
  Language as LanguageIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { CircularProgress } from "@mui/material";

export default function FinanceTab({
  profile, setProfile, userRole,
  stripeLoading, handleConnectStripe,
}) {
  return (
    <Grid container spacing={3}>
      {/* ── Stripe & Deposit ── */}
      <Grid item xs={12} md={7}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={800} mb={2}>Payments</Typography>

          {profile.stripeConnected ? (
            <Alert severity="success" sx={{ mb: 2 }}>✅ Stripe Connected</Alert>
          ) : (
            <Button
              variant="contained"
              startIcon={stripeLoading ? <CircularProgress size={16} color="inherit" /> : <PaymentsIcon />}
              onClick={handleConnectStripe}
              disabled={stripeLoading}
              sx={{ bgcolor: "#635BFF", mb: 2 }}
            >
              {stripeLoading ? "Connecting..." : "Connect with Stripe"}
            </Button>
          )}

          <Divider sx={{ my: 2 }} />

          <TextField
            label="Default Deposit Amount (£)" type="number" fullWidth
            value={profile.depositAmount}
            onChange={e => setProfile(p => ({ ...p, depositAmount: e.target.value }))}
            inputProps={{ min: 10 }}
            error={Number(profile.depositAmount) < 10}
            helperText={Number(profile.depositAmount) < 10
              ? "Minimum deposit is £10 to cover payment fees" : ""} />
        </Paper>
      </Grid>

      {/* ── Custom Domain — owners only ── */}
      {userRole.isOwner && (
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: "#F0F7FF", border: "1px solid #CCE3FF" }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <LanguageIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={800}>Custom Domain</Typography>
              </Box>
              {(profile.customDomain || profile.vercelUrl) && (
                <IconButton size="small" component="a"
                  href={`https://${(profile.customDomain || profile.vercelUrl).replace(/^https?:\/\//, "")}`}
                  target="_blank">
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Your barber booking site's custom domain — used for Stripe return URLs and review links.
            </Typography>

            <TextField fullWidth size="small" label="Custom Domain"
              placeholder="my-barber-shop.co.uk"
              value={profile.customDomain || ""}
              onChange={e => setProfile(p => ({ ...p, customDomain: e.target.value }))}
              sx={{ mb: 1.5 }} />

            <TextField fullWidth size="small" label="Legacy Vercel URL (optional)"
              placeholder="my-app.vercel.app"
              value={profile.vercelUrl || ""}
              onChange={e => setProfile(p => ({ ...p, vercelUrl: e.target.value }))} />

            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Fill in "Custom Domain" if you're on Cloudflare Pages. Both fields are checked when routing visitors.
            </Typography>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
}