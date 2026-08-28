import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import {
  Grid, Paper, Typography, Alert, Button, Divider, TextField,
  CircularProgress, Box, LinearProgress, Chip,
} from "@mui/material";
import {
  Payments as PaymentsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from "@mui/icons-material";

// ── Get pricing based on business type ──────────────────────────────────────
function getPricingLabel(businessType) {
  if (businessType === "trainer") {
    return "£15/month";
  }
  return "£10/month";
}

// ── Fee calculator (mirrors src/utils/bookingHelpers.jsx / worker.js's handleCreateIntent) ──
// Platform fee is 0 — see the comment on PLATFORM_FEE_PERCENT in bookingHelpers.jsx.
function calcFees(depositGbp) {
  const depositPence      = Math.round(Number(depositGbp) * 100);
  const platformFee       = Math.round(depositPence * 0);
  const stripeTotalPct    = 0.0175;                                      // 1.5% + 0.25% connect
  const stripeFixed       = 45;                                          // 20p + 25p connect
  const customerPays      = Math.ceil(
    (depositPence + platformFee + stripeFixed) / (1 - stripeTotalPct)
  );
  const stripeFees        = customerPays - depositPence - platformFee;
  return {
    clientPays:  (customerPays / 100).toFixed(2),
    platformFee: (platformFee  / 100).toFixed(2),
    stripeFees:  (stripeFees   / 100).toFixed(2),
    youReceive:  Number(depositGbp).toFixed(2),
  };
}

// ── Timestamp → JS Date (handles Firestore Timestamp or plain object) ────────
function toDate(val) {
  if (!val) return null;
  if (typeof val.toDate === "function") return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  if (val instanceof Date) return val;
  return null;
}

// ── Sub-component: Subscription section ──────────────────────────────────────
function SubscriptionSection({ profile, barber, brandColor }) {
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscribeError, setSubscribeError] = useState("");
  const [portalError, setPortalError] = useState("");

  const status    = profile.subscriptionStatus || "trialing";
  const trialEnd  = toDate(profile.trialEndsAt);
  const now       = new Date();

  // Trial is actually 90 days (see src/firebase/auth.jsx's signup flow) —
  // this was hardcoded to 30, showing e.g. "Day 60/30" and a maxed-out
  // progress bar for most of a real trial.
  const TRIAL_LENGTH_DAYS = 90;
  const daysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)))
    : 0;
  const daysUsed     = TRIAL_LENGTH_DAYS - daysLeft;
  const trialPct     = Math.min(100, Math.round((daysUsed / TRIAL_LENGTH_DAYS) * 100));
  const trialUrgent  = daysLeft <= 5;

  async function handleSubscribe() {
    if (!barber?.uid || !barber?.email) return;
    setLoading(true);
    setSubscribeError("");
    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      const res  = await fetch("/api/create-subscription", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body:    JSON.stringify({
          barberId: barber.uid,
          email: barber.email,
          businessType: profile.businessType || "barber"
        }),
      });
      const data = await res.json();
      // Previously any non-{url} response (a 4xx/5xx with {error:"..."})
      // just fell through silently — the button would spin, then nothing
      // would happen with no explanation. Surface it instead.
      if (data.url) window.location.href = data.url;
      else setSubscribeError(data.error || `Checkout failed (HTTP ${res.status}).`);
    } catch (err) {
      setSubscribeError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBillingPortal() {
    if (!barber?.uid) return;
    setPortalLoading(true);
    setPortalError("");
    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      const res  = await fetch("/api/billing-portal", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body:    JSON.stringify({ barberId: barber.uid }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setPortalError(data.error || `Failed to open billing portal (HTTP ${res.status}).`);
    } catch (err) {
      setPortalError(err.message || "Something went wrong. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  // ── Trialing ──────────────────────────────────────────────────────────────
  if (status === "trialing") {
    return (
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Typography variant="h6" fontWeight={800}>Platform Subscription</Typography>
          <Chip
            label={`${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
            size="small"
            sx={{
              bgcolor: trialUrgent ? "#fef3c7" : "#ecfdf5",
              color:   trialUrgent ? "#92400e"  : "#065f46",
              fontWeight: 700,
              fontSize: "0.72rem",
            }}
          />
        </Box>

        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography sx={{ fontSize: "0.78rem", color: "#6b7280" }}>
              Free trial progress
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151" }}>
              Day {daysUsed} / {TRIAL_LENGTH_DAYS}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={trialPct}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.12)",
              "& .MuiLinearProgress-bar": {
                bgcolor: trialUrgent ? "#f59e0b" : brandColor,
                borderRadius: 3,
              },
            }}
          />
        </Box>

        {trialUrgent ? (
          <Alert severity="warning" sx={{ mb: 2, fontSize: "0.82rem" }}>
            Your trial ends {daysLeft === 0 ? "today" : `in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}. Subscribe now to avoid your site going offline.
          </Alert>
        ) : (
          <Typography sx={{ fontSize: "0.82rem", color: "#6b7280", mb: 2, lineHeight: 1.7 }}>
            Your site and dashboard are fully active during your {TRIAL_LENGTH_DAYS}-day free trial. No card required yet —
            you'll be prompted to subscribe before your trial ends.
          </Typography>
        )}

        <Button
          variant="contained"
          onClick={handleSubscribe}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{
            bgcolor: brandColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.8rem",
            letterSpacing: "0.05em",
            "&:hover": { bgcolor: brandColor, opacity: 0.9 },
          }}
        >
          {loading ? "Redirecting…" : `Subscribe early — ${getPricingLabel(profile.businessType || "barber")}`}
        </Button>
        {subscribeError && (
          <Alert severity="error" sx={{ mt: 1.5, fontSize: "0.78rem" }} onClose={() => setSubscribeError("")}>
            {subscribeError}
          </Alert>
        )}
      </Box>
    );
  }

  // ── Active ────────────────────────────────────────────────────────────────
  if (status === "active") {
    return (
      <Box>
        <Typography variant="h6" fontWeight={800} mb={1.5}>Platform Subscription</Typography>
        <Alert
          severity="success"
          icon={<CheckCircleIcon />}
          sx={{ mb: 2 }}
        >
          Active — {getPricingLabel(profile.businessType || "barber")}
        </Alert>
        <Typography sx={{ fontSize: "0.82rem", color: "#6b7280", mb: 2, lineHeight: 1.7 }}>
          Your subscription is active. Your booking site is live and taking appointments.
          You can manage, update payment details, or cancel at any time below.
        </Typography>
        <Button
          variant="outlined"
          onClick={handleBillingPortal}
          disabled={portalLoading}
          startIcon={portalLoading ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{ fontWeight: 700, fontSize: "0.8rem" }}
        >
          {portalLoading ? "Opening…" : "Manage billing"}
        </Button>
        {portalError && (
          <Alert severity="error" sx={{ mt: 1.5, fontSize: "0.78rem" }} onClose={() => setPortalError("")}>
            {portalError}
          </Alert>
        )}
      </Box>
    );
  }

  // ── Past due / Canceled ───────────────────────────────────────────────────
  const isCanceled = status === "canceled";
  return (
    <Box>
      <Typography variant="h6" fontWeight={800} mb={1.5}>Platform Subscription</Typography>
      <Alert
        severity="error"
        icon={<WarningIcon />}
        sx={{ mb: 2 }}
      >
        {isCanceled ? "Subscription cancelled" : "Subscription lapsed"}
      </Alert>
      <Typography sx={{ fontSize: "0.82rem", color: "#374151", mb: 2.5, lineHeight: 1.75 }}>
        {isCanceled
          ? "Your subscription has been cancelled. Your public booking site is offline and clients cannot make bookings."
          : "Your last payment failed and your subscription has lapsed. Your public booking site is currently offline."
        } Reactivate below to bring everything back online immediately.
      </Typography>
      <Button
        variant="contained"
        onClick={handleSubscribe}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
        sx={{
          bgcolor: "#dc2626",
          color: "#fff",
          fontWeight: 700,
          fontSize: "0.8rem",
          letterSpacing: "0.05em",
          "&:hover": { bgcolor: "#b91c1c" },
        }}
      >
        {loading ? "Redirecting…" : `Reactivate — ${getPricingLabel(profile.businessType || "barber")}`}
      </Button>
      {subscribeError && (
        <Alert severity="error" sx={{ mt: 1.5, fontSize: "0.78rem" }} onClose={() => setSubscribeError("")}>
          {subscribeError}
        </Alert>
      )}
    </Box>
  );
}

// ── Fee breakdown ─────────────────────────────────────────────────────────────
function FeeBreakdown({ depositAmount, brandColor }) {
  const deposit = Number(depositAmount);
  if (!deposit || deposit < 1) return null;
  const fees = calcFees(deposit);

  return (
    <Box sx={{
      mt: 2,
      bgcolor: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 2,
      p: 2,
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
        <InfoIcon sx={{ fontSize: 14, color: "#94a3b8" }} />
        <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Fee breakdown per booking
        </Typography>
      </Box>
      {[
        { label: "Client pays (grossed up)", value: `£${fees.clientPays}`, bold: true, color: "#1e293b" },
        { label: "Platform fee",              value: `£0.00 — we don't take one`, color: "#6b7280" },
        { label: "Stripe fees (~1.75% + 45p)", value: `−£${fees.stripeFees}`, color: "#6b7280" },
        { label: "You receive",               value: `£${fees.youReceive}`, bold: true, color: brandColor },
      ].map(row => (
        <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", py: 0.6 }}>
          <Typography sx={{ fontSize: "0.8rem", color: "#6b7280" }}>{row.label}</Typography>
          <Typography sx={{ fontSize: "0.8rem", fontWeight: row.bold ? 700 : 400, color: row.color }}>
            {row.value}
          </Typography>
        </Box>
      ))}
      <Typography sx={{ fontSize: "0.7rem", color: "#94a3b8", mt: 1, lineHeight: 1.6 }}>
        Fees are deducted automatically by Stripe. You always receive your exact deposit amount.
        UK domestic card rates shown — international cards may vary slightly.
      </Typography>
    </Box>
  );
}

// ── Main FinanceTab ───────────────────────────────────────────────────────────
export default function FinanceTab({
  profile, setProfile, userRole, barber,
  stripeLoading, handleConnectStripe,
  hideDeposit = false,
}) {
  const brandColor = profile.brandColor || "#2563EB";
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  // The owner is authenticated here, so this write satisfies firestore.rules'
  // barbers/{id} owner-write rule directly — no server round-trip needed.
  // Without any way to do this, a deleted/invalid Stripe account (e.g. the
  // owner removed it on Stripe's side) leaves stripeConnected stuck at
  // true forever, with "Connect with Stripe" never showing again since the
  // UI only offers that button when disconnected.
  async function handleDisconnectStripe() {
    if (!barber?.uid) return;
    setDisconnecting(true);
    try {
      await updateDoc(doc(db, "barbers", barber.uid), {
        stripeConnected: false,
        stripeAccountId: "",
      });
      setProfile(prev => ({ ...prev, stripeConnected: false, stripeAccountId: "" }));
      setConfirmDisconnect(false);
    } catch {
      // best-effort — button stays visible to retry
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={7}>

        {/* ── Subscription ── */}
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <SubscriptionSection
            profile={profile}
            barber={barber}
            brandColor={brandColor}
          />
        </Paper>

        {/* ── Stripe Connect ── */}
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={800} mb={2}>Stripe Connect</Typography>
          <Typography sx={{ fontSize: "0.82rem", color: "#6b7280", mb: 2, lineHeight: 1.7 }}>
            Connect your own Stripe account to receive online booking payments and deposits
            directly. We don't take a platform fee — the only thing added to what your client pays is Stripe's own real processing cost, and you always receive your full deposit amount.
          </Typography>

          {profile.stripeConnected ? (
            <Box sx={{ mb: 1 }}>
              <Alert severity="success" sx={{ mb: 1.5 }}>Stripe Connected</Alert>
              {confirmDisconnect ? (
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                  <Typography sx={{ fontSize: "0.8rem", color: "#6b7280" }}>
                    Disconnect this Stripe account? You'll need to connect again before taking payments.
                  </Typography>
                  <Button
                    size="small" variant="contained" color="error"
                    onClick={handleDisconnectStripe} disabled={disconnecting}
                    startIcon={disconnecting ? <CircularProgress size={14} color="inherit" /> : null}
                  >
                    {disconnecting ? "Disconnecting…" : "Confirm disconnect"}
                  </Button>
                  <Button size="small" onClick={() => setConfirmDisconnect(false)} disabled={disconnecting}>
                    Cancel
                  </Button>
                </Box>
              ) : (
                <Button size="small" color="error" variant="outlined" onClick={() => setConfirmDisconnect(true)}>
                  Disconnect Stripe
                </Button>
              )}
            </Box>
          ) : (
            <Button
              variant="contained"
              startIcon={
                stripeLoading
                  ? <CircularProgress size={16} color="inherit" />
                  : <PaymentsIcon />
              }
              onClick={handleConnectStripe}
              disabled={stripeLoading}
              sx={{ bgcolor: "#635BFF", mb: 1 }}
            >
              {stripeLoading ? "Connecting…" : "Connect with Stripe"}
            </Button>
          )}

          {!hideDeposit && (
            <>
              <Divider sx={{ my: 2.5 }} />
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Default Deposit Amount
              </Typography>
              <TextField
                label="Deposit (£)"
                type="number"
                fullWidth
                value={profile.depositAmount}
                onChange={e => setProfile(p => ({ ...p, depositAmount: e.target.value }))}
                inputProps={{ min: 10 }}
                error={Number(profile.depositAmount) < 10}
                helperText={
                  Number(profile.depositAmount) < 10
                    ? "Minimum deposit is £10 to cover payment fees"
                    : ""
                }
              />
              <FeeBreakdown depositAmount={profile.depositAmount} brandColor={brandColor} />
            </>
          )}
        </Paper>

      </Grid>
    </Grid>
  );
}
