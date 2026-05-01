import React from "react";

// src/pages/Login.jsx
// Barber-only login page. Redirects to /dashboard on success.

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Box, Container, Typography, TextField,
  Button, Alert, CircularProgress, Paper, Divider,
} from "@mui/material";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import { signInBarber } from "../firebase/auth";

export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname ?? "/Dashboard";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInBarber({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 6, md: 10 } }}>
      <Box textAlign="center" mb={4}>
        <ContentCutIcon sx={{ fontSize: 36, color: "secondary.main", mb: 1 }} />
        <Typography variant="h4" fontWeight={700}>Barber Login</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Sign in to manage your availability and bookings.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <TextField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth required autoFocus sx={{ mb: 2 }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth required sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="text.secondary" textAlign="center">
          New barber?{" "}
          <Link to="/signup" style={{ color: "inherit", fontWeight: 600 }}>
            Create an account
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}
