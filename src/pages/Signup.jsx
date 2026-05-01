import React from "react";

// src/pages/Signup.jsx
// Barber signup page — creates Firebase Auth account + Firestore barber doc.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box, Container, Typography, TextField, Button,
  Alert, CircularProgress, Paper, Divider, Grid,
} from "@mui/material";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import { signUpBarber } from "../firebase/auth";

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:      "",
    email:     "",
    phone:     "",
    specialty: "",
    bio:       "",
    password:  "",
    confirm:   "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signUpBarber({
        name:      form.name,
        email:     form.email,
        password:  form.password,
        phone:     form.phone,
        specialty: form.specialty,
        bio:       form.bio,
      });
      navigate("/dashboard");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else {
        setError("Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 8 } }}>
      <Box textAlign="center" mb={4}>
        <ContentCutIcon sx={{ fontSize: 36, color: "secondary.main", mb: 1 }} />
        <Typography variant="h4" fontWeight={700}>Create Your Profile</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Set up your barber account to start accepting bookings.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Full Name" name="name" value={form.name}
                onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Email Address" name="email" type="email" value={form.email}
                onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Phone Number" name="phone" type="tel" value={form.phone}
                onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Specialty" name="specialty" value={form.specialty}
                onChange={handleChange} fullWidth required
                placeholder="e.g. Skin fades, Afro hair, Colour & highlights" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Bio" name="bio" value={form.bio}
                onChange={handleChange} fullWidth multiline rows={3}
                placeholder="Tell clients a bit about yourself and your experience…" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Password" name="password" type="password" value={form.password}
                onChange={handleChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Confirm Password" name="confirm" type="password" value={form.confirm}
                onChange={handleChange} fullWidth required />
            </Grid>
          </Grid>

          <Button
            type="submit" variant="contained" fullWidth size="large"
            disabled={loading} sx={{ mt: 3 }}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {loading ? "Creating Account…" : "Create Account"}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="text.secondary" textAlign="center">
          Already have an account?{" "}
          <Link to="/login" style={{ color: "inherit", fontWeight: 600 }}>
            Sign in
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}
