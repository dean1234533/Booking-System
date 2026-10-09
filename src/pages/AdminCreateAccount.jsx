import React, { useState } from "react";
import {
  Box, Container, Typography, TextField, Button, MenuItem,
  Alert, CircularProgress, Paper,
} from "@mui/material";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import AdminUnlockScreen from "../components/admin/AdminUnlockScreen";
import PWAInstallBanner from "../components/dashboard/PWAInstallBanner";

const BUSINESS_TYPES = [
  { value: "barber", label: "Barbershop" },
  { value: "hairdresser", label: "Hair salon" },
  { value: "decorator", label: "Decorator" },
  { value: "trainer", label: "Personal trainer" },
  { value: "plumber", label: "Plumbing, Heating & Electrical" },
];

// Internal-only tool: sets up a live, working account on a prospect's behalf
// (business profile + a booking link already claimed) instead of asking a
// cold contact to sit through signup + onboarding themselves — see the
// adminCreateAccount Cloud Function. Not linked anywhere in the app's own
// nav; the admin key (behind the password vault — see AdminUnlockScreen) is
// the actual gate.
export default function AdminCreateAccount() {
  const [adminKey, setAdminKey] = useState(null); // null = locked
  const [form, setForm] = useState({
    businessName: "", businessType: "barber", ownerName: "",
    email: "", phone: "", plan: "full",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function set(key) {
    return (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  if (adminKey === null) {
    return <AdminUnlockScreen onUnlock={setAdminKey} />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!form.businessName.trim() || !form.ownerName.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return setError("Business name, owner name and a valid email are required.");
    }

    setLoading(true);
    try {
      const functions = getFunctions(getApp(), "us-central1");
      const create = httpsCallable(functions, "adminCreateAccount");
      const res = await create({ adminKey, ...form });
      setResult(res.data);
      setForm({ businessName: "", businessType: "barber", ownerName: "", email: "", phone: "", plan: "full" });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PWAInstallBanner />
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f6f8", py: 6 }}>
      <Container maxWidth="sm">
        <Typography variant="h5" fontWeight={800} mb={0.5}>Set up an account</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Creates a live account with a claimed booking link and emails the owner a link to set their password.
        </Typography>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Business name" fullWidth required autoFocus value={form.businessName}
              onChange={set("businessName")} sx={{ mb: 2 }}
            />
            <TextField
              select label="Business type" fullWidth value={form.businessType}
              onChange={set("businessType")} sx={{ mb: 2 }}
            >
              {BUSINESS_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
            <TextField
              label="Owner's full name" fullWidth required value={form.ownerName}
              onChange={set("ownerName")} sx={{ mb: 2 }}
            />
            <TextField
              label="Owner's email" type="email" fullWidth required value={form.email}
              onChange={set("email")} sx={{ mb: 2 }}
            />
            <TextField
              label="Phone (optional)" fullWidth value={form.phone}
              onChange={set("phone")} sx={{ mb: 2 }}
            />
            <TextField
              select label="Plan" fullWidth value={form.plan}
              onChange={set("plan")} sx={{ mb: 3 }}
            >
              <MenuItem value="full">Full website — £10/mo</MenuItem>
              <MenuItem value="widget">Widget only — £5/mo</MenuItem>
              <MenuItem value="basic">Basic — simple booking page, no full site, £5/mo</MenuItem>
              <MenuItem value="free">Free — bare page, no deposits, no reminders, £0</MenuItem>
            </TextField>

            {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}
            {result && (
              <Alert severity="success" sx={{ mb: 2.5 }}>
                Live at bookrightly.co.uk/{result.slug} — password-set email sent to {result.email}.
              </Alert>
            )}

            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : "Create account"}
            </Button>
          </Box>
        </Paper>
      </Container>
      </Box>
    </>
  );
}
