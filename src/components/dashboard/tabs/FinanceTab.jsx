/**
 * FinanceTab.jsx
 *
 * Handles Stripe connection and deposit amount only.
 * Custom domain management has moved to DomainTab.
 */

import React from "react";
import {
  Grid, Paper, Typography, Alert, Button, Divider, TextField,
  CircularProgress,
} from "@mui/material";
import { Payments as PaymentsIcon } from "@mui/icons-material";

export default function FinanceTab({
  profile, setProfile, userRole,
  stripeLoading, handleConnectStripe,
}) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={7}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={800} mb={2}>Payments</Typography>

          {profile.stripeConnected ? (
            <Alert severity="success" sx={{ mb: 2 }}>✅ Stripe Connected</Alert>
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
              sx={{ bgcolor: "#635BFF", mb: 2 }}
            >
              {stripeLoading ? "Connecting..." : "Connect with Stripe"}
            </Button>
          )}

          <Divider sx={{ my: 2 }} />

          <TextField
            label="Default Deposit Amount (£)"
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
        </Paper>
      </Grid>
    </Grid>
  );
}