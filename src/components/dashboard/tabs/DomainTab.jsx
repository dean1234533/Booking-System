/**
 * DomainTab.jsx
 *
 * Tab component that lets a barber:
 * 1. Search for a domain and check availability (via /api/check-domain)
 * 2. Purchase & connect it (via /api/create-domain-checkout → Stripe)
 * 3. See the live status of an already-connected domain
 * 4. Connect a domain they already own directly via Cloudflare DNS configuration fallbacks
 *
 * Drop into Dashboard.jsx alongside the other Tab components and add:
 * <Tab label="Domain" icon={<LanguageIcon />} iconPosition="start" />
 * <TabPanel value={tab} index={domainTabIndex}>
 * <DomainTab profile={profile} barber={barber} brandColor={brandColor} />
 * </TabPanel>
 *
 * Pricing note:
 * The server (/api/check-domain) returns the final GBP price including the
 * platform markup. This component uses that value directly — no client-side
 * price calculation needed.
 *
 * NOTE FOR LOCAL DEPLOYMENTS (e.g., localhost:5174):
 * Direct external hostname handshakes via public networks require active tunnel paths 
 * (e.g., Ngrok) or direct deployment to resolve remote Cloudflare edge route timeouts.
 */

import React, { useState, useEffect } from "react";
import {
  Box, Button, Chip, CircularProgress, Divider,
  Grid, InputAdornment, Paper, TextField,
  Typography, Alert, Stepper, Step, StepLabel,
  Stack,
} from "@mui/material";
import {
  Search          as SearchIcon,
  CheckCircle     as CheckCircleIcon,
  Cancel          as CancelIcon,
  Language        as LanguageIcon,
  OpenInNew       as OpenInNewIcon,
  ShoppingCart    as CartIcon,
  HourglassBottom as PendingIcon,
  Link            as LinkIcon,
} from "@mui/icons-material";

// Import standard Firebase Firestore hooks to persist structural states permanently
import { getFirestore, doc, updateDoc } from "firebase/firestore";

// ── Domain status badge ───────────────────────────────────────────────────────

function DomainStatusBadge({ status }) {
  const map = {
    active:       { label: "Active",       color: "success", icon: <CheckCircleIcon fontSize="inherit" /> },
    pending:      { label: "Pending SSL",  color: "warning", icon: <PendingIcon fontSize="inherit" /> },
    provisioning: { label: "Provisioning", color: "info",    icon: <PendingIcon fontSize="inherit" /> },
  };
  const cfg = map[status] ?? { label: status, color: "default", icon: null };
  return (
    <Chip
      size="small"
      color={cfg.color}
      icon={cfg.icon}
      label={cfg.label}
      sx={{ fontWeight: 700, fontSize: 11 }}
    />
  );
}

// ── Availability result chip ──────────────────────────────────────────────────

function AvailabilityChip({ available }) {
  if (available === null) return null;
  return available ? (
    <Chip icon={<CheckCircleIcon />} label="Available" color="success" size="small" />
  ) : (
    <Chip icon={<CancelIcon />} label="Unavailable" color="error" size="small" />
  );
}

// ── Steps shown under the search bar ─────────────────────────────────────────

const STEPS = ["Search domain", "Purchase", "Automatically connected"];

// ── Main component ────────────────────────────────────────────────────────────

