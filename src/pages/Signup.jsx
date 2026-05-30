import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Box, Container, Typography, TextField, Button,
  Alert, CircularProgress, Paper, Grid, MenuItem,
  Select, InputLabel, FormControl, Divider
} from "@mui/material";
import {
  Storefront as StoreIcon,
  Person as PersonIcon,
  ContentCut as ContentCutIcon,
  Brush as BrushIcon,
  FitnessCenter as FitnessCenterIcon,
} from "@mui/icons-material";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { signUpBarber } from "../firebase/auth";

/**
 * Marketplace-Only Signup Component
 */
export default function Signup() {
  const navigate = useNavigate();

  const [isOwner, setIsOwner] = useState(true);
  const activeBrandColor = "#C9A84C";
  const logoPath = "/images/IMG_9763-removebg-preview.png";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    password: "",
    confirm: "",
    shopId: "",
    businessName: "",
    businessType: "barber"
  });

  const [shops, setShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!isOwner) {
      async function fetchShops() {
        try {
          setLoadingShops(true);
          // Only fetch barbershops — staff joining is a barber-shop-only concept
          const q = query(
            collection(db, "barbers"),
            where("role", "==", "owner"),
            where("businessType", "==", "barber")
          );
          const snap = await getDocs(q);
          const list = snap.docs.map(d => ({
            id: d.id,
            displayLabel: d.data().businessName || d.data().displayName || "Unnamed Shop",
            businessType: "barber",
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
    const updated = { ...form, [e.target.name]: e.target.value };
    // If switching away from barbershop, force back to owner mode — staff joining is barber-only
    if (e.target.name === "businessType" && e.target.value !== "barber") {
      setIsOwner(true);
    }
    setForm(updated);
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

      let resolvedBusinessType = form.businessType;
      if (!isOwner) {
        const selectedShopObj = shops.find(s => s.id === form.shopId);
        if (selectedShopObj && selectedShopObj.businessType) {
          resolvedBusinessType = selectedShopObj.businessType;
        } else {
          const shopDocSnap = await getDoc(doc(db, "barbers", form.shopId));
          if (shopDocSnap.exists()) {
            resolvedBusinessType = shopDocSnap.data().businessType || "barber";
          }
        }
      }

      const user = await signUpBarber({
        ...form,
        role,
        shopId: isOwner ? "self" : form.shopId,
        brandColor: activeBrandColor,
        businessType: resolvedBusinessType,
      });

      await waitForBarberDoc(user.uid, role);

      navigate(isOwner ? "/onboarding" : "/dashboard");
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
            alt="Bookrty Logo"
            sx={{ height: 120, width: "auto", mb: 2, mx: "auto", display: "block", filter: "drop-shadow(0px 4px 10px rgba(0,0,0,0.1))" }}
          />
          <Typography variant="h4" fontWeight={900}>
            {isOwner ? "Start Your Space" : "Join a Space"}
          </Typography>
        </Box>

        <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 6, borderTop: `6px solid ${activeBrandColor}`, boxShadow: "0 20px 60px rgba(0,0,0,0.05)" }}>
          <Box component="form" onSubmit={handleSubmit}>
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* ── Segmented toggle — only for barbershops (staff joining is barber-only) ── */}
            <Box sx={{ mb: 4, display: form.businessType === "barber" ? "flex" : "none", borderRadius: 2, overflow: "hidden", border: "1.5px solid #e0e0e0" }}>
              {[
                { value: true,  label: "Business Owner", icon: <StoreIcon sx={{ fontSize: 16 }} /> },
                { value: false, label: "Join a Space",   icon: <PersonIcon sx={{ fontSize: 16 }} /> },
              ].map(opt => (
                <Box
                  key={String(opt.value)}
                  onClick={() => setIsOwner(opt.value)}
                  sx={{
                    flex: 1, py: 1.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 1,
                    cursor: "pointer", transition: "all .2s",
                    bgcolor: isOwner === opt.value ? activeBrandColor : "#fff",
                    color:   isOwner === opt.value ? "#1a1a1a" : "#888",
                  }}
                >
                  {opt.icon}
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.04em" }}>{opt.label}</Typography>
                </Box>
              ))}
            </Box>

            <Grid container spacing={2}>
              {isOwner && (
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel id="business-type-label">Business Type</InputLabel>
                    <Select
                      labelId="business-type-label"
                      label="Business Type"
                      name="businessType"
                      value={form.businessType}
                      onChange={handleChange}
                      MenuProps={{ disablePortal: false, sx: { zIndex: 9999 } }}
                    >
                      <MenuItem value="barber">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <ContentCutIcon sx={{ fontSize: 16, color: "#C9A84C" }} />
                          Barbershop
                        </Box>
                      </MenuItem>
                      <MenuItem value="trainer">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <FitnessCenterIcon sx={{ fontSize: 16, color: "#3d2c0e" }} />
                          Personal Trainer
                        </Box>
                      </MenuItem>
                      <MenuItem value="hairdresser">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <ContentCutIcon sx={{ fontSize: 16, color: "#7c4e8a" }} />
                          Hair Salon
                        </Box>
                      </MenuItem>
                      <MenuItem value="decorator">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <BrushIcon sx={{ fontSize: 16, color: "#7a3520" }} />
                          Painting &amp; Decorating
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12}>
                {isOwner ? (
                  <TextField label="Business Name" name="businessName" fullWidth required value={form.businessName} onChange={handleChange} />
                ) : (
                  <TextField
                    select fullWidth label="Select Barbershop"
                    name="shopId" value={form.shopId} onChange={handleChange}
                    required disabled={loadingShops}
                    helperText={!loadingShops && shops.length === 0 ? "No barbershops found." : ""}
                  >
                    {loadingShops ? (
                      <MenuItem disabled><CircularProgress size={20} sx={{ mr: 2 }} /> Loading...</MenuItem>
                    ) : (
                      shops.map(shop => (
                        <MenuItem key={shop.id} value={shop.id}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <ContentCutIcon sx={{ fontSize: 15, color: "#C9A84C" }} />
                            {shop.displayLabel}
                          </Box>
                        </MenuItem>
                      ))
                    )}
                  </TextField>
                )}
              </Grid>


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
            Already have an account? <Link to="/login" style={{ color: activeBrandColor, textDecoration: "none", fontWeight: "bold" }}>Login</Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
