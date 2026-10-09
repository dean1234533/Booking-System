import React, { useEffect, useState } from "react";
import {
  Box, Container, Typography, Paper, Chip, MenuItem, Select, Stack,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent, IconButton, Grid,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AdminUnlockScreen from "../components/admin/AdminUnlockScreen";
import PWAInstallBanner from "../components/dashboard/PWAInstallBanner";
import { clearVault } from "../utils/adminVault";

const STATUS_COLOR = { new: "info", contacted: "warning", won: "success", lost: "default" };

function StatCard({ label, value, sub }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: "center" }}>
      <Typography variant="h5" fontWeight={900}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      {sub && <Typography variant="caption" color="text.secondary" display="block">{sub}</Typography>}
    </Paper>
  );
}

function StatsBlock({ title, stats }) {
  if (!stats) return null;
  const splitLine = obj => Object.entries(obj || {}).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—";
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={800} mb={1.5}>{title}</Typography>
      <Grid container spacing={1.5} mb={1.5}>
        <Grid item xs={6} sm={2.4}><StatCard label="Sessions" value={stats.sessions} /></Grid>
        <Grid item xs={6} sm={2.4}><StatCard label="Chats opened" value={stats.opened} /></Grid>
        <Grid item xs={6} sm={2.4}><StatCard label="Leads captured" value={stats.leadsCaptured} /></Grid>
        <Grid item xs={6} sm={2.4}><StatCard label="Start free clicks" value={stats.startFreeClicks} /></Grid>
        <Grid item xs={6} sm={2.4}><StatCard label="Sign-ups" value={stats.signUps} /></Grid>
      </Grid>
      <Typography variant="caption" color="text.secondary" display="block">By audience: {splitLine(stats.byAudience)}</Typography>
      <Typography variant="caption" color="text.secondary" display="block">By campaign: {splitLine(stats.byCampaign)}</Typography>
    </Paper>
  );
}

