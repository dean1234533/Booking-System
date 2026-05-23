import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Box, Container, Typography, TextField, Button,
  Alert, CircularProgress, Paper, Grid, MenuItem,
  Switch, Divider
} from "@mui/material";
import {
  Storefront as StoreIcon,
  Person as PersonIcon
} from "@mui/icons-material";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { signUpBarber } from "../firebase/auth";

/**
 * Marketplace-Only Signup Component
 * For the main platform home page.
 */
export default function Signup() {
  const navigate = useNavigate();

  // Marketplace defaults
  const [isOwner, setIsOwner] = useState(true);
  const activeBrandColor = "#C9A84C"; // Your platform gold
  const logoPath = "/images/Logo.png";
  
  const [form, setForm] = useState({
    name:            "",
    email:           "",
    phone:           "",
    specialty:       "",
    password:        "",
    confirm:         "",
    shopId:          "",
    businessName:    "",
    customDomain:    "", // Updated from vercelUrl to support Cloudflare
    businessType:    "barber" // Multi-industry tracking state property
  });

  const [shops,        setShops]        = useState([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch available shops only if user switches to "Staff" mode
  useEffect(() => {
    if (!isOwner) {
      async function fetchShops() {
        try {
          setLoadingShops(true);
          const q    = query(collection(db, "barbers"), where("role", "==", "owner"));
          const snap = await getDocs(q);
          const list = snap.docs.map(d => ({
            id: d.id,
            displayLabel: d.data().businessName || d.data().displayName || "Unnamed Shop",
          }));
          setShops(list);
        } catch (err) {
          setError("Could not load shop list.");
        } finally {
          setLoadingShops(false);
        }
      }
      fetchShops();
    }
  }, [isOwner]);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function waitForBarberDoc(uid, expectedRole, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      const snap = await getDoc(doc(db, "barbers", uid));
      if (snap.exists() && snap.data().role === expectedRole) return snap.data();
      await new Promise(r => setTimeout(r, 300));
    }
    throw new Error("Account setup took too long.");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (!isOwner && !form.shopId) return setError("Please select a shop to join.");

    setLoading(true);
    setError(null);

    try {
      const role = isOwner ? "owner" : "staff";
      const user = await signUpBarber({
        ...form,
        role,
        shopId: isOwner ? "self" : form.shopId,
        brandColor: activeBrandColor,
        businessType: isOwner ? form.businessType : "barber",
        customDomain: isOwner && form.customDomain
          ? (form.customDomain.startsWith("http") ? form.customDomain : `https://${form.customDomain}`)
          : "",
      });

      await waitForBarberDoc(user.uid, role);

      if (isOwner) {
        const response = await fetch("/api/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: user.email, 
            barberId: user.uid, 
            businessName: form.businessName,
            businessType: form.businessType 
          }),
        });
        const { url } = await response.json();
        if (url) { window.location.href = url; return; }
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ bgcolor: "#F8F9FA", minHeight: "100vh", pt: { xs: 10, md: 14 }, pb: { xs: 6, md: 10 } }}>
      <Container maxWidth="sm">
        <Box textAlign="center" mb={4}>
          <Box 
            component="img"
            src={logoPath}
            alt="BOOK-EH-TRIM Logo"
            sx={{ 
              height: 120, 
              width: 'auto', 
              mb: 2, 
              mx: 'auto', 
              display: 'block',
              filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.1))'
            }}
          />
          <Typography variant="h4" fontWeight={900}>
            {isOwner ? "Start Your Space" : "Join a Space"}
          </Typography>
        </Box>

        <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 6, borderTop: `6px solid ${activeBrandColor}`, boxShadow: "0 20px 60px rgba(0,0,0,0.05)" }}>
          <Box component="form" onSubmit={handleSubmit}>
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box sx={{ mb: 4, p: 2, bgcolor: "#F0F2F5", borderRadius: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {isOwner ? <StoreIcon /> : <PersonIcon />}
                <Typography variant="body2" fontWeight={800}>{isOwner ? "Business Owner" : "Staff Provider"}</Typography>
              </Box>
              <Switch checked={isOwner} onChange={(e) => setIsOwner(e.target.checked)} />
            </Box>

            <Grid container spacing={2}>
              {isOwner && (
                <Grid item xs={12}>
                  <TextField
                    select 
                    fullWidth 
                    label="Industry Category"
                    name="businessType" 
                    value={form.businessType} 
                    onChange={handleChange}
                    required
                  >
                    <MenuItem value="barber">Barber / Grooming Shop</MenuItem>
                    <MenuItem value="trainer">Personal Training / Fitness</MenuItem>
                    <MenuItem value="photography">Photography Studio</MenuItem>
                    <MenuItem value="tutor">Educational Tutoring</MenuItem>
                  </TextField>
                </Grid>
              )}

              <Grid item xs={12}>
                {isOwner ? (
                  <TextField label="Business Name" name="businessName" fullWidth required value={form.businessName} onChange={handleChange} />
                ) : (
                  <TextField
                    select fullWidth label="Select Shop / Space"
                    name="shopId" value={form.shopId} onChange={handleChange}
                    required disabled={loadingShops}
                  >
                    {loadingShops ? (
                      <MenuItem disabled><CircularProgress size={20} sx={{ mr: 2 }} /> Loading...</MenuItem>
                    ) : (
                      shops.map(shop => <MenuItem key={shop.id} value={shop.id}>{shop.displayLabel}</MenuItem>)
                    )}
                  </TextField>
                )}
              </Grid>

              {isOwner && (
                <Grid item xs={12}>
                  <TextField 
                    label="Cloudflare Custom Domain" 
                    name="customDomain" 
                    fullWidth 
                    placeholder="e.g. tracking.yourdomain.com"
                    value={form.customDomain} 
                    onChange={handleChange} 
                  />
                </Grid>
              )}

              <Grid item xs={12}><TextField label="Full Name" name="name" fullWidth required value={form.name} onChange={handleChange} /></Grid>
              <Grid item xs={12}><TextField label="Email" name="email" type="email" fullWidth required value={form.email} onChange={handleChange} /></Grid>
              <Grid item xs={12}><TextField label="Specialty" name="specialty" fullWidth placeholder="e.g. Strength Training or Fades" value={form.specialty} onChange={handleChange} /></Grid>
              <Grid item xs={6}><TextField label="Password" name="password" type="password" fullWidth required value={form.password} onChange={handleChange} /></Grid>
              <Grid item xs={6}><TextField label="Confirm" name="confirm" type="password" fullWidth required value={form.confirm} onChange={handleChange} /></Grid>
            </Grid>

            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ mt: 4, bgcolor: activeBrandColor }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : isOwner ? "Continue" : "Register"}
            </Button>
          </Box>
          <Divider sx={{ my: 3 }} />
          <Typography variant="body2" textAlign="center">
            Already have an account? <Link to="/login" style={{ color: activeBrandColor, textDecoration: 'none', fontWeight: 'bold' }}>Login</Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}