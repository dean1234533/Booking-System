import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, Grid,
  IconButton, InputAdornment, LinearProgress, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon, ArrowForward as ArrowForwardIcon,
  Brush as BrushIcon, Check as CheckIcon, ContentCut as ContentCutIcon,
  FitnessCenter as FitnessCenterIcon, Groups as GroupsIcon, Person as PersonIcon,
  Storefront as StoreIcon, Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import AuthShell, { AUTH_GOLD } from "../components/auth/AuthShell";
import { db } from "../firebase/config";
import { signUpBarber } from "../firebase/auth";

const BUSINESS_TYPES = [
  { value: "barber", label: "Barbershop", detail: "Appointments, queue and cut history", icon: <ContentCutIcon /> },
  { value: "hairdresser", label: "Hair salon", detail: "Services, bookings and client payments", icon: <ContentCutIcon /> },
  { value: "decorator", label: "Decorator", detail: "Quotes, projects and colour approval", icon: <BrushIcon /> },
  { value: "trainer", label: "Personal trainer", detail: "Clients, plans and session scheduling", icon: <FitnessCenterIcon /> },
];
const STEP_LABELS = ["Business", "Your details", "Secure account"];

function StepProgress({ step }) {
  return (
    <Box sx={{ mb: 3.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.25 }}>
        {STEP_LABELS.map((label, index) => (
          <Box key={label} sx={{ display: "flex", alignItems: "center", gap: .65, color: index <= step ? "#1c1e23" : "#a2a7b0" }}>
            <Box sx={{
              width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center",
              bgcolor: index < step ? "#17191f" : index === step ? AUTH_GOLD : "#e8eaee",
              color: index < step ? "#fff" : "#171717", fontWeight: 900, fontSize: ".68rem",
            }}>
              {index < step ? <CheckIcon sx={{ fontSize: 15 }} /> : index + 1}
            </Box>
            <Typography sx={{ display: { xs: "none", sm: "block" }, fontSize: ".69rem", fontWeight: 800 }}>{label}</Typography>
          </Box>
        ))}
      </Box>
      <LinearProgress
        variant="determinate"
        value={((step + 1) / STEP_LABELS.length) * 100}
        sx={{ height: 4, borderRadius: 99, bgcolor: "#e8eaee", "& .MuiLinearProgress-bar": { bgcolor: AUTH_GOLD, borderRadius: 99 } }}
      />
    </Box>
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isOwner, setIsOwner] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", specialty: "", password: "", confirm: "",
    shopId: "", businessName: "", businessType: "barber", marketingOptIn: false,
  });
  const [shops, setShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (isOwner) return;
    async function fetchShops() {
      try {
        setLoadingShops(true);
        const shopsQuery = query(
          collection(db, "barbers"),
          where("role", "==", "owner"),
          where("businessType", "==", "barber"),
        );
        const snap = await getDocs(shopsQuery);
        setShops(snap.docs.map(item => ({
          id: item.id,
          displayLabel: item.data().businessName || item.data().displayName || "Unnamed shop",
          businessType: "barber",
        })));
      } catch {
        setError("We couldn’t load the barbershop list. Please try again.");
      } finally {
        setLoadingShops(false);
      }
    }
    fetchShops();
  }, [isOwner]);

  function handleChange(event) {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm(current => ({ ...current, [event.target.name]: value }));
    setError(null);
  }

  function selectBusinessType(value) {
    setForm(current => ({ ...current, businessType: value, shopId: value === "barber" ? current.shopId : "" }));
    if (value !== "barber") setIsOwner(true);
    setError(null);
  }

  function validateCurrentStep() {
    if (step === 0 && !form.businessType) return "Choose the type of business you run.";
    if (step === 1) {
      if (isOwner && !form.businessName.trim()) return "Enter your business name.";
      if (!isOwner && !form.shopId) return "Select the barbershop you’re joining.";
      if (!form.name.trim()) return "Enter your full name.";
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email address.";
    }
    if (step === 2) {
      if (form.password.length < 6) return "Use at least 6 characters for your password.";
      if (form.password !== form.confirm) return "Passwords do not match.";
    }
    return null;
  }

  function handleNext() {
    const validationError = validateCurrentStep();
    if (validationError) return setError(validationError);
    setError(null);
    setStep(current => Math.min(2, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function waitForBarberDoc(uid, expectedRole, maxAttempts = 10) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const snap = await getDoc(doc(db, "barbers", uid));
      if (snap.exists() && snap.data().role === expectedRole) return snap.data();
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    throw new Error("Account setup took too long.");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (step < 2) return handleNext();
    const validationError = validateCurrentStep();
    if (validationError) return setError(validationError);

    setLoading(true);
    setError(null);
    try {
      const role = isOwner ? "owner" : "staff";
      let resolvedBusinessType = form.businessType;
      if (!isOwner) {
        const selectedShop = shops.find(shop => shop.id === form.shopId);
        if (selectedShop?.businessType) {
          resolvedBusinessType = selectedShop.businessType;
        } else {
          const shopSnap = await getDoc(doc(db, "barbers", form.shopId));
          if (shopSnap.exists()) resolvedBusinessType = shopSnap.data().businessType || "barber";
        }
      }
      const user = await signUpBarber({
        ...form, role, shopId: isOwner ? "self" : form.shopId,
        brandColor: AUTH_GOLD, businessType: resolvedBusinessType,
      });
      await waitForBarberDoc(user.uid, role);
      if (isOwner) fetch("/api/ping-google", { method: "POST" }).catch(() => {});
      navigate(isOwner ? "/onboarding" : "/dashboard");
    } catch (signupError) {
      setError(signupError.message || "We couldn’t create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const selectedType = BUSINESS_TYPES.find(item => item.value === form.businessType);
  const title = step === 0 ? "What kind of business are you?" : step === 1 ? "Tell us the essentials" : "Secure your account";
  const subtitle = step === 0
    ? "We’ll personalise the next steps and your dashboard."
    : step === 1
      ? "Setting up your " + (selectedType?.label.toLowerCase() || "business") + " workspace."
      : "One last step, then we’ll build your workspace.";

  return (
    <AuthShell
      eyebrow="90 days free · No card required"
      title="Set up once. Run your business from anywhere."
      description="Tell us what you do and Bookrightly will tailor your website, dashboard and business tools around you."
    >
      <Box sx={{ maxWidth: 560, mx: "auto" }}>
        <Box sx={{ mb: 3 }}>
          <Typography component="h2" sx={{ fontWeight: 900, fontSize: { xs: "1.55rem", sm: "1.9rem" }, letterSpacing: "-.04em" }}>{title}</Typography>
          <Typography sx={{ color: "text.secondary", fontSize: ".8rem", mt: .65 }}>{subtitle}</Typography>
        </Box>
        <StepProgress step={step} />

        <Box component="form" onSubmit={handleSubmit} noValidate>
          {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5 }}>{error}</Alert>}

          {step === 0 && (
            <Stack spacing={2.5}>
              <Grid container spacing={1.25}>
                {BUSINESS_TYPES.map(type => {
                  const selected = form.businessType === type.value;
                  return (
                    <Grid item xs={12} sm={6} key={type.value}>
                      <Button
                        type="button" fullWidth aria-pressed={selected}
                        onClick={() => selectBusinessType(type.value)}
                        sx={{
                          p: 1.75, minHeight: 94, justifyContent: "flex-start", textAlign: "left",
                          border: "1.5px solid " + (selected ? AUTH_GOLD : "#e1e4e9"),
                          bgcolor: selected ? AUTH_GOLD + "10" : "#fff", borderRadius: 2.5, color: "#1b1d22",
                          "&:hover": { bgcolor: selected ? AUTH_GOLD + "18" : "#f8f9fa", borderColor: selected ? AUTH_GOLD : "#c8ccd3" },
                        }}
                      >
                        <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 2, bgcolor: selected ? AUTH_GOLD : "#f0f1f3", display: "grid", placeItems: "center", mr: 1.35, "& svg": { fontSize: 20 } }}>{type.icon}</Box>
                        <Box>
                          <Typography sx={{ fontWeight: 850, fontSize: ".82rem" }}>{type.label}</Typography>
                          <Typography sx={{ color: "text.secondary", fontSize: ".66rem", lineHeight: 1.35, mt: .3 }}>{type.detail}</Typography>
                        </Box>
                      </Button>
                    </Grid>
                  );
                })}
              </Grid>

              {form.businessType === "barber" && (
                <Box>
                  <Typography sx={{ fontSize: ".7rem", fontWeight: 850, color: "#555c66", mb: .75 }}>How are you joining?</Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                    {[
                      { owner: true, label: "Business owner", icon: <StoreIcon /> },
                      { owner: false, label: "Join a shop", icon: <GroupsIcon /> },
                    ].map(option => (
                      <Button
                        type="button" key={option.label} aria-pressed={isOwner === option.owner}
                        onClick={() => { setIsOwner(option.owner); setError(null); }}
                        startIcon={option.icon}
                        sx={{
                          py: 1.25, border: "1px solid " + (isOwner === option.owner ? AUTH_GOLD : "#e1e4e9"),
                          bgcolor: isOwner === option.owner ? AUTH_GOLD + "12" : "#fff",
                          color: "#272a30", fontWeight: 800, borderRadius: 2.5,
                        }}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </Box>
                </Box>
              )}
            </Stack>
          )}

          {step === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                {isOwner ? (
                  <TextField label="Business name" name="businessName" fullWidth required value={form.businessName} onChange={handleChange} autoFocus />
                ) : (
                  <TextField
                    select fullWidth required label="Barbershop to join" name="shopId"
                    value={form.shopId} onChange={handleChange} disabled={loadingShops} autoFocus
                    helperText={!loadingShops && shops.length === 0 ? "No barbershops are currently available." : "Your shop owner will see you in their staff list."}
                  >
                    {loadingShops
                      ? <MenuItem disabled><CircularProgress size={18} sx={{ mr: 1.5 }} /> Loading shops…</MenuItem>
                      : shops.map(shop => <MenuItem key={shop.id} value={shop.id}>{shop.displayLabel}</MenuItem>)}
                  </TextField>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Full name" name="name" fullWidth required value={form.name} onChange={handleChange} autoComplete="name" InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: "#9ca1ab", fontSize: 19 }} /></InputAdornment> }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Phone (optional)" name="phone" type="tel" fullWidth value={form.phone} onChange={handleChange} autoComplete="tel" />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Email address" name="email" type="email" fullWidth required value={form.email} onChange={handleChange} autoComplete="email" />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Speciality (optional)" name="specialty" fullWidth
                  placeholder={form.businessType === "trainer" ? "e.g. Strength and conditioning" : form.businessType === "decorator" ? "e.g. Residential interiors" : "e.g. Fades, colour or extensions"}
                  value={form.specialty} onChange={handleChange}
                />
              </Grid>
            </Grid>
          )}

          {step === 2 && (
            <Stack spacing={2}>
              <TextField
                label="Create password" name="password" fullWidth required autoFocus
                type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange}
                autoComplete="new-password" helperText="Use at least 6 characters."
                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)}>{showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}</IconButton></InputAdornment> }}
              />
              <TextField
                label="Confirm password" name="confirm" fullWidth required
                type={showPassword ? "text" : "password"} value={form.confirm} onChange={handleChange}
                autoComplete="new-password" error={Boolean(form.confirm && form.password !== form.confirm)}
                helperText={form.confirm && form.password !== form.confirm ? "Passwords don’t match yet." : " "}
              />
              {isOwner && (
                <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: AUTH_GOLD + "0d", border: "1px solid " + AUTH_GOLD + "44" }}>
                  <Typography sx={{ fontWeight: 850, fontSize: ".78rem" }}>Your 90-day free trial</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: ".69rem", mt: .35 }}>Full access, no card required and no automatic charge today.</Typography>
                </Box>
              )}
              <FormControlLabel
                sx={{ alignItems: "flex-start", mx: 0 }}
                control={<Checkbox name="marketingOptIn" checked={form.marketingOptIn} onChange={handleChange} size="small" sx={{ color: "#bbb", "&.Mui-checked": { color: AUTH_GOLD } }} />}
                label={<Typography sx={{ color: "#5d636d", fontSize: ".72rem", lineHeight: 1.5, mt: .35 }}>Send me useful product updates and tips (optional).</Typography>}
              />
              <Typography sx={{ color: "text.secondary", fontSize: ".66rem", lineHeight: 1.6 }}>
                By creating an account, you agree to the <Link to="/terms">Terms</Link> and acknowledge the <Link to="/privacy">Privacy Policy</Link>.
              </Typography>
            </Stack>
          )}

          <Box sx={{ display: "flex", gap: 1.25, mt: 3.5 }}>
            {step > 0 && (
              <Button type="button" onClick={() => { setStep(current => current - 1); setError(null); }} startIcon={<ArrowBackIcon />} sx={{ color: "#5f6670", px: 1.5 }}>Back</Button>
            )}
            <Button
              type="submit" variant="contained" size="large" disabled={loading}
              endIcon={!loading && (step < 2 ? <ArrowForwardIcon /> : <CheckIcon />)}
              sx={{ ml: "auto", minWidth: { xs: 150, sm: 190 }, minHeight: 52, bgcolor: AUTH_GOLD, color: "#171717", fontWeight: 900, borderRadius: 2.5, "&:hover": { bgcolor: AUTH_GOLD, filter: "brightness(.92)" } }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : step < 2 ? "Continue" : isOwner ? "Create free account" : "Join barbershop"}
            </Button>
          </Box>
        </Box>

        <Typography sx={{ color: "text.secondary", textAlign: "center", fontSize: ".75rem", mt: 3 }}>
          Already have an account?{" "}
          <Box component={Link} to="/login" sx={{ color: AUTH_GOLD, fontWeight: 850, textDecoration: "none" }}>Sign in</Box>
        </Typography>
      </Box>
    </AuthShell>
  );
}
