import React, { useState } from "react";
import { Box, Container, Typography, TextField, Button, Alert, CircularProgress, Paper, Link as MuiLink } from "@mui/material";
import { hasVault, clearVault, createVault, unlockVault } from "../../utils/adminVault";
import PWAInstallBanner from "../dashboard/PWAInstallBanner";

// Shared lock screen for every admin-only tool in this app (gated by
// ADMIN_ACCESS_KEY on the Worker side) — the real key is entered once per
// device and encrypted at rest behind a password of the admin's choosing;
// see src/utils/adminVault.js. Originally built inline in AdminCreateAccount,
// extracted so AdminChatLeads (and any future admin page) doesn't duplicate it.
export default function AdminUnlockScreen({ onUnlock, initialError = null }) {
  const [deviceHasVault, setDeviceHasVault] = useState(hasVault());
  const [adminKey, setAdminKey] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // Seeded once from the caller — e.g. "that admin key was rejected by the
  // server" after a page that verifies server-side (see AdminChatLeads)
  // clears a bad vault and sends the visitor back here.
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function handleSetup(e) {
    e.preventDefault();
    setError(null);
    if (!adminKey.trim()) return setError("Enter the admin key.");
    if (password.length < 4) return setError("Choose a password at least 4 characters long.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true);
    try {
      await createVault(adminKey.trim(), password);
      onUnlock(adminKey.trim());
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlock(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const key = await unlockVault(password);
      onUnlock(key);
    } catch {
      setError("Wrong password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PWAInstallBanner />
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f6f8", py: 6 }}>
      <Container maxWidth="sm">
        <Typography variant="h5" fontWeight={800} mb={0.5}>
          {deviceHasVault ? "Unlock" : "Set up this device"}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          {deviceHasVault
            ? "Enter your password to continue."
            : "First time here — enter the real admin key once and choose a password. You'll only need the password after this."}
        </Typography>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Box component="form" onSubmit={deviceHasVault ? handleUnlock : handleSetup}>
            {deviceHasVault ? (
              <TextField
                label="Password" type="password" fullWidth autoFocus value={password}
                onChange={(e) => setPassword(e.target.value)} sx={{ mb: 2.5 }}
              />
            ) : (
              <>
                <TextField
                  label="Admin key" type="password" fullWidth autoFocus value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)} sx={{ mb: 2 }}
                />
                <TextField
                  label="Choose a password" type="password" fullWidth value={password}
                  onChange={(e) => setPassword(e.target.value)} sx={{ mb: 2 }}
                />
                <TextField
                  label="Confirm password" type="password" fullWidth value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} sx={{ mb: 2.5 }}
                />
              </>
            )}

            {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : deviceHasVault ? "Unlock" : "Save & continue"}
            </Button>

            {deviceHasVault && (
              <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={2}>
                <MuiLink component="button" type="button" onClick={() => { clearVault(); setDeviceHasVault(false); }}>
                  Forgot password — reset this device
                </MuiLink>
              </Typography>
            )}
          </Box>
        </Paper>
      </Container>
      </Box>
    </>
  );
}
