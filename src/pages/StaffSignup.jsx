import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Alert, Avatar, Box, Button, CircularProgress, IconButton,
  InputAdornment, Stack, TextField, Typography,
} from "@mui/material";
import { Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon } from "@mui/icons-material";
import { doc, getDoc } from "firebase/firestore";
import AuthShell, { AUTH_GOLD } from "../components/auth/AuthShell";
import { db } from "../firebase/config";
import { claimStaffInvite } from "../firebase/auth";
import { validatePassword, PASSWORD_HELP_TEXT } from "../utils/passwordValidation";

// Reached via an owner-issued invite link (Team tab → "Copy invite link"),
// scoped to one specific barbers/{shopId}/staff/{staffId} placeholder. This
// is the only way a staff member gets their own login — the old open
// "pick any shop from a dropdown" self-signup has been retired.
export default function StaffSignup() {
  const { shopId, staffId } = useParams();
  const navigate = useNavigate();

  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [shop, setShop] = useState(null);
  const [staffName, setStaffName] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    (async () => {
      try {
        const [shopSnap, staffSnap] = await Promise.all([
          getDoc(doc(db, "barbers", shopId)),
          getDoc(doc(db, "barbers", shopId, "staff", staffId)),
        ]);
        if (shopSnap.exists()) setShop(shopSnap.data());
        if (staffSnap.exists() && !staffSnap.data().hasLogin) {
          setInviteValid(true);
          setStaffName(staffSnap.data().name || "");
        }
      } finally {
        setLoadingInvite(false);
      }
    })();
  }, [shopId, staffId]);

  const brandColor = shop?.brandColor || AUTH_GOLD;
  const businessName = shop?.businessName || shop?.name || "your team";

  async function handleSubmit(event) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    const passwordError = validatePassword(password);
    if (passwordError) return setError(passwordError);
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    setError(null);
    try {
      await claimStaffInvite({ shopId, staffId, email: email.trim(), password });
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.code === "auth/password-does-not-meet-requirements"
          ? PASSWORD_HELP_TEXT
          : err.message || "We couldn't set up your login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loadingInvite) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!inviteValid) {
    return (
      <AuthShell eyebrow="Invite link" title="This invite link isn't valid" description="It may have already been used, or the team profile it points to was removed." compact>
        <Box sx={{ maxWidth: 480 }}>
          <Alert severity="warning" sx={{ borderRadius: 2.5, mb: 2 }}>
            Ask whoever manages {businessName} on Bookrightly to send you a fresh invite link from their Team tab.
          </Alert>
          <Typography sx={{ fontSize: ".85rem" }}>
            Already have an account? <Link to="/login" style={{ color: AUTH_GOLD, fontWeight: 800 }}>Sign in</Link>
          </Typography>
        </Box>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Team invite"
      title={`Join ${businessName} on Bookrightly`}
      description={`Set a password to activate ${staffName ? staffName + "'s" : "your"} profile and manage your own hours and page from your dashboard.`}
      compact
    >
      <Box sx={{ maxWidth: 480 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          <Avatar src={shop?.logoUrl} sx={{ width: 44, height: 44, bgcolor: brandColor }}>{businessName[0]}</Avatar>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: "1rem" }}>{staffName || "New team member"}</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: ".75rem" }}>Joining {businessName}</Typography>
          </Box>
        </Box>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5 }}>{error}</Alert>}
          <Stack spacing={2}>
            <TextField label="Email address" type="email" fullWidth required autoFocus
              value={email} onChange={e => { setEmail(e.target.value); setError(null); }} autoComplete="email" />
            <TextField
              label="Create password" fullWidth required
              type={showPassword ? "text" : "password"} value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              autoComplete="new-password" helperText={PASSWORD_HELP_TEXT}
              InputProps={{ endAdornment: <InputAdornment position="end"><IconButton aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(v => !v)}>{showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}</IconButton></InputAdornment> }}
            />
            <TextField
              label="Confirm password" fullWidth required
              type={showPassword ? "text" : "password"} value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(null); }}
              autoComplete="new-password" error={Boolean(confirm && password !== confirm)}
              helperText={confirm && password !== confirm ? "Passwords don't match yet." : " "}
            />
          </Stack>

          <Button
            type="submit" variant="contained" size="large" fullWidth disabled={loading}
            sx={{ mt: 2, minHeight: 52, bgcolor: brandColor, color: "#171717", fontWeight: 900, borderRadius: 2.5, "&:hover": { bgcolor: brandColor, filter: "brightness(.92)" } }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : "Activate my profile"}
          </Button>
        </Box>

        <Typography sx={{ color: "text.secondary", textAlign: "center", fontSize: ".75rem", mt: 3 }}>
          Already activated? <Link to="/login" style={{ color: AUTH_GOLD, fontWeight: 850, textDecoration: "none" }}>Sign in</Link>
        </Typography>
      </Box>
    </AuthShell>
  );
}
