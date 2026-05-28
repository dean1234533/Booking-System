import React, { useState } from "react";
import {
  Box, Button, Typography, Paper, Grid, TextField,
  CircularProgress, Alert, Divider, Chip, Stack,
  IconButton, Tooltip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from "@mui/material";
import {
  Receipt as ReceiptIcon,
  Send as SendIcon,
  CheckCircle as CheckIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function InvoiceTab({ barber, profile, brandColor = "#C9A84C" }) {
  const [invoices, setInvoices] = useState([]);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const functions = getFunctions();

  async function handleSendInvoice() {
    if (!clientEmail || !amount || !description) return;
    if (!profile?.stripeConnected) {
      setToast({ type: "warning", msg: "Connect Stripe in the Finance tab before sending invoices." });
      return;
    }
    setSending(true);
    try {
      const createInvoice = httpsCallable(functions, "createStripeInvoice");
      const result = await createInvoice({
        clientName,
        clientEmail,
        amount: Number(amount),
        description,
      });

      setInvoices(prev => [{
        id: Date.now(),
        clientName,
        clientEmail,
        amount: Number(amount),
        description,
        invoiceUrl: result.data.invoiceUrl,
        sentAt: new Date().toLocaleString(),
      }, ...prev]);

      setToast({ type: "success", msg: `Invoice sent to ${clientEmail}` });
      setClientName("");
      setClientEmail("");
      setAmount("");
      setDescription("");
    } catch (err) {
      setToast({ type: "error", msg: "Failed to send invoice: " + err.message });
    } finally {
      setSending(false);
    }
  }

  const canSend = clientEmail && amount && description && !sending;

  return (
    <Box>
      {toast && (
        <Alert severity={toast.type} onClose={() => setToast(null)} sx={{ mb: 2, borderRadius: 2 }}>
          {toast.msg}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* ── Form ── */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
              <ReceiptIcon sx={{ color: brandColor }} />
              <Typography variant="subtitle1" fontWeight={800}>New Invoice</Typography>
            </Stack>

            <Stack spacing={2}>
              <TextField
                fullWidth size="small" label="Client Name"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
              />
              <TextField
                fullWidth size="small" label="Client Email" type="email"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
              />
              <TextField
                fullWidth size="small" label="Description"
                placeholder="e.g. Personal Training Session — May"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              <TextField
                fullWidth size="small" label="Amount (£)" type="number"
                inputProps={{ min: 1, step: 0.01 }}
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
              <Button
                fullWidth variant="contained"
                startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                disabled={!canSend}
                onClick={handleSendInvoice}
                sx={{ bgcolor: brandColor, borderRadius: 2, fontWeight: 700, py: 1.25 }}
              >
                {sending ? "Sending…" : "Send Invoice"}
              </Button>
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <Typography variant="caption" color="text.secondary" lineHeight={1.6}>
              Invoices are sent via Stripe and routed through your connected account.
              The client receives a secure payment link and has 7 days to pay.
              A 2.5% platform fee is deducted automatically — the same rate as online bookings.
            </Typography>
          </Paper>
        </Grid>

        {/* ── Sent invoices ── */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
              <Typography variant="subtitle1" fontWeight={800}>Sent This Session</Typography>
              <Chip
                label={`${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: invoices.length ? `${brandColor}22` : "#f0f0f0",
                  color: invoices.length ? brandColor : "#aaa",
                }}
              />
            </Stack>

            {invoices.length === 0 ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={6} color="text.disabled">
                <ReceiptIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
                <Typography fontSize={13}>No invoices sent yet this session</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Client</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="center">Link</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.map(inv => (
                      <TableRow key={inv.id} hover>
                        <TableCell>
                          <Typography fontSize={12} fontWeight={700}>{inv.clientName || "—"}</Typography>
                          <Typography fontSize={11} color="text.secondary">{inv.clientEmail}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontSize={12} noWrap sx={{ maxWidth: 160 }}>{inv.description}</Typography>
                          <Typography fontSize={11} color="text.secondary">{inv.sentAt}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontSize={12} fontWeight={700}>£{Number(inv.amount).toFixed(2)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<CheckIcon sx={{ fontSize: "14px !important" }} />}
                            label="Sent"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontSize: 10, fontWeight: 700, height: 20 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {inv.invoiceUrl ? (
                            <Tooltip title="Open invoice">
                              <IconButton
                                size="small"
                                component="a"
                                href={inv.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <OpenInNewIcon sx={{ fontSize: 16, color: brandColor }} />
                              </IconButton>
                            </Tooltip>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}