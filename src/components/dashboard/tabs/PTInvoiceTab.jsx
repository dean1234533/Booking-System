import React, { useState, useEffect } from "react";
import {
  Box, Button, Typography, Paper, TextField, Stack, Alert,
  CircularProgress, Chip, Divider, IconButton, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from "@mui/material";
import AddIcon        from "@mui/icons-material/Add";
import DeleteIcon     from "@mui/icons-material/Delete";
import SendIcon       from "@mui/icons-material/Send";
import OpenInNewIcon  from "@mui/icons-material/OpenInNew";
import ReceiptIcon    from "@mui/icons-material/Receipt";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { db } from "../../../firebase/config";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getClientsList } from "../../../firebase/firestore";
import { getAuth } from "firebase/auth";

function statusColor(status) {
  if (status === "paid")   return { bgcolor: "#e8f5e9", color: "#2e7d32" };
  if (status === "open")   return { bgcolor: "#fff3e0", color: "#e65100" };
  if (status === "void")   return { bgcolor: "#fafafa", color: "#9e9e9e" };
  return { bgcolor: "#f5f5f5", color: "#616161" };
}

export default function PTInvoiceTab({ barber, profile, brandColor = "#2563EB" }) {
  const trainerId = barber?.uid;

  const [clients,   setClients]   = useState([]);
  const [invoices,  setInvoices]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [view,      setView]      = useState("list"); // "list" | "new"

  // Form state
  const [selectedClient, setSelectedClient] = useState("");
  const [customName,     setCustomName]     = useState("");
  const [useCustom,      setUseCustom]      = useState(false);
  const [lineItems, setLineItems] = useState([{ description: "", amount: "" }]);
  const [createdLink, setCreatedLink] = useState(null); // { url, email } — shown right after creation
  const [linkCopied,  setLinkCopied]  = useState(false);

  useEffect(() => {
    if (!trainerId) return;
    Promise.all([
      getClientsList(trainerId),
      getDocs(query(collection(db, "barbers", trainerId, "ptInvoices"), orderBy("createdAt", "desc"))).catch(() => ({ docs: [] })),
    ]).then(([cls, snap]) => {
      setClients(cls || []);
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).finally(() => setLoading(false));
  }, [trainerId]);

  function addLine()        { setLineItems(prev => [...prev, { description: "", amount: "" }]); }
  function removeLine(i)    { setLineItems(prev => prev.filter((_, idx) => idx !== i)); }
  function updateLine(i, k, v) {
    setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [k]: v } : item));
  }

  const total = lineItems.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);

  const selectedClientObj = clients.find(c => c.id === selectedClient);
  const recipientEmail = useCustom ? "" : selectedClientObj?.customerEmail || "";
  const recipientName  = useCustom ? customName  : selectedClientObj?.customerName  || "";

  async function handleSend() {
    // Email used to be required so Stripe could email the invoice — now
    // the trainer sends the link themselves, so a name alone (e.g. for a
    // walk-in client with no email on file) is enough to identify who it's
    // for.
    if (!recipientEmail && !recipientName) { setToast({ type: "error", msg: "Enter a client name or email." }); return; }
    if (lineItems.some(l => !l.description || !l.amount)) {
      setToast({ type: "error", msg: "Fill in all line items." }); return;
    }
    if (!profile?.stripeConnected) {
      setToast({ type: "error", msg: "Connect Stripe first in the Finance tab." }); return;
    }

    setSending(true);
    setToast(null);
    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      const res = await fetch("/api/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          barberId:   trainerId,
          clientName: recipientName,
          clientEmail: recipientEmail,
          lineItems:  lineItems.map(l => ({ description: l.description, amount: parseFloat(l.amount) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create payment link");

      // A toast that auto-dismisses plus a silent clipboard copy was easy
      // to miss entirely — show the link itself, front and centre, until
      // the trainer explicitly moves on.
      setCreatedLink({ url: data.invoiceUrl, email: recipientEmail, name: recipientName });
      // Reload invoices
      const snap = await getDocs(query(collection(db, "barbers", trainerId, "ptInvoices"), orderBy("createdAt", "desc"))).catch(() => ({ docs: [] }));
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      // Reset form
      setLineItems([{ description: "", amount: "" }]);
      setSelectedClient(""); setCustomName(""); setUseCustom(false);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Payment Requests</Typography>
          <Typography variant="body2" color="text.secondary">Create a Stripe payment link and send it to your clients yourself</Typography>
        </Box>
        <Button
          variant={view === "new" ? "outlined" : "contained"}
          startIcon={view === "new" ? null : <AddIcon />}
          onClick={() => { setCreatedLink(null); setView(view === "new" ? "list" : "new"); }}
          sx={{ borderRadius: "8px", fontWeight: 700, boxShadow: "none",
            bgcolor: view === "new" ? undefined : brandColor,
            "&:hover": { bgcolor: view === "new" ? undefined : brandColor, filter: "brightness(0.9)" } }}
        >
          {view === "new" ? "Cancel" : "New Payment Request"}
        </Button>
      </Box>

      {!profile?.stripeConnected && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Connect Stripe in the Finance tab before sending invoices.
        </Alert>
      )}

      {toast && (
        <Alert severity={toast.type} sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast.msg}
        </Alert>
      )}

      {/* Link ready — shown front and centre right after creation, since a
          toast plus a silent clipboard copy was too easy to miss entirely. */}
      {view === "new" && createdLink && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: "12px", mb: 3, bgcolor: `${brandColor}08`, borderColor: `${brandColor}44` }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
            <CheckCircleIcon sx={{ color: "#2e7d32" }} />
            <Typography variant="subtitle1" fontWeight={700}>Payment link ready</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            Send this to {createdLink.email || createdLink.name} — it's not emailed automatically.
          </Typography>
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: "8px", bgcolor: "#fff", wordBreak: "break-all", fontFamily: "monospace", fontSize: "0.82rem" }}>
            {createdLink.url}
          </Paper>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              startIcon={linkCopied ? <CheckCircleIcon /> : <ContentCopyIcon />}
              onClick={async () => {
                try { await navigator.clipboard.writeText(createdLink.url); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2200); }
                catch { /* clipboard may be unavailable */ }
              }}
              sx={{ bgcolor: linkCopied ? "#2e7d32" : brandColor, "&:hover": { bgcolor: linkCopied ? "#2e7d32" : brandColor, filter: "brightness(0.9)" } }}
            >
              {linkCopied ? "Copied!" : "Copy Link"}
            </Button>
            <Button variant="outlined" startIcon={<OpenInNewIcon />} href={createdLink.url} target="_blank" rel="noopener">
              Open
            </Button>
            <Button onClick={() => { setCreatedLink(null); setView("list"); }} sx={{ color: "text.secondary" }}>
              Done
            </Button>
          </Stack>
        </Paper>
      )}

      {/* New invoice form */}
      {view === "new" && !createdLink && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: "12px", mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Invoice Details</Typography>

          {/* Recipient */}
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Bill To
          </Typography>
          <Box sx={{ mt: 1, mb: 2 }}>
            {!useCustom ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  select fullWidth size="small" label="Select Client"
                  value={selectedClient}
                  onChange={e => setSelectedClient(e.target.value)}
                >
                  {clients.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.customerName}{c.customerEmail ? ` — ${c.customerEmail}` : ""}
                    </MenuItem>
                  ))}
                </TextField>
                <Button size="small" onClick={() => setUseCustom(true)} sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                  + Custom
                </Button>
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                <TextField size="small" fullWidth label="Full name" value={customName} onChange={e => setCustomName(e.target.value)} autoFocus />
                <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => { setUseCustom(false); setCustomName(""); }}>
                  ← Use client list
                </Button>
              </Stack>
            )}
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Line items */}
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Services
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 1, mb: 2 }}>
            {lineItems.map((item, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small" fullWidth label="Description" placeholder="e.g. Personal Training Session"
                  value={item.description}
                  onChange={e => updateLine(i, "description", e.target.value)}
                />
                <TextField
                  size="small" label="Amount (£)" type="number" placeholder="0.00"
                  value={item.amount}
                  onChange={e => updateLine(i, "amount", e.target.value)}
                  sx={{ width: 130, flexShrink: 0 }}
                  inputProps={{ min: 0, step: "0.01" }}
                />
                {lineItems.length > 1 && (
                  <IconButton size="small" onClick={() => removeLine(i)} sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={addLine} sx={{ alignSelf: "flex-start", color: "text.secondary" }}>
              Add line
            </Button>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          {/* Total */}
          <Stack direction="row" alignItems="flex-end" justifyContent="flex-end" mb={3}>
            <Box textAlign="right">
              <Typography variant="caption" color="text.secondary">Total</Typography>
              <Typography variant="h5" fontWeight={800}>£{total.toFixed(2)}</Typography>
            </Box>
          </Stack>

          <Button
            fullWidth variant="contained" size="large" startIcon={sending ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <SendIcon />}
            onClick={handleSend} disabled={sending || (!recipientEmail && !recipientName) || lineItems.some(l => !l.description || !l.amount)}
            sx={{ borderRadius: "10px", fontWeight: 700, height: 50, boxShadow: "none",
              bgcolor: brandColor, "&:hover": { bgcolor: brandColor, filter: "brightness(0.9)" } }}
          >
            {sending ? "Creating…" : `Create Payment Link for ${recipientName || recipientEmail || "client"}`}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "center" }}>
            You'll get a link to copy and send them yourself — it doesn't email automatically.
          </Typography>
        </Paper>
      )}

      {/* Invoice list */}
      {view === "list" && (
        invoices.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: "12px", borderStyle: "dashed" }}>
            <ReceiptIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
            <Typography variant="body1" fontWeight={600} gutterBottom>No invoices yet</Typography>
            <Typography variant="body2" color="text.secondary">Click "New Invoice" to send your first Stripe invoice.</Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "12px" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, fontSize: "0.75rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" } }}>
                  <TableCell>Client</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Sent</TableCell>
                  <TableCell align="right">Link</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map(inv => (
                  <TableRow key={inv.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{inv.clientName || inv.clientEmail}</Typography>
                      <Typography variant="caption" color="text.secondary">{inv.clientEmail}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        £{inv.total != null ? (inv.total / 100).toFixed(2) : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={inv.status || "sent"} size="small" sx={{ ...statusColor(inv.status), fontWeight: 600, fontSize: "0.72rem" }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {inv.invoiceUrl && (
                        <IconButton size="small" href={inv.invoiceUrl} target="_blank" rel="noopener">
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}
    </Box>
  );
}
