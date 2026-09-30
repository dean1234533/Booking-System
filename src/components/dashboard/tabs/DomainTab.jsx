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
  Stack, Dialog, DialogTitle, DialogContent, DialogActions,
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
  MenuBook        as GuideIcon,
  Add             as AddIcon,
  DeleteOutline   as DeleteIcon,
  Dns             as DnsIcon,
} from "@mui/icons-material";
import {getFunctions, httpsCallable} from "firebase/functions";
import {getFirestore, doc, onSnapshot} from "firebase/firestore";
import { getApp } from "firebase/app";
import { useNavigate } from "react-router-dom";
import BookingLinkCard from "../BookingLinkCard";
import BookingLinkQrDialog from "../BookingLinkQrDialog";
import SearchConsoleTraffic from "./SearchConsoleTraffic";

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

// Self-serve TXT records for domains connected via nameserver delegation —
// their DNS lives entirely in our Cloudflare zone, so this is the only way
// they can add a Google Search Console / email verification record themselves.
function DnsRecordManager({domain, brandColor}) {
  const functions = getFunctions(getApp(), "us-central1");
  const [records, setRecords]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [name, setName]         = useState("");
  const [content, setContent]   = useState("");
  const [adding, setAdding]     = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [open, setOpen]         = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const list = httpsCallable(functions, "listDomainDnsRecords");
      const res = await list();
      setRecords(res.data.records || []);
    } catch (err) {
      setError(err.message || "Failed to load DNS records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open && records === null) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (e) => {
    e?.preventDefault();
    if (!name.trim() || !content.trim()) return;
    setAdding(true);
    setError("");
    try {
      const add = httpsCallable(functions, "addDomainDnsRecord");
      await add({name: name.trim(), content: content.trim()});
      setName("");
      setContent("");
      await load();
    } catch (err) {
      setError(err.message || "Failed to add record.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (recordId) => {
    setDeletingId(recordId);
    setError("");
    try {
      const del = httpsCallable(functions, "deleteDomainDnsRecord");
      await del({recordId});
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete record.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box mt={2}>
      <Button
        size="small"
        startIcon={<DnsIcon fontSize="small" />}
        onClick={() => setOpen(v => !v)}
        sx={{color: brandColor, fontWeight: 700}}
      >
        {open ? "Hide DNS (TXT) records" : "Manage DNS (TXT) records"}
      </Button>

      {open && (
        <Box mt={1.5}>
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
            Advanced — only needed if you run email through this domain elsewhere (SPF/DKIM records)
            or a third-party tool asks you to add a verification code. Google Search Console is handled
            automatically by the Search Traffic card above, not here.
            Use "@" for the root of <strong>{domain}</strong>, or a subdomain like "mail".
          </Typography>

          {error && <Alert severity="error" sx={{mb: 1.5}} onClose={() => setError("")}>{error}</Alert>}

          {loading ? (
            <Box display="flex" justifyContent="center" py={2}><CircularProgress size={20} /></Box>
          ) : (
            <>
              {records?.length > 0 && (
                <Stack spacing={1} mb={2}>
                  {records.map((r) => (
                    <Box
                      key={r.id}
                      display="flex" alignItems="center" justifyContent="space-between" gap={1}
                      p={1.25}
                      sx={{bgcolor: "rgba(255,255,255,0.04)", borderRadius: 1.5, border: "1px solid rgba(255,255,255,0.1)"}}
                    >
                      <Box minWidth={0}>
                        <Typography variant="caption" fontWeight={700} display="block">{r.name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{wordBreak: "break-all"}}>{r.content}</Typography>
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        disabled={deletingId === r.id}
                        onClick={() => handleDelete(r.id)}
                        sx={{minWidth: 32, flexShrink: 0}}
                      >
                        {deletingId === r.id ? <CircularProgress size={14} /> : <DeleteIcon fontSize="small" />}
                      </Button>
                    </Box>
                  ))}
                </Stack>
              )}

              <Box component="form" onSubmit={handleAdd} display="flex" flexDirection="column" gap={1}>
                <Stack direction={{xs: "column", sm: "row"}} spacing={1}>
                  <TextField
                    size="small" label="Name" placeholder="@"
                    value={name} onChange={(e) => setName(e.target.value)}
                    disabled={adding} sx={{maxWidth: {sm: 140}}}
                  />
                  <TextField
                    fullWidth size="small" label="TXT value" placeholder="google-site-verification=..."
                    value={content} onChange={(e) => setContent(e.target.value)}
                    disabled={adding}
                  />
                </Stack>
                <Button
                  type="submit" variant="outlined" size="small"
                  startIcon={adding ? <CircularProgress size={14} /> : <AddIcon fontSize="small" />}
                  disabled={adding || !name.trim() || !content.trim()}
                  sx={{alignSelf: "flex-start", borderColor: brandColor, color: brandColor, fontWeight: 700}}
                >
                  Add record
                </Button>
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

const STEPS = ["Search domain", "Purchase", "Auto-connected"];

// ── Main component ────────────────────────────────────────────────────────────

export default function DomainTab({barber, brandColor}) {
  const functions = getFunctions(getApp(), "us-central1");
  const navigate = useNavigate();

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

  // Automatic (nameserver-delegation) connection state
  const [autoDomain,  setAutoDomain]  = useState("");
  const [autoLinking, setAutoLinking] = useState(false);
  const [autoError,   setAutoError]   = useState("");
  const autoPollRef = useRef(null);
  const [resetting, setResetting] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetError, setResetError] = useState("");

  // Live barber doc from Firestore (real-time)
  const [barberDoc, setBarberDoc] = useState(null);
  const pollRef = useRef(null);
  const [qrOpen, setQrOpen] = useState(false);
  const bookingSlug = barberDoc?.bookingSlug || barber?.bookingSlug;

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

  // Jump straight to the Search Traffic card when arriving via its link from
  // the dashboard overview — waits for the domain data to actually load
  // (and the section to exist) rather than firing on the very first render.
  const scrolledToTrafficRef = useRef(false);
  useEffect(() => {
    if (scrolledToTrafficRef.current) return;
    if (sessionStorage.getItem("br_scrollTo") !== "search-traffic") return;
    // Must match the condition the "search-traffic" section itself renders
    // under (below) — it was requiring an active custom domain specifically,
    // so accounts on the bookingSlug fallback (no domain connected yet) never
    // got the section to exist at all, and this effect silently never fired.
    const hasTrafficSection = (barberDoc?.customDomain && barberDoc?.domainStatus === "active") || bookingSlug;
    if (!hasTrafficSection) return;
    scrolledToTrafficRef.current = true;
    sessionStorage.removeItem("br_scrollTo");
    requestAnimationFrame(() => {
      document.getElementById("search-traffic")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [barberDoc?.customDomain, barberDoc?.domainStatus, bookingSlug]);

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

  // Poll checkDomainAuto while a delegated domain waits for its nameservers
  useEffect(() => {
    const zoneId = barberDoc?.cfZoneId;
    const method = barberDoc?.connectMethod;
    const status = barberDoc?.domainStatus;
    const domain = barberDoc?.customDomain;

    if (method !== "delegation" || !zoneId || status === "active") {
      clearInterval(autoPollRef.current);
      return;
    }

    const checkAuto = httpsCallable(functions, "checkDomainAuto");
    autoPollRef.current = setInterval(async () => {
      try {
        const res = await checkAuto({zoneId, domain});
        if (res.data.isLive) clearInterval(autoPollRef.current);
      } catch (e) {
        console.error("Auto poll error:", e);
      }
    }, 15000);

    return () => clearInterval(autoPollRef.current);
  }, [barberDoc?.cfZoneId, barberDoc?.connectMethod, barberDoc?.domainStatus, barberDoc?.customDomain]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleResetDomain() {
    setResetting(true);
    setResetError("");
    try {
      const reset = httpsCallable(functions, "resetDomainConnection");
      await reset();
      setResetConfirmOpen(false);
      setAutoDomain("");
      setExistingDomain("");
    } catch (err) {
      setResetError(err.message || "Couldn't reset the domain connection.");
    } finally {
      setResetting(false);
    }
  }

  async function handleConnectAuto(e) {
    e?.preventDefault();
    const clean = autoDomain.toLowerCase().trim()
        .replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "");
    if (!clean || !barber?.uid) return;

    setAutoLinking(true);
    setAutoError("");
    try {
      const connect = httpsCallable(functions, "connectDomainAuto");
      await connect({domain: clean});
      setAutoDomain("");
    } catch (err) {
      setAutoError(err.message || "Could not start automatic connection.");
    } finally {
      setAutoLinking(false);
    }
  }

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
    <Box>
      {/* ── Your Bookrightly booking link — always live, no domain needed ── */}
      {bookingSlug && (
        <>
          <BookingLinkCard bookingSlug={bookingSlug} brandColor={brandColor} onShowQr={() => setQrOpen(true)} sx={{mb: 3}} />
          <BookingLinkQrDialog open={qrOpen} onClose={() => setQrOpen(false)} bookingSlug={bookingSlug} brandColor={brandColor} />
        </>
      )}

      <Paper
        onClick={() => navigate("/starter-pack")}
        sx={{p: 2.5, borderRadius: 3, mb: 3, display: "flex", alignItems: "center", gap: 2, cursor: "pointer", border: `1px solid ${brandColor}55`, "&:hover": {bgcolor: `${brandColor}0A`}}}
      >
        <GuideIcon sx={{color: brandColor, fontSize: 28, flexShrink: 0}} />
        <Box flex={1}>
          <Typography fontWeight={800}>Free Business Starter Pack</Typography>
          <Typography variant="body2" color="text.secondary">
            Getting found on Google, free directories to list on, and — once your domain's connected — how to track your search traffic.
          </Typography>
        </Box>
      </Paper>

      <Box display="flex" alignItems="baseline" gap={1} mb={2}>
        <Typography variant="h6" fontWeight={800}>Want your own domain?</Typography>
        <Typography variant="body2" color="text.secondary">
          Optional — your Bookrightly link above already works everywhere.
        </Typography>
      </Box>

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
              Payment received! Your domain is being provisioned — usually 2–5 minutes.
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

          {(connectedDomain && domainStatus === "active" ? connectedDomain : bookingSlug ? `bookrightly.co.uk/${bookingSlug}` : null) && (
            <Box id="search-traffic" sx={{ scrollMarginTop: "calc(64px + env(safe-area-inset-top, 0px) + 16px)" }}>
              <SearchConsoleTraffic
                domain={connectedDomain && domainStatus === "active" ? connectedDomain : `bookrightly.co.uk/${bookingSlug}`}
                brandColor={brandColor}
              />
            </Box>
          )}

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
                    href={`https://www.${connectedDomain.replace(/^www\./, "")}`}
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

          {/* Connect automatically via nameserver delegation */}
          <Paper sx={{p: 3, borderRadius: 3, border: `1px solid ${brandColor}55`, mb: 2}}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <LinkIcon sx={{color: brandColor}} />
              <Typography variant="subtitle1" fontWeight={800}>
                Connect Automatically&nbsp;
                <Box component="span" sx={{fontSize: "0.7rem", fontWeight: 700, color: brandColor, border: `1px solid ${brandColor}`, borderRadius: 1, px: 0.6, py: 0.1, verticalAlign: "middle"}}>RECOMMENDED</Box>
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Change your domain's nameservers to us once — then we set up everything
              (DNS, HTTPS and routing) for you. No records to copy by hand.
            </Typography>

            {autoError && <Alert severity="error" sx={{mb: 2}}>{autoError}</Alert>}

            {barberDoc?.connectMethod === "delegation" && barberDoc?.nameservers?.length ? (
              <Box>
                {barberDoc.domainStatus === "active" ? (
                  <Alert severity="success">
                    <strong>{barberDoc.customDomain}</strong> is live and connected.
                  </Alert>
                ) : (
                  <>
                    <Alert severity="info" sx={{mb: 2}}>
                      At your registrar, replace the nameservers for{" "}
                      <strong>{barberDoc.customDomain}</strong> with these two.
                      It goes live automatically once they propagate (can take a few hours).
                    </Alert>
                    {barberDoc.nameservers.map((ns, i) => (
                      <CopyField key={i} label={`Nameserver ${i + 1}`} value={ns} />
                    ))}
                    <Typography
                      variant="caption"
                      component="a"
                      href="https://youtu.be/zm12p5_doDw"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: brandColor, fontWeight: 700, mt: 1 }}
                    >
                      Not sure how? Watch: how to change your nameservers <OpenInNewIcon sx={{ fontSize: 13 }} />
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} mt={1.5}>
                      <CircularProgress size={14} sx={{color: brandColor}} />
                      <Typography variant="caption" color="text.secondary">
                        Waiting for nameserver change… (status: {barberDoc.domainStatus})
                      </Typography>
                    </Box>
                  </>
                )}
                <Button
                  size="small" color="inherit"
                  onClick={() => setResetConfirmOpen(true)}
                  sx={{mt: 1.5, color: "text.disabled", fontSize: "0.72rem"}}
                >
                  Wrong domain? Start over
                </Button>
                <DnsRecordManager domain={barberDoc.customDomain} brandColor={brandColor} />
              </Box>
            ) : (
              <Box component="form" onSubmit={handleConnectAuto} display="flex" flexDirection="column" gap={1.5}>
                <TextField
                  fullWidth size="small" label="Your domain"
                  placeholder="mybusiness.co.uk"
                  value={autoDomain}
                  onChange={(e) => setAutoDomain(e.target.value)}
                  disabled={autoLinking}
                />
                <Button
                  fullWidth type="submit" variant="contained"
                  disabled={autoLinking || !autoDomain.trim()}
                  sx={{bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, boxShadow: "none", "&:hover": {bgcolor: brandColor, filter: "brightness(1.1)"}}}
                >
                  {autoLinking ? <CircularProgress size={18} color="inherit" /> : "Connect Automatically"}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Best for domains used only for your booking site. If you also run
                  email on this domain, use the manual option below so your existing
                  records aren't affected.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Connect existing domain */}
          <Paper sx={{p: 3, borderRadius: 3, border: "1px solid #E0E0E0"}}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <LinkIcon sx={{color: brandColor}} />
              <Typography variant="subtitle1" fontWeight={800}>
                Connect Existing Domain (manual)
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

                <Typography
                  variant="caption"
                  component="a"
                  href="https://youtu.be/7bm7Gt0BA-Y"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: brandColor, fontWeight: 700, mb: 2 }}
                >
                  Not sure how? Watch: how to find and add DNS records <OpenInNewIcon sx={{ fontSize: 13 }} />
                </Typography>

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

    <Dialog open={resetConfirmOpen} onClose={() => !resetting && setResetConfirmOpen(false)}>
      <DialogTitle>Start over on this domain?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={resetError ? 2 : 0}>
          This disconnects <strong>{barberDoc?.customDomain}</strong> and removes its DNS setup.
          Your Bookrightly link keeps working — you can connect a different (or corrected) domain right after.
        </Typography>
        {resetError && <Alert severity="error">{resetError}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setResetConfirmOpen(false)} disabled={resetting}>Cancel</Button>
        <Button
          color="error" variant="contained"
          onClick={handleResetDomain}
          disabled={resetting}
          startIcon={resetting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {resetting ? "Starting over…" : "Start over"}
        </Button>
      </DialogActions>
    </Dialog>
    </Box>
  );
}
