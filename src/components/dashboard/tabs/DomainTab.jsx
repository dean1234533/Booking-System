/**
 * DomainTab.jsx
 *
 * Tab component that lets a barber:
 *  1. Search for a domain and check availability (via /api/check-domain)
 *  2. Purchase & connect it (via /api/create-domain-checkout → Stripe)
 *  3. See the live status of an already-connected domain
 *  4. [NEW] Connect an existing domain they already own (via /api/connect-custom-domain)
 *
 * Drop into Dashboard.jsx alongside the other Tab components and add:
 *   <Tab label="Domain" icon={<LanguageIcon />} iconPosition="start" />
 *   <TabPanel value={tab} index={domainTabIndex}>
 *     <DomainTab profile={profile} barber={barber} brandColor={brandColor} />
 *   </TabPanel>
 *
 * Pricing note:
 *   The server (/api/check-domain) returns the final GBP price including the
 *   platform markup. This component uses that value directly — no client-side
 *   price calculation needed.
 */



import React, { useState, useEffect } from "react";
import {
  Box, Button, Chip, CircularProgress, Divider,
  Grid, InputAdornment, Paper, TextField,
  Typography, Alert, Stepper, Step, StepLabel,
} from "@mui/material";
import {
  Search          as SearchIcon,
  CheckCircle     as CheckCircleIcon,
  Cancel          as CancelIcon,
  Language        as LanguageIcon,
  OpenInNew       as OpenInNewIcon,
  ShoppingCart    as CartIcon,
  HourglassBottom as PendingIcon,
  // ── NEW ──
  LinkRounded     as LinkIcon,
  ContentCopy     as CopyIcon,
  InfoOutlined    as InfoIcon,
} from "@mui/icons-material";

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

// ── [NEW] DNS record rows for the "bring your own domain" instructions ────────

