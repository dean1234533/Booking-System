/**
 * DomainTab.jsx
 * Full rewrite — calls Firebase Functions directly via httpsCallable.
 * No REST /api/ endpoints needed.
 */

import React, {useState, useEffect, useRef} from "react";
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
  ContentCopy     as CopyIcon,
} from "@mui/icons-material";
import {getFunctions, httpsCallable} from "firebase/functions";
import {getFirestore, doc, onSnapshot} from "firebase/firestore";
import { getApp } from "firebase/app";

// ── Helpers ───────────────────────────────────────────────────────────────────

function DomainStatusBadge({status}) {
  const map = {
    active:       {label: "Active",       color: "success", icon: <CheckCircleIcon fontSize="inherit" />},
    pending:      {label: "Pending SSL",  color: "warning", icon: <PendingIcon fontSize="inherit" />},
    provisioning: {label: "Provisioning", color: "info",    icon: <PendingIcon fontSize="inherit" />},
  };
  const cfg = map[status] ?? {label: status, color: "default", icon: null};
  return (
    <Chip
      size="small"
      color={cfg.color}
      icon={cfg.icon}
      label={cfg.label}
      sx={{fontWeight: 700, fontSize: 11}}
    />
  );
}

function AvailabilityChip({available}) {
  if (available === null) return null;
  return available ? (
    <Chip icon={<CheckCircleIcon />} label="Available" color="success" size="small" />
  ) : (
    <Chip icon={<CancelIcon />} label="Unavailable" color="error" size="small" />
  );
}

function CopyField({label, value}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      p={1.5}
      sx={{
        bgcolor: "rgba(255,255,255,0.04)",
        borderRadius: 1.5,
        border: "1px solid #E2E8F0",
        mb: 1,
      }}
    >
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{fontFamily: "monospace", fontSize: 12, wordBreak: "break-all"}}
        >
          {value}
        </Typography>
      </Box>
      <Button
        size="small"
        onClick={copy}
        startIcon={<CopyIcon fontSize="small" />}
        sx={{ml: 1, minWidth: 80, flexShrink: 0}}
      >
        {copied ? "Copied!" : "Copy"}
      </Button>
    </Box>
  );
}

const STEPS = ["Search domain", "Purchase", "Auto-connected"];

// ── Main component ────────────────────────────────────────────────────────────

