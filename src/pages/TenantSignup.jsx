import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  Box, Container, Typography, TextField, Button,
  Alert, CircularProgress, Paper, Grid, MenuItem,
  Switch, Card, CardContent, Avatar, InputAdornment, Divider
} from "@mui/material";
import {
  ContentCut as ContentCutIcon,
  Storefront as StoreIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  Language as WebIcon,
  PersonAdd as PersonAddIcon
} from "@mui/icons-material";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { signUpBarber } from "../firebase/auth";

/**
 * Unified Signup Component
 * Handles both Marketplace (Owner/Staff Choice) and Tenant-Specific Staff Registration
 * @param {object} tenant - The active tenant object passed from AppShell
 */
export default function Signup({ tenant }) {
  const navigate = useNavigate();
  const location = useLocation();

  // --- SYNC BRANDING & CONTEXT LOGIC ---
  const savedTenant = JSON.parse(localStorage.getItem("active_tenant_branding"));
  const activeTenant = tenant || location.state?.tenant || savedTenant;

  // Context: If there's a tenant identified, they are registering as staff for that specific shop.
  // If no tenant, they default to owner but can toggle to staff.
  const [isOwner, setIsOwner] = useState(!activeTenant);
  
  const [form, setForm] = useState({
    name:            "",
    email:           "",
    phone:           "",
    specialty:       "",
    password:        "",
    confirm:         "",
    shopId:          activeTenant ? (activeTenant.id || activeTenant.uid) : "",
    businessName:    "",
  });

  const [shops,            setShops]            = useState([]);
  const [selectedShopData, setSelectedShopData] = useState(activeTenant || null);
  const [loadingShops,     setLoadingShops]     = useState(!activeTenant);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState(null);

  // --- DYNAMIC BRANDING ASSIGNMENT ---
  const activeBrandColor = activeTenant?.brandColor || selectedShopData?.brandColor || "#C9A84C";
  const activeLogo = activeTenant?.businessLogo || activeTenant?.logoUrl || selectedShopData?.logoUrl || null;
  const activeBusinessName = activeTenant?.businessName || selectedShopData?.displayLabel || "Bookrty";

  useEffect(() => {
    // Only fetch the list of shops if the user is on the main site and wants to join an existing shop
    if (!activeTenant && !isOwner) {
      async function fetchShops() {
        try {
          setLoadingShops(true);
          const q    = query(collection(db, "barbers"), where("role", "==", "owner"));
          const snap = await getDocs(q);
          const list = snap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              displayLabel: data.businessName || data.displayName || data.name || "Unnamed Shop",
            };
          });
          setShops(list);
        } catch (err) {
          console.error("Error fetching shops:", err);
          setError("Could not load shop list.");
        } finally {
          setLoadingShops(false);
        }
      }
      fetchShops();
    }
  }, [activeTenant, isOwner]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === "shopId") {
      setSelectedShopData(shops.find(s => s.id === value) || null);
    }
  }

  async function waitForBarberDoc(uid, expectedRole, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      const snap = await getDoc(doc(db, "barbers", uid));
      if (snap.exists() && snap.data().role === expectedRole) {
        return snap.data();
      }
      await new Promise(r => setTimeout(r, 300));
    }
    throw new Error("Account setup took too long. Please refresh.");
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
    <Box sx={{ bgcolor: "#F8F9FA", minHeight: "100vh", py: { xs: 6, md: 10 } }}>
      <Container maxWidth="sm">
        {/* Header Branding */}
        <Box textAlign="center" mb={4}>
         
          <Typography variant="h4" fontWeight={900}>
            {activeTenant ? `Join ${activeBusinessName}` : isOwner ? "Start Your Shop" : "Join a Shop"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {activeTenant ? "Create your professional staff account" : "Elite Barbering Network"}
          </Typography>
        </Box>

        <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 6, borderTop: `6px solid ${activeBrandColor}`, boxShadow: "0 20px 60px rgba(0,0,0,0.05)" }}>
          <Box component="form" onSubmit={handleSubmit}>
            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

            {/* Platform Toggle: Only shown if NOT on a specific tenant URL */}
            {!activeTenant && (
              <Box sx={{ mb: 4, p: 2, bgcolor: "#F0F2F5", borderRadius: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {isOwner ? <StoreIcon /> : <PersonIcon />}
                  <Typography variant="body2" fontWeight={800}>
                    {isOwner ? "Shop Owner" : "Staff Barber"}
                  </Typography>
                </Box>
                <Switch 
                  checked={isOwner} 
                  onChange={(e) => {
                    setIsOwner(e.target.checked);
                    if (e.target.checked) setForm(prev => ({ ...prev, shopId: "" }));
                  }} 
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: activeBrandColor }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: activeBrandColor } }}
                />
              </Box>
            )}

            <Grid container spacing={2}>
              {/* Conditional Shop Selection or Business Details */}
              <Grid item xs={12}>
                {isOwner ? (
                  <TextField label="Business Name" name="businessName" fullWidth required onChange={handleChange} sx={{ mb: 2 }} />
                ) : (
                  <>
                    {!activeTenant ? (
                      <TextField
                        select fullWidth label="Select Your Barber Shop"
                        name="shopId" value={form.shopId} onChange={handleChange}
                        required disabled={loadingShops}
                        sx={{ mb: 2 }}
                      >
                        {loadingShops ? (
                          <MenuItem disabled><CircularProgress size={20} sx={{ mr: 2 }} /> Loading...</MenuItem>
                        ) : (
                          shops.map(shop => <MenuItem key={shop.id} value={shop.id}>{shop.displayLabel}</MenuItem>)
                        )}
                      </TextField>
                    ) : (
                      <Card variant="outlined" sx={{ mb: 2, bgcolor: "#FAFAFA", borderStyle: "dashed", borderColor: activeBrandColor }}>
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: "12px !important" }}>
                          <Avatar src={activeLogo} sx={{ width: 32, height: 32 }} />
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="caption" color="text.secondary">Registering for:</Typography>
                            <Typography variant="body2" fontWeight={800}>{activeBusinessName}</Typography>
                          </Box>
                          <CheckIcon sx={{ color: activeBrandColor }} />
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </Grid>

              {/* Standard Fields */}
              <Grid item xs={12}>
                <TextField label="Full Name" name="name" fullWidth required onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Email Address" name="email" type="email" fullWidth required onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Professional Specialty" name="specialty" fullWidth placeholder="e.g. Skin Fades, Beard Trims" onChange={handleChange} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Password" name="password" type="password" fullWidth required onChange={handleChange} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Confirm" name="confirm" type="password" fullWidth required onChange={handleChange} />
              </Grid>
            </Grid>

            <Button
              type="submit" variant="contained" fullWidth size="large" disabled={loading}
              sx={{ mt: 4, py: 1.8, bgcolor: activeBrandColor, fontWeight: 800, "&:hover": { bgcolor: activeBrandColor, filter: 'brightness(0.9)' } }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : isOwner ? "Continue to Payout Setup" : "Register as Staff"}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />
          <Typography variant="body2" textAlign="center">
            Already have an account? <Link to="/login" state={{ tenant: activeTenant }} style={{ color: activeBrandColor, fontWeight: 700, textDecoration: 'none' }}>Login here</Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}