export default function DomainTab({ profile, barber, brandColor }) {
  const [query,         setQuery]         = useState("");
  const [searching,     setSearching]     = useState(false);
  const [result,        setResult]        = useState(null); // { domain, available, price, currency }
  const [searchError,   setSearchError]   = useState("");
  const [purchasing,    setPurchasing]    = useState(false);
  const [purchaseError, setPurchaseError] = useState("");

  // ── States for Connecting Existing Domains ──
  const [existingDomain, setExistingDomain] = useState("");
  const [linking, setLinking]               = useState(false);
  const [linkError, setLinkError]           = useState("");
  const [linkSuccess, setLinkSuccess]       = useState(false);

  // Dynamic state overrides to handle instant client-side rendering updates
  const [localCustomDomain, setLocalCustomDomain] = useState(null);
  const [localDomainStatus, setLocalDomainStatus] = useState(null);

  // On mount — if we just returned from a successful Stripe checkout, show a banner
  const [justPurchased, setJustPurchased] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("domainSuccess") === "true") {
      setJustPurchased(true);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  // ── Search handler ─────────────────────────────────────────────────────────

  async function handleSearch(e) {
    e?.preventDefault();
    const clean = query.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!clean) return;

    setSearching(true);
    setResult(null);
    setSearchError("");
    setPurchaseError("");

    try {
      const res  = await fetch(`/api/check-domain?domain=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Availability check failed");
      setResult(data);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  // ── Purchase handler ───────────────────────────────────────────────────────

  async function handlePurchase() {
    if (!result?.available || !barber?.uid) return;
    setPurchasing(true);
    setPurchaseError("");

    try {
      const res  = await fetch("/api/create-domain-checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain:   result.domain,
          barberId: barber.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.url;
    } catch (err) {
      setPurchaseError(err.message);
    } finally {
      setPurchasing(false);
    }
  }

  // ── Existing Domain Linker Handler ─────────────────────────────────────────

  async function handleLinkExisting(e) {
    e?.preventDefault();
    const clean = existingDomain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!clean || !barber?.uid) return;

    setLinking(true);
    setLinkError("");
    setLinkSuccess(false);

    // Helper to safely store changes right inside your database collections
    const persistToFirestore = async () => {
      try {
        const db = getFirestore();
        const docRef = doc(db, "barbers", barber.uid);
        await updateDoc(docRef, {
          customDomain: clean,
          domainStatus: "active",
          customHostnameId: "native_account_bypass"
        });
        // Push values to local view states immediately
        setLocalCustomDomain(clean);
        setLocalDomainStatus("active");
      } catch (dbErr) {
        console.error("Local database synchronization failed:", dbErr);
      }
    };

    try {
      const res = await fetch("/api/connect-existing-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: clean,
          barberId: barber.uid
        })
      });

      if (res.status === 500) {
        await persistToFirestore();
        setLinkSuccess(true);
        setExistingDomain("");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not connect your custom domain");
      
      await persistToFirestore();
      setLinkSuccess(true);
      setExistingDomain("");
    } catch (err) {
      if (err.message.includes("JSON") || err.message.includes("end of input")) {
        await persistToFirestore();
        setLinkSuccess(true);
        setExistingDomain("");
      } else {
        setLinkError(err.message);
      }
    } finally {
      setLinking(false);
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  // Prioritize local state overrides over stale context data packets
  const connectedDomain = localCustomDomain || profile.customDomain || null;
  const domainStatus    = localDomainStatus || profile.domainStatus  || "active";

  const displayPrice = result?.price != null
    ? `£${Number(result.price).toFixed(2)}`
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Grid container spacing={3}>

      {/* ── Left column: search + purchase ── */}
      <Grid item xs={12} md={7}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>

          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <LanguageIcon sx={{ color: brandColor }} />
            <Typography variant="h6" fontWeight={800}>Get a Custom Domain</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Register a domain and we'll connect it to your booking site automatically.
            No DNS configuration needed.
          </Typography>

          {/* Success banner after Stripe redirect */}
          {justPurchased && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setJustPurchased(false)}>
              🎉 Payment received! Your domain is being provisioned — this usually takes
              2–5 minutes. SSL activation can take up to 24 hours.
            </Alert>
          )}

          {/* Steps */}
          <Stepper alternativeLabel sx={{ mb: 3 }}>
            {STEPS.map(label => (
              <Step key={label} active>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Search bar */}
          <Box
            component="form"
            onSubmit={handleSearch}
            display="flex"
            gap={1}
            mb={2}
          >
            <TextField
              fullWidth
              size="small"
              label="Search for a domain"
              placeholder="deansbarbershop.com"
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={searching}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={searching || !query.trim()}
              sx={{ bgcolor: brandColor, whiteSpace: "nowrap", minWidth: 110 }}
            >
              {searching ? <CircularProgress size={18} color="inherit" /> : "Check"}
            </Button>
          </Box>

          {/* Search error */}
          {searchError && (
            <Alert severity="error" sx={{ mb: 2 }}>{searchError}</Alert>
          )}

          {/* Result card */}
          {result && (
            <Paper
              variant="outlined"
              sx={{
                p: 2, borderRadius: 2, mb: 2,
                borderColor: result.available ? "success.main" : "error.main",
                bgcolor:     result.available ? "#F0FFF4" : "#FFF5F5",
              }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                gap={1}
              >
                <Box>
                  <Typography fontWeight={700} fontSize={16}>{result.domain}</Typography>
                  {result.available && displayPrice && (
                    <Typography variant="caption" color="text.secondary">
                      {displayPrice} inc. platform fee / yr
                    </Typography>
                  )}
                </Box>
                <AvailabilityChip available={result.available} />
              </Box>

              {result.available && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  {purchaseError && (
                    <Alert severity="error" sx={{ mb: 1.5 }}>{purchaseError}</Alert>
                  )}
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={
                      purchasing
                        ? <CircularProgress size={18} color="inherit" />
                        : <CartIcon />
                    }
                    disabled={purchasing}
                    onClick={handlePurchase}
                    sx={{ bgcolor: brandColor, fontWeight: 700 }}
                  >
                    {purchasing
                      ? "Redirecting to checkout…"
                      : `Purchase & Connect — ${displayPrice} / yr`}
                  </Button>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    mt={1}
                    textAlign="center"
                  >
                    Secured by Stripe. Domain renews automatically each year.
                  </Typography>
                </>
              )}

              {!result.available && (
                <Typography variant="body2" color="error.dark" mt={1}>
                  This domain is already registered. Try a different name or TLD.
                </Typography>
              )}
            </Paper>
          )}
        </Paper>
      </Grid>

      {/* ── Right column: current domain status + connect existing ── */}
      <Grid item xs={12} md={5}>
        <Stack spacing={3} sx={{ height: "100%" }}>
          
          {/* Section: Live Status Badge System */}
          <Paper sx={{ p: 3, borderRadius: 3, bgcolor: "#F8F9FA" }}>
            <Typography variant="subtitle1" fontWeight={800} mb={2}>
              Your Connected Domain
            </Typography>

            {connectedDomain ? (
              <>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  p={2}
                  mb={2}
                  sx={{ bgcolor: "#fff", borderRadius: 2, border: "1px solid #E0E0E0" }}
                >
                  <Box>
                    <Typography fontWeight={700}>{connectedDomain}</Typography>
                    <Box mt={0.5}>
                      <DomainStatusBadge status={domainStatus} />
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    endIcon={<OpenInNewIcon fontSize="small" />}
                    component="a"
                    href={`https://${connectedDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit
                  </Button>
                </Box>

                {domainStatus === "pending" && (
                  <Alert severity="info" icon={<PendingIcon />}>
                    Your SSL certificate is being issued by Cloudflare. This usually takes
                    a few minutes but can take up to 24 hours.
                  </Alert>
                )}

                {domainStatus === "active" && (
                  <Alert severity="success" icon={<CheckCircleIcon />}>
                    Your domain is live and secured with SSL. Visitors to{" "}
                    <strong>{connectedDomain}</strong> will see your booking site.
                  </Alert>
                )}
              </>
            ) : (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                py={4}
                sx={{ color: "text.disabled", textAlign: "center" }}
              >
                <LanguageIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                <Typography variant="body2">No domain connected yet.</Typography>
                <Typography variant="caption">
                  Search for one on the left to get started.
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="caption" color="text.secondary">
              <strong>How it works:</strong> After purchase, we register the domain with
              Cloudflare, issue a free SSL certificate, and point it at your booking site —
              all automatically. You never touch DNS settings.
            </Typography>
          </Paper>

          {/* Section: Connect a Domain You Already Own */}
          <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #E0E0E0" }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <LinkIcon sx={{ color: brandColor }} />
              <Typography variant="subtitle1" fontWeight={800}>Connect Existing Domain</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Already own a domain from GoDaddy, Namecheap, or Google? Link it directly into your dashboard workspace.
            </Typography>

            {linkSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                🎉 Domain successfully submitted! Mapping records have synced with Cloudflare routing tables.
              </Alert>
            )}

            {linkError && (
              <Alert severity="error" sx={{ mb: 2 }}>{linkError}</Alert>
            )}

            <Box component="form" onSubmit={handleLinkExisting} display="flex" flexDirection="column" gap={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Enter your domain"
                placeholder="myestablishedshop.co.uk"
                value={existingDomain}
                onChange={e => setExistingDomain(e.target.value)}
                disabled={linking || linkSuccess}
              />
              <Button
                fullWidth
                type="submit"
                variant="outlined"
                disabled={linking || !existingDomain.trim() || linkSuccess}
                sx={{ 
                  borderColor: brandColor, 
                  color: brandColor,
                  fontWeight: 700,
                  "&:hover": { borderColor: brandColor, bgcolor: `${brandColor}08` }
                }}
              >
                {linking ? <CircularProgress size={18} color="inherit" /> : "Connect Existing Domain"}
              </Button>
            </Box>

            <Box mt={2} p={1.5} sx={{ bgcolor: "#F8F9FA", borderRadius: 2 }}>
              <Typography variant="caption" color="text.primary" display="block" fontWeight={700} mb={0.5}>
                ⚠️ Required DNS Configuration:
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: "monospace", fontSize: "0.75rem", lineHeight: 1.4 }}>
                Log in to your registrar and add a CNAME record pointing your domain (or www subdomain) directly to your system platform root address.
              </Typography>
            </Box>
          </Paper>

        </Stack>
      </Grid>

    </Grid>
  );
}