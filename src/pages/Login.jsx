import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Box, Container, Typography, TextField,
  Button, Alert, CircularProgress, Paper, Divider
} from "@mui/material";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import { signInBarber } from "../firebase/auth";

/**
 * Marketplace-Only Login Component
 * Dedicated to the main platform home page.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Default Platform Branding
  const brandColor = "#C9A84C";
  const businessName = "Book-eh-Trim";
  const logoPath = "/images/Logo.png";

  // Effect to ensure the page starts at the top when mounted
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInBarber(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Removed top padding to pull the content to the top of the viewport */
   <Container maxWidth="xs" sx={{ pt: { xs: 10, md: 14 }, pb: { xs: 6, md: 10 } }}>
      <Box textAlign="center" mb={4} display="flex" flexDirection="column" alignItems="center">
        <Box 
          component="img"
          src={logoPath}
          alt="Logo"
          sx={{ 
            height: 100, 
            width: 'auto', 
            mb: 2 
          }}
        />
        
        <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: "-0.04em", textTransform: 'uppercase' }}>
          {businessName}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" mt={1} sx={{ fontWeight: 500 }}>
          Sign in to manage your shop.
        </Typography>
      </Box>

      <Paper 
        variant="outlined" 
        sx={{ 
          p: 4, borderRadius: 4, borderTop: `6px solid ${brandColor}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.05)'
        }}
      >
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          <TextField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth required autoFocus autoComplete="email"
            sx={{ mb: 2, '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: brandColor }, '& .MuiInputLabel-root.Mui-focused': { color: brandColor } }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth required autoComplete="current-password"
            sx={{ mb: 3, '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: brandColor }, '& .MuiInputLabel-root.Mui-focused': { color: brandColor } }}
          />

          <Button
            type="submit" variant="contained" fullWidth size="large" disabled={loading}
            sx={{ py: 1.8, fontWeight: 900, bgcolor: brandColor, borderRadius: 2, '&:hover': { bgcolor: brandColor, filter: 'brightness(0.9)' } }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Sign In"}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }}>
           <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 700 }}>OR</Typography>
        </Divider>

        <Typography variant="body2" color="text.secondary" textAlign="center">
          New to {businessName}?{" "}
          <Link 
            to="/signup" 
            style={{ color: brandColor, fontWeight: 800, textDecoration: 'none' }}
          >
            Create Account
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}