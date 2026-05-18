import React, { useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Box, Container, Typography, TextField,
  Button, Alert, CircularProgress, Paper, Divider, Avatar
} from "@mui/material";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import { signInBarber } from "../firebase/auth";

/**
 * Tenant-Specific Login Component
 * Only used for custom domains or /shop/:id routes.
 */
export default function TenantLogin({ tenant }) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- BRANDING LOGIC ---
  // Memoize to prevent re-calculation and potential undefined flicker
  const activeTenant = useMemo(() => {
    const saved = JSON.parse(localStorage.getItem("active_tenant_branding") || "{}");
    return tenant || location.state?.tenant || (Object.keys(saved).length ? saved : null);
  }, [tenant, location.state?.tenant]);

  const brandColor = activeTenant?.brandColor || "#C9A84C";
  const businessName = activeTenant?.businessName || "Book-eh-Trim";
  const logoUrl = activeTenant?.businessLogo || activeTenant?.logoUrl || null;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInBarber(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError("Invalid credentials for this portal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 6, md: 10 } }}>
      <Box textAlign="center" mb={4} display="flex" flexDirection="column" alignItems="center">
        {logoUrl ? (
          <Avatar 
            src={logoUrl} 
            sx={{ width: 100, height: 100, mb: 2, borderRadius: 3, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }} 
            variant="rounded"
          />
        ) : (
          <ContentCutIcon sx={{ fontSize: 48, color: brandColor, mb: 1 }} />
        )}
        <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: "-0.04em", textTransform: 'uppercase' }}>
          {businessName}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          Professional Staff Portal
        </Typography>
      </Box>

      <Paper 
        variant="outlined" 
        sx={{ 
          p: 4, 
          borderRadius: 4, 
          borderTop: `6px solid ${brandColor}`, 
          boxShadow: '0 20px 60px rgba(0,0,0,0.05)' 
        }}
      >
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          
          <TextField
            label="Staff Email"
            fullWidth required autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ 
              mb: 2, 
              '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: brandColor },
              '& .MuiInputLabel-root.Mui-focused': { color: brandColor }
            }}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ 
              mb: 3, 
              '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: brandColor },
              '& .MuiInputLabel-root.Mui-focused': { color: brandColor }
            }}
          />
          
          <Button
            type="submit" variant="contained" fullWidth size="large" disabled={loading}
            sx={{ 
              py: 1.8, 
              fontWeight: 900, 
              bgcolor: brandColor, 
              '&:hover': { bgcolor: brandColor, filter: 'brightness(0.9)' } 
            }}
          >
            {/* Fixed: CircularProgress color changed from 'white' to 'inherit' to prevent theme errors */}
            {loading ? <CircularProgress size={24} color="inherit" /> : "Sign In to Portal"}
          </Button>
        </Box>
        
        <Divider sx={{ my: 3 }}><Typography variant="caption" fontWeight={700}>OR</Typography></Divider>
        
        <Typography variant="body2" color="text.secondary" textAlign="center">
          New staff member?{" "}
          <Link 
            to="/signup" 
            state={{ tenant: activeTenant }} 
            style={{ color: brandColor, fontWeight: 800, textDecoration: 'none' }}
          >
            Join Shop
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
}