// Internal-only: lists chatbot leads and shows chat analytics for the
// homepage assistant (src/chat/service.js). Gated by the same admin-key
// vault as AdminCreateAccount (see AdminUnlockScreen) — but unlike that
// page, the real security boundary here is verified SERVER-SIDE before any
// dashboard UI renders: the local vault only decides whether a password
// prompt shows a saved key back to this browser, it never itself proves the
// key is the real one. A wrong key (e.g. someone who set up a fake vault
// with a made-up string) gets exactly one verification call — which the
// Worker's /api/admin-chat-stats rejects with 403 before any lead or
// session data is ever fetched — then the vault is cleared and the visitor
// is sent back to the lock screen. The dashboard's own JSX never mounts in
// between. See the summary this was delivered with for the full chain.
export default function AdminChatLeads() {
  const [adminKey, setAdminKey] = useState(null); // null = locked (no key handed to this component at all yet)
  const [verified, setVerified] = useState(false); // true only after the server itself has accepted the key
  const [verifyError, setVerifyError] = useState(null);
  const [leads, setLeads] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [transcriptLead, setTranscriptLead] = useState(null);

  async function verifyAndLoad(key) {
    setError(null);
    try {
      const statsRes = await fetch("/api/admin-chat-stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adminKey: key }) }).then(r => r.json());
      if (statsRes.error) throw new Error(statsRes.error);
      setStats(statsRes);
      setVerified(true); // only now does the dashboard JSX below ever render

      const leadsRes = await fetch("/api/admin-chat-leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adminKey: key, status: statusFilter || undefined }) }).then(r => r.json());
      if (leadsRes.error) throw new Error(leadsRes.error);
      setLeads(leadsRes.leads || []);
    } catch (err) {
      if (!verified) {
        // Verification itself failed — this was never a real admin key.
        // Clear the local vault so "Set up this device" shows again rather
        // than silently re-offering the same bad key, and never mount the
        // dashboard at all.
        clearVault();
        setAdminKey(null);
        setVerifyError("That admin key was rejected by the server.");
      } else {
        setError(err.message || "Failed to load.");
      }
    }
  }

  useEffect(() => { if (adminKey) verifyAndLoad(adminKey); }, [adminKey, statusFilter]);

  if (adminKey === null) {
    return <AdminUnlockScreen onUnlock={setAdminKey} initialError={verifyError} />;
  }
  // Key handed over locally, but the server hasn't confirmed it yet — show
  // neither the lock screen (we already have a candidate key) nor any part
  // of the dashboard (nothing's confirmed to be a real admin yet).
  if (!verified) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f6f8", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  async function updateStatus(leadId, status) {
    setLeads(prev => prev.map(l => (l.id === leadId ? { ...l, status } : l)));
    await fetch("/api/admin-chat-lead-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adminKey, leadId, status }) }).catch(() => {});
  }

  return (
    <>
      <PWAInstallBanner />
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f6f8", py: 6 }}>
        <Container maxWidth="md">
          <Typography variant="h5" fontWeight={800} mb={0.5}>Chat leads</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Captured by the homepage chatbot when a visitor leaves an email or phone number.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}
          {!leads ? (
            <Box textAlign="center" py={6}><CircularProgress /></Box>
          ) : (
            <>
              <StatsBlock title="Last 7 days" stats={stats?.last7} />
              <StatsBlock title="Last 30 days" stats={stats?.last30} />

              {stats?.topQuestions?.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight={800} mb={1.5}>Top questions (last 30 days)</Typography>
                  <Stack spacing={1}>
                    {stats.topQuestions.map((q, i) => (
                      <Box key={i} display="flex" justifyContent="space-between" gap={2}>
                        <Typography variant="body2" sx={{ flex: 1 }}>{q.example}</Typography>
                        <Chip size="small" label={q.count} />
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              )}

              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Typography variant="subtitle1" fontWeight={800}>Leads</Typography>
                <Select size="small" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} displayEmpty sx={{ minWidth: 140 }}>
                  <MenuItem value="">All statuses</MenuItem>
                  <MenuItem value="new">New</MenuItem>
                  <MenuItem value="contacted">Contacted</MenuItem>
                  <MenuItem value="won">Won</MenuItem>
                  <MenuItem value="lost">Lost</MenuItem>
                </Select>
              </Box>

              {leads.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No leads yet.</Typography>
              ) : leads.map(lead => (
                <Paper key={lead.id} variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 1.5 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                    <Box>
                      <Typography fontWeight={800}>{lead.businessName || "(no business name)"}</Typography>
                      <Typography variant="body2" color="text.secondary">{lead.email || "—"} {lead.phone ? `· ${lead.phone}` : ""}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {lead.audience || "general"} · {lead.utmCampaign ? `campaign: ${lead.utmCampaign}` : "no campaign"} · {new Date(lead.createdAt).toLocaleString("en-GB")}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Select size="small" value={lead.status} onChange={e => updateStatus(lead.id, e.target.value)}>
                        <MenuItem value="new">New</MenuItem>
                        <MenuItem value="contacted">Contacted</MenuItem>
                        <MenuItem value="won">Won</MenuItem>
                        <MenuItem value="lost">Lost</MenuItem>
                      </Select>
                      <Chip size="small" color={STATUS_COLOR[lead.status] || "default"} label={lead.status} />
                    </Stack>
                  </Box>
                  <Typography
                    variant="caption" color="primary" sx={{ cursor: "pointer", display: "inline-block", mt: 1 }}
                    onClick={() => setTranscriptLead(lead)}
                  >
                    View transcript ({lead.transcript?.length || 0} messages)
                  </Typography>
                </Paper>
              ))}
            </>
          )}
        </Container>
      </Box>

      <Dialog open={Boolean(transcriptLead)} onClose={() => setTranscriptLead(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Transcript
          <IconButton onClick={() => setTranscriptLead(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1}>
            {(transcriptLead?.transcript || []).map((m, i) => (
              <Box key={i} sx={{ textAlign: m.role === "user" ? "right" : "left" }}>
                <Typography variant="caption" color="text.secondary" display="block">{m.role === "user" ? "Visitor" : "Bot"}</Typography>
                <Typography variant="body2" sx={{ display: "inline-block", bgcolor: m.role === "user" ? "#eaf2ff" : "#f2f2f4", px: 1.5, py: 1, borderRadius: 2 }}>{m.content}</Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
