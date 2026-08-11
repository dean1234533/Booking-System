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
import { db } from "../../../firebase/config";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getClientsList } from "../../../firebase/firestore";

function statusColor(status) {
  if (status === "paid")   return { bgcolor: "#e8f5e9", color: "#2e7d32" };
  if (status === "open")   return { bgcolor: "#fff3e0", color: "#e65100" };
  if (status === "void")   return { bgcolor: "#fafafa", color: "#9e9e9e" };
  return { bgcolor: "#f5f5f5", color: "#616161" };
}

export default function PTInvoiceTab({ barber, profile, brandColor = "#C9A84C" }) {
  const trainerId = barber?.uid;

  const [clients,   setClients]   = useState([]);
  const [invoices,  setInvoices]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const [view,      setView]      = useState("list"); // "list" | "new"

  // Form state
  const [selectedClient, setSelectedClient] = useState("");
  const [customEmail,    setCustomEmail]    = useState("");
  const [customName,     setCustomName]     = useState("");
  const [useCustom,      setUseCustom]      = useState(false);
  const [lineItems, setLineItems] = useState([{ description: "", amount: "" }]);
  const [dueDate,   setDueDate]   = useState("");

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
  const recipientEmail = useCustom ? customEmail : selectedClientObj?.customerEmail || "";
  const recipientName  = useCustom ? customName  : selectedClientObj?.customerName  || "";

  async function handleSend() {
    if (!recipientEmail) { setToast({ type: "error", msg: "Enter a client email." }); return; }
    if (lineItems.some(l => !l.description || !l.amount)) {
      setToast({ type: "error", msg: "Fill in all line items." }); return;
    }
    if (!profile?.stripeConnected) {
      setToast({ type: "error", msg: "Connect Stripe first in the Finance tab." }); return;
    }

    setSending(true);
    setToast(null);
    try {
      const res = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId:   trainerId,
          clientName: recipientName,
          clientEmail: recipientEmail,
          lineItems:  lineItems.map(l => ({ description: l.description, amount: parseFloat(l.amount) })),
          dueDate:    dueDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create invoice");

      setToast({ type: "success", msg: `Invoice sent to ${recipientEmail}` });
      // Reload invoices
      const snap = await getDocs(query(collection(db, "barbers", trainerId, "ptInvoices"), orderBy("createdAt", "desc"))).catch(() => ({ docs: [] }));
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      // Reset form
      setLineItems([{ description: "", amount: "" }]);
      setSelectedClient(""); setCustomEmail(""); setCustomName(""); setDueDate(""); setUseCustom(false);
      setView("list");
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
          <Typography variant="h6" fontWeight={700}>Invoices</Typography>
          <Typography variant="body2" color="text.secondary">Create and send Stripe invoices to your clients</Typography>
        </Box>
        <Button
          variant={view === "new" ? "outlined" : "contained"}
          startIcon={view === "new" ? null : <AddIcon />}
          onClick={() => setView(view === "new" ? "list" : "new")}
          sx={{ borderRadius: "8px", fontWeight: 700, boxShadow: "none",
            bgcolor: view === "new" ? undefined : brandColor,
            "&:hover": { bgcolor: view === "new" ? undefined : brandColor, filter: "brightness(0.9)" } }}
        >
          {view === "new" ? "Cancel" : "New Invoice"}
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

      {/* New invoice form */}
      {view === "new" && (
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
                <Stack direction="row" spacing={1}>
                  <TextField size="small" fullWidth label="Name" value={customName} onChange={e => setCustomName(e.target.value)} />
                  <TextField size="small" fullWidth label="Email" type="email" value={customEmail} onChange={e => setCustomEmail(e.target.value)} />
                </Stack>
                <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => { setUseCustom(false); setCustomName(""); setCustomEmail(""); }}>
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

          {/* Total + due date */}
          <Stack direction="row" spacing={2} alignItems="flex-end" justifyContent="space-between" mb={3}>
            <TextField
              size="small" label="Due Date (optional)" type="date"
              value={dueDate} onChange={e => setDueDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 200 }}
              helperText="Defaults to 7 days if not set"
            />
            <Box textAlign="right">
              <Typography variant="caption" color="text.secondary">Total</Typography>
              <Typography variant="h5" fontWeight={800}>£{total.toFixed(2)}</Typography>
            </Box>
          </Stack>

          <Button
            fullWidth variant="contained" size="large" startIcon={sending ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <SendIcon />}
            onClick={handleSend} disabled={sending || !recipientEmail || lineItems.some(l => !l.description || !l.amount)}
            sx={{ borderRadius: "10px", fontWeight: 700, height: 50, boxShadow: "none",
              bgcolor: brandColor, "&:hover": { bgcolor: brandColor, filter: "brightness(0.9)" } }}
          >
            {sending ? "Sending…" : `Send Invoice to ${recipientEmail || "client"}`}
          </Button>
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