function DnsRecordRow({ type, name, value, brandColor }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap={1}
      px={1.5}
      py={1}
      sx={{
        bgcolor: "#F4F6F8",
        borderRadius: 1.5,
        fontFamily: "monospace",
        fontSize: 12,
        flexWrap: "wrap",
      }}
    >
      <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
        <Chip label={type} size="small" sx={{ fontWeight: 800, fontSize: 10 }} />
        <Typography fontSize={12} fontWeight={600}>{name}</Typography>
        <Typography fontSize={12} color="text.secondary" sx={{ wordBreak: "break-all" }}>
          {value}
        </Typography>
      </Box>
      <Button
        size="small"
        startIcon={<CopyIcon fontSize="small" />}
        onClick={handleCopy}
        sx={{ minWidth: 72, color: copied ? "success.main" : brandColor, textTransform: "none", fontSize: 11 }}
      >
        {copied ? "Copied!" : "Copy"}
      </Button>
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DomainTab({ profile, barber, brandColor }) {
  const [query,         setQuery]         = useState("");
  const [searching,     setSearching]     = useState(false);
  const [result,        setResult]        = useState(null); // { domain, available, price, currency }
  const [searchError,   setSearchError]   = useState("");
  const [purchasing,    setPurchasing]    = useState(false);
  const [purchaseError, setPurchaseError] = useState("");

  // On mount — if we just returned from a successful Stripe checkout, show a banner
  const [justPurchased, setJustPurchased] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("domainSuccess") === "true") {
      setJustPurchased(true);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  // ── [NEW] Bring-your-own-domain state ──────────────────────────────────────
  const [byo,          setByo]          = useState("");           // user's input
  const [byoLoading,   setByoLoading]   = useState(false);
  const [byoError,     setByoError]     = useState("");
  const [byoSuccess,   setByoSuccess]   = useState(false);
  const [byoDnsRecords,setByoDnsRecords]= useState(null);         // [{type,name,value}] returned by API
  // byoDnsRecords is set after a successful /api/connect-custom-domain call so the
  // user can copy the CNAME / A records Cloudflare needs.

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
      // data.price is already the final GBP price including platform markup
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
          // Note: server derives the price server-side from the TLD —
          // we do not send a price to prevent client-side tampering.
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setPurchaseError(err.message);
    } finally {
      setPurchasing(false);
    }
  }

  // ── [NEW] Connect-own-domain handler ──────────────────────────────────────
  /**
   * POST /api/connect-custom-domain
   * Body: { domain: string, barberId: string }
   *
   * Expected success response:
   * {
   *   success: true,
   *   dnsRecords: [
   *     { type: "CNAME", name: "www", value: "custom.yoursaas.com" },
   *     { type: "CNAME", name: "@",   value: "custom.yoursaas.com" }
   *   ]
   * }
   *
   * The server should:
   *  1. Call Cloudflare's "Custom Hostnames" API to add the domain to your zone.
   *  2. Store the resulting customHostnameId + domain against the barber's Firestore doc.
   *  3. Return the DNS records the user must add at their registrar.
   */
  async function handleConnectOwnDomain(e) {
    e?.preventDefault();
    const clean = byo.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!clean || !barber?.uid) return;

    setByoLoading(true);
    setByoError("");
    setByoSuccess(false);
    setByoDnsRecords(null);

    try {
      const res  = await fetch("/api/connect-custom-domain", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: clean, barberId: barber.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to link domain");
      setByoSuccess(true);
      setByoDnsRecords(data.dnsRecords ?? []);
    } catch (err) {
      setByoError(err.message);
    } finally {
      setByoLoading(false);
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const connectedDomain = profile.customDomain || null;
  const domainStatus    = profile.domainStatus  || "active";

  // The server returns the final GBP price directly — no client-side calculation needed.
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

          {/* ── [NEW] Bring Your Own Domain ─────────────────────────────────── */}
          <Divider sx={{ my: 3 }}>
            <Chip label="OR" size="small" sx={{ fontWeight: 700, fontSize: 11 }} />
          </Divider>

          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <LinkIcon sx={{ color: brandColor }} />
            <Typography variant="subtitle1" fontWeight={800}>
              Connect a Domain You Already Own
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Already have a domain with another registrar? Enter it below and we'll link
            it to your booking site via Cloudflare. You'll then add a CNAME record at
            your registrar — it takes about 2 minutes.
          </Typography>

          <Box
            component="form"
            onSubmit={handleConnectOwnDomain}
            display="flex"
            gap={1}
            mb={2}
          >
            <TextField
              fullWidth
              size="small"
              label="Your existing domain"
              placeholder="mybarbershop.co.uk"
              value={byo}
              onChange={e => { setByo(e.target.value); setByoSuccess(false); setByoDnsRecords(null); setByoError(""); }}
              disabled={byoLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="outlined"
              disabled={byoLoading || !byo.trim()}
              sx={{ borderColor: brandColor, color: brandColor, whiteSpace: "nowrap", minWidth: 110 }}
            >
              {byoLoading ? <CircularProgress size={18} sx={{ color: brandColor }} /> : "Connect"}
            </Button>
          </Box>

          {/* BYO error */}
          {byoError && (
            <Alert severity="error" sx={{ mb: 2 }}>{byoError}</Alert>
          )}

          {/* BYO success + DNS instructions */}
          {byoSuccess && (
            <Paper
              variant="outlined"
              sx={{ p: 2.5, borderRadius: 2, borderColor: "success.main", bgcolor: "#F0FFF4" }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <CheckCircleIcon fontSize="small" color="success" />
                <Typography fontWeight={700} color="success.dark" fontSize={14}>
                  Domain linked to Cloudflare!
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Add the following record(s) at your domain registrar's DNS settings.
                Once propagated (usually under 5 minutes, up to 48 hours), your site
                will go live and an SSL certificate will be issued automatically.
              </Typography>

              {byoDnsRecords && byoDnsRecords.length > 0 ? (
                <Box display="flex" flexDirection="column" gap={1}>
                  {byoDnsRecords.map((rec, i) => (
                    <DnsRecordRow
                      key={i}
                      type={rec.type}
                      name={rec.name}
                      value={rec.value}
                      brandColor={brandColor}
                    />
                  ))}
                </Box>
              ) : (
                <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 1 }}>
                  DNS records are being generated — refresh in a moment or check the
                  "Your Connected Domain" panel for the current status.
                </Alert>
              )}

              <Box
                display="flex"
                alignItems="flex-start"
                gap={1}
                mt={2}
                p={1.5}
                sx={{ bgcolor: "#E8F4FD", borderRadius: 1.5 }}
              >
                <InfoIcon fontSize="small" sx={{ color: "info.main", mt: 0.1 }} />
                <Typography variant="caption" color="text.secondary">
                  <strong>Where to add DNS records:</strong> Log in to wherever you
                  registered your domain (e.g. GoDaddy, Namecheap, Google Domains) →
                  find the DNS / Name Server settings → add a CNAME record using the
                  values above. Need help? Most registrars have a "DNS management" guide
                  in their support centre.
                </Typography>
              </Box>
            </Paper>
          )}
          {/* ── END: Bring Your Own Domain ─────────────────────────────────── */}

        </Paper>
      </Grid>

      {/* ── Right column: current domain status ── */}
      <Grid item xs={12} md={5}>
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: "#F8F9FA", height: "100%" }}>
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
      </Grid>

    </Grid>
  );
}