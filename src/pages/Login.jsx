import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, CircularProgress, IconButton, InputAdornment,
  Stack, TextField, Typography,
} from "@mui/material";
import {
  ArrowForward as ArrowForwardIcon,
  LockOutlined as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import AuthShell, { AUTH_GOLD } from "../components/auth/AuthShell";
import { resetBarberPassword, signInBarber } from "../firebase/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email address and password.");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await signInBarber(email.trim(), password);
      navigate(from, { replace: true });
    } catch {
      setError("We couldn’t sign you in. Check your email and password, then try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      setError("Enter your email address first, then choose “Forgot password?”");
      return;
    }
    setResetLoading(true);
    setError(null);
    setNotice(null);
    try {
      await resetBarberPassword(email.trim());
      setNotice("Password reset email sent. Check your inbox for the next step.");
    } catch {
      setError("We couldn’t send the reset email. Check the address and try again.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <AuthShell
      compact
      eyebrow="Welcome back"
      title="Your business, ready when you are."
      description="Sign in to manage bookings, clients, payments and your public business page."
    >
      <Box sx={{ maxWidth: 460, mx: "auto" }}>
        <Box sx={{ mb: 3.5 }}>
          <Typography component="h2" sx={{ fontWeight: 900, fontSize: { xs: "1.65rem", sm: "2rem" }, letterSpacing: "-.04em" }}>
            Sign in
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: ".84rem", mt: .75 }}>
            New to Bookrightly?{" "}
            <Box component={Link} to="/signup" sx={{ color: AUTH_GOLD, fontWeight: 850, textDecoration: "none" }}>
              Start your free trial
            </Box>
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.25}>
            {error && <Alert severity="error" sx={{ borderRadius: 2.5 }}>{error}</Alert>}
            {notice && <Alert severity="success" sx={{ borderRadius: 2.5 }}>{notice}</Alert>}

            <TextField
              label="Email address"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              fullWidth required autoFocus autoComplete="email"
              inputProps={{ inputMode: "email" }}
            />

            <Box>
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={event => setPassword(event.target.value)}
                fullWidth required autoComplete="current-password"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockIcon sx={{ fontSize: 18, color: "#9ca1ab" }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword(value => !value)}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="button"
                size="small"
                disabled={resetLoading}
                onClick={handlePasswordReset}
                sx={{ display: "block", ml: "auto", mt: .65, px: 0, color: "#666d78", fontSize: ".72rem" }}
              >
                {resetLoading ? "Sending…" : "Forgot password?"}
              </Button>
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              endIcon={!loading && <ArrowForwardIcon />}
              sx={{
                minHeight: 54, bgcolor: AUTH_GOLD, color: "#171717", fontWeight: 900,
                borderRadius: 2.5, "&:hover": { bgcolor: AUTH_GOLD, filter: "brightness(.92)" },
              }}
            >
              {loading ? <CircularProgress size={23} color="inherit" /> : "Sign in to dashboard"}
            </Button>
          </Stack>
        </Box>

        <Typography sx={{ color: "text.secondary", textAlign: "center", fontSize: ".69rem", mt: 3 }}>
          Secure sign-in · Your session stays private on this device
        </Typography>
      </Box>
    </AuthShell>
  );
}