export default function DomainTab({barber, brandColor}) {
  const functions = getFunctions(getApp(), "us-central1");

  // Search state
  const [query,         setQuery]         = useState("");
  const [searching,     setSearching]     = useState(false);
  const [result,        setResult]        = useState(null);
  const [searchError,   setSearchError]   = useState("");

  // Purchase state
  const [purchasing,    setPurchasing]    = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [justPurchased, setJustPurchased] = useState(false);

  // Existing domain state
  const [existingDomain, setExistingDomain] = useState("");
  const [linking,        setLinking]        = useState(false);
  const [linkError,      setLinkError]      = useState("");
  const [dnsRecords,     setDnsRecords]     = useState(null);
  const [verifying,      setVerifying]      = useState(false);
  const [verifyError,    setVerifyError]    = useState("");

  // Live barber doc from Firestore (real-time)
  const [barberDoc, setBarberDoc] = useState(null);
  const pollRef = useRef(null);

  // Real-time listener on barber doc
  useEffect(() => {
    if (!barber?.uid) return;
    const db  = getFirestore();
    const ref = doc(db, "barbers", barber.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setBarberDoc(snap.data());
    });
    return () => unsub();
  }, [barber?.uid]);

  // Detect Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("domainSuccess") === "true") {
      setJustPurchased(true);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  // Poll checkDomainStatus when domain is pending
  useEffect(() => {
    const cfId   = barberDoc?.customHostnameId;
    const status = barberDoc?.domainStatus;

    if (!cfId || status === "active" || cfId === "native_account_bypass") {
      clearInterval(pollRef.current);
      return;
    }

    const checkStatus = httpsCallable(functions, "checkDomainStatus");
    pollRef.current = setInterval(async () => {
      try {
        const res = await checkStatus({cfHostnameId: cfId});
        if (res.data.isLive) clearInterval(pollRef.current);
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 12000);

    return () => clearInterval(pollRef.current);
  }, [barberDoc?.customHostnameId, barberDoc?.domainStatus]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleSearch(e) {
    e?.preventDefault();
    const clean = query.toLowerCase().trim()
        .replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!clean) return;

    setSearching(true);
    setResult(null);
    setSearchError("");
    setPurchaseError("");

    try {
      const checkDomain = httpsCallable(functions, "checkDomain");
      const res = await checkDomain({domain: clean});
      setResult(res.data);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handlePurchase() {
    if (!result?.available || !barber?.uid) return;
    setPurchasing(true);
    setPurchaseError("");

    try {
      const createCheckout = httpsCallable(functions, "createDomainCheckout");
      const res = await createCheckout({
        domain:   result.domain,
        barberId: barber.uid,
        priceUsd: result.priceUsd,
      });
      window.location.href = res.data.url;
    } catch (err) {
      setPurchaseError(err.message);
    } finally {
      setPurchasing(false);
    }
  }

  async function handleLinkExisting(e) {
    e?.preventDefault();
    const clean = existingDomain.toLowerCase().trim()
        .replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!clean || !barber?.uid) return;

    setLinking(true);
    setLinkError("");
    setDnsRecords(null);

    try {
      const addDomain = httpsCallable(functions, "addCustomDomain");
      const res = await addDomain({domain: clean});
      setDnsRecords(res.data.dnsRecords);
      setExistingDomain("");
    } catch (err) {
      setLinkError(err.message);
    } finally {
      setLinking(false);
    }
  }

  async function handleVerifyDns() {
    const cfId = barberDoc?.customHostnameId;
    if (!cfId) {
      setVerifyError("No domain ID found. Please try again.");
      return;
    }

    setVerifying(true);
    setVerifyError("");

    try {
      const checkStatus = httpsCallable(functions, "checkDomainStatus");
      const res = await checkStatus({cfHostnameId: cfId});

      if (res.data.isLive) {
        setDnsRecords(null);
      } else {
        setVerifyError(`DNS not yet active. Status: ${res.data.domainStatus}, SSL: ${res.data.sslStatus}. Try again in a few moments.`);
      }
    } catch (err) {
      setVerifyError(err.message || "Verification failed. DNS may not be propagated yet.");
    } finally {
      setVerifying(false);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const connectedDomain = barberDoc?.customDomain   ?? null;
  const domainStatus    = barberDoc?.domainStatus    ?? "pending";
  const displayPrice    = result?.price != null
    ? `£${Number(result.price).toFixed(2)}`
    : null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Grid container spacing={3}>

      {/* ── Left: Search + Purchase ── */}
      <Grid item xs={12} md={7}>
        <Paper sx={{p: 3, borderRadius: 3}}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <LanguageIcon sx={{color: brandColor}} />
            <Typography variant="h6" fontWeight={800}>Get a Custom Domain</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Register a domain and we'll connect it to your booking site automatically.
            No DNS configuration needed.
          </Typography>

          {justPurchased && (
            <Alert severity="success" sx={{mb: 2}} onClose={() => setJustPurchased(false)}>
              🎉 Payment received! Your domain is being provisioned — usually 2–5 minutes.
              SSL activation can take up to 24 hours.
            </Alert>
          )}

          <Stepper alternativeLabel sx={{mb: 3}}>
            {STEPS.map((label) => (
              <Step key={label} active>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

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
              onChange={(e) => setQuery(e.target.value)}
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
              sx={{bgcolor: brandColor, whiteSpace: "nowrap", minWidth: 110}}
            >
              {searching
                ? <CircularProgress size={18} color="inherit" />
                : "Check"}
            </Button>
          </Box>

          {searchError && (
            <Alert severity="error" sx={{mb: 2}}>{searchError}</Alert>
          )}

          {result && (
            <Paper
              variant="outlined"
              sx={{
                p: 2, borderRadius: 2, mb: 2,
                borderColor: result.available ? "success.main" : "error.main",
                bgcolor:     result.available ? "#F0FFF4"      : "#FFF5F5",
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
                  <Divider sx={{my: 1.5}} />
                  {purchaseError && (
                    <Alert severity="error" sx={{mb: 1.5}}>{purchaseError}</Alert>
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
                    sx={{bgcolor: brandColor, fontWeight: 700}}
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
                    Secured by Stripe. Renews automatically each year.
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

      {/* ── Right: Status + Connect Existing ── */}
      <Grid item xs={12} md={5}>
        <Stack spacing={3}>

          {/* Live status */}
          <Paper sx={{p: 3, borderRadius: 3, bgcolor: "rgba(255,255,255,0.04)"}}>
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
                  sx={{bgcolor: "rgba(255,255,255,0.04)", borderRadius: 2, border: "1px solid rgba(255,255,255,0.1)"}}
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
                    SSL certificate being issued by Cloudflare. Usually a few minutes,
                    up to 24 hours.
                  </Alert>
                )}
                {domainStatus === "active" && (
                  <Alert severity="success" icon={<CheckCircleIcon />}>
                    Your domain is live and secured with HTTPS.
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
                sx={{color: "text.disabled", textAlign: "center"}}
              >
                <LanguageIcon sx={{fontSize: 48, mb: 1, opacity: 0.3}} />
                <Typography variant="body2">No domain connected yet.</Typography>
                <Typography variant="caption">
                  Search for one on the left to get started.
                </Typography>
              </Box>
            )}

            <Divider sx={{my: 2}} />
            <Typography variant="caption" color="text.secondary">
              <strong>How it works:</strong> After purchase, we register the domain,
              issue a free SSL certificate, and point it at your booking site —
              all automatically.
            </Typography>
          </Paper>

          {/* Connect existing domain */}
          <Paper sx={{p: 3, borderRadius: 3, border: "1px solid #E0E0E0"}}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <LinkIcon sx={{color: brandColor}} />
              <Typography variant="subtitle1" fontWeight={800}>
                Connect Existing Domain
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Already own a domain from GoDaddy, Namecheap, or Google?
              Enter it below and we'll give you the DNS records to add.
            </Typography>

            {linkError && (
              <Alert severity="error" sx={{mb: 2}}>{linkError}</Alert>
            )}

            <Box
              component="form"
              onSubmit={handleLinkExisting}
              display="flex"
              flexDirection="column"
              gap={1.5}
            >
              <TextField
                fullWidth
                size="small"
                label="Your domain"
                placeholder="myestablishedshop.co.uk"
                value={existingDomain}
                onChange={(e) => setExistingDomain(e.target.value)}
                disabled={linking}
              />
              <Button
                fullWidth
                type="submit"
                variant="outlined"
                disabled={linking || !existingDomain.trim()}
                sx={{
                  borderColor: brandColor,
                  color:       brandColor,
                  fontWeight:  700,
                  "&:hover":   {borderColor: brandColor, bgcolor: `${brandColor}10`},
                }}
              >
                {linking
                  ? <CircularProgress size={18} color="inherit" />
                  : "Get DNS Records"}
              </Button>
            </Box>

            {/* Show DNS records to copy after linking */}
            {dnsRecords && (
              <Box mt={2}>
                <Alert severity="success" sx={{mb: 2}}>
                  Follow the steps below in your domain registrar's DNS settings.
                </Alert>

                {verifyError && (
                  <Alert severity="warning" sx={{mb: 2}}>{verifyError}</Alert>
                )}

                {dnsRecords.map((rec, i) => (
                  rec.type === "FORWARD" ? (
                    /* Root domain — can't use CNAME, use registrar forwarding */
                    <Box key={i} mb={2} p={2} sx={{ bgcolor: "rgba(224,168,0,0.12)", border: "1px solid rgba(224,168,0,0.35)", borderRadius: 2 }}>
                      <Typography variant="caption" fontWeight={800} color="warning.dark" display="block" mb={0.5}>
                        Step {i + 1} — Root Domain Forwarding (@ / naked domain)
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.7 }}>
                        You <strong>cannot</strong> add a CNAME for <code>@</code> — GoDaddy and most registrars
                        block this. Instead, set up a <strong>domain forward / redirect</strong>:
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        In GoDaddy: <strong>Domains → Manage → Forwarding → Add Forwarding</strong>
                      </Typography>
                      <CopyField label="Forward to" value={rec.value} />
                      <Typography variant="caption" color="text.secondary">
                        Set type to <strong>Permanent (301)</strong> and forward with path.
                      </Typography>
                    </Box>
                  ) : (
                    /* Normal DNS record */
                    <Box key={i} mb={2}>
                      <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" mb={0.5}>
                        Step {i + 1} — {rec.type} Record — {rec.description}
                      </Typography>
                      <CopyField label="Type"  value={rec.type} />
                      <CopyField label="Name"  value={rec.name} />
                      <CopyField label="Value" value={rec.value} />
                    </Box>
                  )
                ))}

                <Alert severity="info" sx={{mt: 1}}>
                  DNS changes can take up to 48 hours to propagate. Your domain status
                  will update automatically once verified.
                </Alert>

                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  onClick={handleVerifyDns}
                  disabled={verifying}
                  startIcon={verifying ? <CircularProgress size={18} color="inherit" /> : null}
                  sx={{
                    mt: 2,
                    bgcolor: brandColor,
                    fontWeight: 700,
                    "&:hover": { bgcolor: brandColor, opacity: 0.9 }
                  }}
                >
                  {verifying ? "Checking DNS..." : "Verify DNS Records"}
                </Button>
              </Box>
            )}
          </Paper>

        </Stack>
      </Grid>

    </Grid>
  );
}