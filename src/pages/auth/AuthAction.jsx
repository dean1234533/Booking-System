import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert, Box, Button, CircularProgress, IconButton, InputAdornment,
  Stack, TextField, Typography,
} from "@mui/material";
import {
  CheckCircleOutline as CheckIcon,
  ErrorOutline as ErrorIcon,
  LockOutlined as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import {
  applyActionCode, checkActionCode, verifyPasswordResetCode, confirmPasswordReset,
} from "firebase/auth";
import { auth } from "../../firebase/config";
import AuthShell, { AUTH_GOLD } from "../../components/auth/AuthShell";

// The page Firebase's "Action URL" setting points to (Authentication ->
// Templates -> each template -> Customize action URL:
// https://bookrightly.co.uk/auth/action). Firebase appends mode/oobCode/
// continueUrl itself — this page reads those and completes whichever
// action they represent, instead of Firebase's own bare hosted page.
export default function AuthAction() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");
  const continueUrl = params.get("continueUrl");

  const [status, setStatus] = useState("checking"); // checking | verify-ok | verify-err | reset-ready | reset-done | reset-err | recover-ok | recover-err | invalid
  const [resetEmail, setResetEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!mode || !oobCode) { setStatus("invalid"); return; }

    (async () => {
      try {
        if (mode === "verifyEmail") {
          await applyActionCode(auth, oobCode);
          // Best-effort — refreshes the SDK's cached user if they're still
          // signed in on this device, so the dashboard's verification
          // banner clears immediately instead of waiting for its own poll.
          auth.currentUser?.reload().catch(() => {});
          setStatus("verify-ok");
        } else if (mode === "resetPassword") {
          const email = await verifyPasswordResetCode(auth, oobCode);
          setResetEmail(email);
          setStatus("reset-ready");
        } else if (mode === "recoverEmail") {
          await checkActionCode(auth, oobCode);
          await applyActionCode(auth, oobCode);
          setStatus("recover-ok");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus(mode === "resetPassword" ? "reset-err" : mode === "recoverEmail" ? "recover-err" : "verify-err");
      }
    })();
  }, [mode, oobCode]);

  async function handleResetSubmit(e) {
    e.preventDefault();
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus("reset-done");
    } catch {
      setFormError("That reset link has expired or already been used. Request a new one from the sign-in page.");
    } finally {
      setSubmitting(false);
    }
  }

  const continueHref = continueUrl || "/dashboard";
  const isExternalContinue = /^https?:\/\//.test(continueHref);

  function ContinueButton({ children }) {
    return isExternalContinue ? (
      <Button variant="contained" fullWidth size="large" component="a" href={continueHref}
        sx={{ minHeight: 54, bgcolor: AUTH_GOLD, color: "#171717", fontWeight: 900, borderRadius: 2.5, "&:hover": { bgcolor: AUTH_GOLD, filter: "brightness(.92)" } }}>
        {children}
      </Button>
    ) : (
      <Button variant="contained" fullWidth size="large" component={RouterLink} to={continueHref}
        sx={{ minHeight: 54, bgcolor: AUTH_GOLD, color: "#171717", fontWeight: 900, borderRadius: 2.5, "&:hover": { bgcolor: AUTH_GOLD, filter: "brightness(.92)" } }}>
        {children}
      </Button>
    );
  }

  let eyebrow = "Account";
  let title = "One moment…";
  let description = "Completing your request.";
  if (mode === "verifyEmail") { eyebrow = "Email verification"; title = "Verify your email"; description = "Confirming your email address for Bookrightly."; }
  else if (mode === "resetPassword") { eyebrow = "Password reset"; title = "Choose a new password"; description = "Set a new password for your Bookrightly account."; }
  else if (mode === "recoverEmail") { eyebrow = "Account recovery"; title = "Email change"; description = "Reviewing a recent change to your account email."; }

  return (
    <AuthShell compact eyebrow={eyebrow} title={title} description={description}>
      <Box sx={{ maxWidth: 460, mx: "auto" }}>
        {status === "checking" && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 5, gap: 2 }}>
            <CircularProgress sx={{ color: AUTH_GOLD }} />
            <Typography sx={{ color: "text.secondary", fontSize: ".85rem" }}>Just a moment…</Typography>
          </Box>
        )}

        {status === "verify-ok" && (
          <Stack spacing={2.5} alignItems="center" textAlign="center" sx={{ py: 2 }}>
            <CheckIcon sx={{ fontSize: 52, color: "#16A36A" }} />
            <Typography sx={{ fontWeight: 900, fontSize: "1.3rem" }}>Email verified</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: ".85rem" }}>
              Your email is confirmed. You're all set.
            </Typography>
            <ContinueButton>Continue to dashboard</ContinueButton>
          </Stack>
        )}

        {status === "verify-err" && (
          <Stack spacing={2.5} alignItems="center" textAlign="center" sx={{ py: 2 }}>
            <ErrorIcon sx={{ fontSize: 52, color: "#dc2626" }} />
            <Typography sx={{ fontWeight: 900, fontSize: "1.3rem" }}>Link expired</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: ".85rem" }}>
              This verification link has expired or was already used. Request a new one from your dashboard.
            </Typography>
            <ContinueButton>Continue to dashboard</ContinueButton>
          </Stack>
        )}

        {status === "reset-ready" && (
          <Box component="form" onSubmit={handleResetSubmit} noValidate>
            <Typography sx={{ color: "text.secondary", fontSize: ".84rem", mb: 2.5 }}>
              Resetting the password for <strong>{resetEmail}</strong>.
            </Typography>
            <Stack spacing={2.25}>
              {formError && <Alert severity="error" sx={{ borderRadius: 2.5 }}>{formError}</Alert>}
              <TextField
                label="New password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth required autoFocus autoComplete="new-password"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockIcon sx={{ fontSize: 18, color: "#9ca1ab" }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton edge="end" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((v) => !v)}>
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit" variant="contained" fullWidth size="large" disabled={submitting}
                sx={{ minHeight: 54, bgcolor: AUTH_GOLD, color: "#171717", fontWeight: 900, borderRadius: 2.5, "&:hover": { bgcolor: AUTH_GOLD, filter: "brightness(.92)" } }}
              >
                {submitting ? <CircularProgress size={23} color="inherit" /> : "Set new password"}
              </Button>
            </Stack>
          </Box>
        )}

        {status === "reset-done" && (
          <Stack spacing={2.5} alignItems="center" textAlign="center" sx={{ py: 2 }}>
            <CheckIcon sx={{ fontSize: 52, color: "#16A36A" }} />
            <Typography sx={{ fontWeight: 900, fontSize: "1.3rem" }}>Password updated</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: ".85rem" }}>
              Sign in with your new password.
            </Typography>
            <Button variant="contained" fullWidth size="large" component={RouterLink} to="/login"
              sx={{ minHeight: 54, bgcolor: AUTH_GOLD, color: "#171717", fontWeight: 900, borderRadius: 2.5, "&:hover": { bgcolor: AUTH_GOLD, filter: "brightness(.92)" } }}>
              Go to sign in
            </Button>
          </Stack>
        )}

        {status === "reset-err" && (
          <Stack spacing={2.5} alignItems="center" textAlign="center" sx={{ py: 2 }}>
            <ErrorIcon sx={{ fontSize: 52, color: "#dc2626" }} />
            <Typography sx={{ fontWeight: 900, fontSize: "1.3rem" }}>Link expired</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: ".85rem" }}>
              This password reset link has expired or was already used. Request a new one from the sign-in page.
            </Typography>
            <Button variant="contained" fullWidth size="large" component={RouterLink} to="/login"
              sx={{ minHeight: 54, bgcolor: AUTH_GOLD, color: "#171717", fontWeight: 900, borderRadius: 2.5, "&:hover": { bgcolor: AUTH_GOLD, filter: "brightness(.92)" } }}>
              Go to sign in
            </Button>
          </Stack>
        )}

        {status === "recover-ok" && (
          <Stack spacing={2.5} alignItems="center" textAlign="center" sx={{ py: 2 }}>
            <CheckIcon sx={{ fontSize: 52, color: "#16A36A" }} />
            <Typography sx={{ fontWeight: 900, fontSize: "1.3rem" }}>Email change reverted</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: ".85rem" }}>
              Your account email has been restored. If you didn't make this change, reset your password now.
            </Typography>
            <Button variant="contained" fullWidth size="large" component={RouterLink} to="/login"
              sx={{ minHeight: 54, bgcolor: AUTH_GOLD, color: "#171717", fontWeight: 900, borderRadius: 2.5, "&:hover": { bgcolor: AUTH_GOLD, filter: "brightness(.92)" } }}>
              Go to sign in
            </Button>
          </Stack>
        )}

        {status === "recover-err" && (
          <Stack spacing={2.5} alignItems="center" textAlign="center" sx={{ py: 2 }}>
            <ErrorIcon sx={{ fontSize: 52, color: "#dc2626" }} />
            <Typography sx={{ fontWeight: 900, fontSize: "1.3rem" }}>Link expired</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: ".85rem" }}>
              This link has expired or was already used.
            </Typography>
            <Button variant="contained" fullWidth size="large" component={RouterLink} to="/login"
              sx={{ minHeight: 54, bgcolor: AUTH_GOLD, color: "#171717", fontWeight: 900, borderRadius: 2.5, "&:hover": { bgcolor: AUTH_GOLD, filter: "brightness(.92)" } }}>
              Go to sign in
            </Button>
          </Stack>
        )}

        {status === "invalid" && (
          <Stack spacing={2.5} alignItems="center" textAlign="center" sx={{ py: 2 }}>
            <ErrorIcon sx={{ fontSize: 52, color: "#dc2626" }} />
            <Typography sx={{ fontWeight: 900, fontSize: "1.3rem" }}>Invalid link</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: ".85rem" }}>
              This link is missing or malformed. Check you copied the full link from your email.
            </Typography>
            <Button variant="contained" fullWidth size="large" component={RouterLink} to="/login"
              sx={{ minHeight: 54, bgcolor: AUTH_GOLD, color: "#171717", fontWeight: 900, borderRadius: 2.5, "&:hover": { bgcolor: AUTH_GOLD, filter: "brightness(.92)" } }}>
              Go to sign in
            </Button>
          </Stack>
        )}
      </Box>
    </AuthShell>
  );
}
