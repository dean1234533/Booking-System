import React, { useState, useEffect } from "react";
import {
  Box, Typography, TextField, Button, Stack, IconButton,
  Grid, FormControl, InputLabel, Select, MenuItem, CircularProgress, Tooltip, Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Print as PrintIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { calcLineTotals, getQuoteLabels } from "../../../utils/tradeJobs";

const SANS  = "'DM Sans', sans-serif";
const SERIF = "'Playfair Display', serif";

const PAYMENT_STATUSES = [
  { value: "unpaid",  label: "Unpaid",  bg: "rgba(0,0,0,0.06)",     color: "rgba(0,0,0,0.55)" },
  { value: "paid",    label: "Paid",    bg: "rgba(22,163,74,0.1)",  color: "#16a34a" },
  { value: "overdue", label: "Overdue", bg: "rgba(220,38,38,0.1)",  color: "#dc2626" },
];

function fieldSx(brand) {
  return {
    "& .MuiInputLabel-root": { color: "rgba(0,0,0,0.55)", fontSize: "0.85rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: brand },
    "& .MuiOutlinedInput-root": {
      color: "#111", borderRadius: "8px", bgcolor: "#fff",
      "& fieldset": { borderColor: "rgba(0,0,0,0.15)" },
      "&:hover fieldset": { borderColor: "rgba(0,0,0,0.35)" },
      "&.Mui-focused fieldset": { borderColor: brand },
    },
    "& .MuiSelect-icon": { color: "rgba(0,0,0,0.45)" },
  };
}

const blankItem = (unit = "item") => ({ id: `i-${Date.now()}-${Math.random()}`, desc: "", qty: "1", unit, price: "" });
const fmt = n => `£${Number(n || 0).toFixed(2)}`;
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function printInvoice(inv, businessName, brandColor, logoUrl) {
  const { subtotal, vat, total } = calcLineTotals(inv.items, inv.vatRate);
  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html><head>
  <title>Invoice — ${esc(inv.clientName)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;color:#1c1917;background:#fff;padding:52px;max-width:860px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:3px solid ${brandColor};margin-bottom:36px}
    .biz-name{font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:700;color:#1c1917;margin-top:8px}
    .label{font-size:0.6rem;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#a8a29e;margin-bottom:3px}
    .meta-val{font-size:0.88rem;color:#1c1917;font-weight:500}
    .quote-title{font-family:'Playfair Display',serif;font-size:2rem;font-weight:400;color:#1c1917;margin-bottom:32px;line-height:1.15}
    .meta-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px;margin-bottom:44px;padding:20px;background:#faf8f5;border-left:3px solid ${brandColor}}
    table{width:100%;border-collapse:collapse;margin-bottom:28px}
    thead tr{border-bottom:2px solid ${brandColor}}
    th{font-size:0.6rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#a8a29e;padding:0 14px 12px;text-align:left}
    th.right{text-align:right}
    td{padding:12px 14px;border-bottom:1px solid #f0ebe2;font-size:0.86rem;color:#44403c;vertical-align:top}
    td.right{text-align:right}
    .totals{margin-left:auto;width:290px;margin-bottom:40px}
    .t-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0ebe2;font-size:0.86rem;color:#78716c}
    .t-final{display:flex;justify-content:space-between;padding:14px 0 0;border-top:2px solid ${brandColor};margin-top:6px}
    .t-final-label{font-family:'Playfair Display',serif;font-size:1.1rem;color:#1c1917}
    .t-final-val{font-family:'Playfair Display',serif;font-size:1.1rem;color:${brandColor};font-weight:700}
    .footer{text-align:center;font-size:0.68rem;color:#a8a29e;letter-spacing:0.08em;padding-top:24px;border-top:1px solid #f0ebe2}
    @media print{body{padding:24px}}
  </style></head><body>
  <div class="header">
    <div>
      ${logoUrl ? `<img src="${logoUrl}" style="height:44px;object-fit:contain;display:block;margin-bottom:8px" alt="logo"/>` : ""}
      <div class="biz-name">${esc(businessName)}</div>
    </div>
    <div style="text-align:right">
      <div class="label">Invoice Reference</div>
      <div class="meta-val">#${inv.reference || (Date.now() % 100000)}</div>
      <div class="label" style="margin-top:12px">Date Issued</div>
      <div class="meta-val">${esc(inv.invoiceDate || new Date().toLocaleDateString("en-GB"))}</div>
    </div>
  </div>
  <div class="quote-title">Invoice for ${esc(inv.jobTitle || "Work Completed")}</div>
  <div class="meta-row">
    <div><div class="label">Bill To</div><div class="meta-val">${esc(inv.clientName)}</div>${inv.clientEmail ? `<div style="font-size:0.78rem;color:#a8a29e;margin-top:2px">${esc(inv.clientEmail)}</div>` : ""}</div>
    <div><div class="label">Property Address</div><div class="meta-val">${esc(inv.address || "—")}</div></div>
    <div><div class="label">Payment Status</div><div class="meta-val" style="text-transform:capitalize">${esc(inv.paymentStatus || "unpaid")}</div></div>
  </div>
  <table>
    <thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th class="right">Unit Price</th><th class="right">Line Total</th></tr></thead>
    <tbody>
      ${(inv.items || []).map(item => `
        <tr>
          <td>${esc(item.desc)}</td>
          <td>${esc(item.qty)}</td>
          <td>${esc(item.unit)}</td>
          <td class="right">${fmt(Number(item.price || 0))}</td>
          <td class="right">${fmt(Number(item.qty || 0) * Number(item.price || 0))}</td>
        </tr>`).join("")}
    </tbody>
  </table>
  <div class="totals">
    <div class="t-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
    ${Number(inv.vatRate) > 0 ? `<div class="t-row"><span>VAT (${esc(inv.vatRate)}%)</span><span>${fmt(vat)}</span></div>` : ""}
    <div class="t-final"><span class="t-final-label">Total</span><span class="t-final-val">${fmt(total)}</span></div>
  </div>
  <div class="footer">${esc(businessName)} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString("en-GB")}</div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 420);
}

export default function PlumberInvoiceTab({ barber, profile, brandColor, businessType, prefill, onPrefillConsumed }) {
  const labels = getQuoteLabels(businessType);
  const blankForm = () => ({
    clientName: "", clientEmail: "", address: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    jobTitle: "", vatRate: "20", paymentStatus: "unpaid",
    items: [blankItem(labels.units[0])],
  });

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blankForm());

  const fx = fieldSx(brandColor);
  const tid = barber?.uid;
  const businessName = profile?.businessName || profile?.name || "Your Business";
  const logoUrl = profile?.logoUrl || "";

  useEffect(() => { load(); }, [tid]);

  useEffect(() => {
    if (!prefill) return;
    const t = calcLineTotals(prefill.items, prefill.vatRate);
    setForm({
      ...blankForm(),
      clientName: prefill.clientName || prefill.client || "",
      clientEmail: prefill.clientEmail || "",
      address: prefill.address || "",
      jobTitle: prefill.jobTitle || prefill.jobType || "",
      vatRate: prefill.vatRate || "20",
      items: prefill.items?.length > 0
        ? prefill.items.map(i => ({ id: `i-${Date.now()}-${Math.random()}`, desc: i.desc, qty: i.qty, unit: i.unit, price: i.price }))
        : [blankItem(labels.units[0])],
      sourceQuoteId: prefill.sourceIsQuote ? prefill.id : undefined,
      sourceJobId: prefill.sourceIsJob ? prefill.id : undefined,
    });
    setView("create");
    onPrefillConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  async function load() {
    if (!tid) return;
    try {
      const snap = await getDocs(collection(db, "barbers", tid, "invoices"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setInvoices(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const updateItem = (id, field, val) => setForm(p => ({ ...p, items: p.items.map(i => i.id === id ? { ...i, [field]: val } : i) }));

  async function saveInvoice() {
    if (!form.clientName.trim()) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        reference: Date.now() % 100000,
        items: form.items.map(({ id, ...rest }) => rest),
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "barbers", tid, "invoices"), data);
      setInvoices(p => [{ id: ref.id, ...data }, ...p]);
      setView("list");
      setForm(blankForm());
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function setPaymentStatus(inv, status) {
    try {
      await updateDoc(doc(db, "barbers", tid, "invoices", inv.id), { paymentStatus: status });
      setInvoices(p => p.map(i => i.id === inv.id ? { ...i, paymentStatus: status } : i));
    } catch (e) { console.error(e); }
  }

  async function deleteInvoice(id) {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await deleteDoc(doc(db, "barbers", tid, "invoices", id));
      setInvoices(p => p.filter(i => i.id !== id));
    } catch (e) { console.error(e); }
  }

  const totals = calcLineTotals(form.items, form.vatRate);

  if (view === "list") return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.5rem", color: "#111", fontWeight: 400, lineHeight: 1.2 }}>Invoices</Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", color: "rgba(0,0,0,0.45)", mt: 0.4 }}>Create, track and print client invoices</Typography>
        </Box>
        <Button startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={() => setView("create")}
          sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.74rem", borderRadius: 0, px: 2.5, py: 1, flexShrink: 0, ml: 2,
            "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" } }}>
          New Invoice
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 7 }}><CircularProgress sx={{ color: brandColor }} size={34} thickness={2} /></Box>
      ) : invoices.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 9, color: "rgba(0,0,0,0.3)" }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.25rem" }}>No invoices yet</Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", mt: 0.75 }}>Create one from a completed job or quote, or start fresh above.</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {invoices.map(inv => {
            const t = calcLineTotals(inv.items, inv.vatRate);
            const ps = PAYMENT_STATUSES.find(s => s.value === (inv.paymentStatus || "unpaid")) || PAYMENT_STATUSES[0];
            return (
              <Box key={inv.id} sx={{ bgcolor: "#fff", border: "1px solid #e5e7eb", p: 2.5, display: "flex", alignItems: "center", gap: 2, borderRadius: "8px" }}>
                <Box sx={{ width: 4, alignSelf: "stretch", bgcolor: brandColor, flexShrink: 0, borderRadius: "4px" }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontFamily: SANS, fontWeight: 700, color: "#111", fontSize: "0.88rem" }}>{inv.clientName}</Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.7rem", color: "rgba(0,0,0,0.45)" }}>{inv.jobTitle || "Work Completed"} · {inv.invoiceDate}</Typography>
                </Box>
                <Chip
                  label={ps.label} size="small" onClick={() => setPaymentStatus(inv, inv.paymentStatus === "paid" ? "unpaid" : "paid")}
                  sx={{ bgcolor: ps.bg, color: ps.color, fontWeight: 700, fontSize: "0.65rem", cursor: "pointer" }}
                />
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.1rem", color: brandColor, fontWeight: 700, flexShrink: 0 }}>{fmt(t.total)}</Typography>
                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                  <Tooltip title="Print / Save PDF">
                    <IconButton size="small" onClick={() => printInvoice(inv, businessName, brandColor, logoUrl)} sx={{ color: "rgba(0,0,0,0.4)", "&:hover": { color: brandColor } }}>
                      <PrintIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => deleteInvoice(inv.id)} sx={{ color: "rgba(0,0,0,0.3)", "&:hover": { color: "#ff6b6b" } }}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <IconButton size="small" onClick={() => setView("list")} sx={{ color: "rgba(0,0,0,0.45)", "&:hover": { color: "#111" } }}>
          <ArrowBackIcon sx={{ fontSize: 19 }} />
        </IconButton>
        <Typography sx={{ fontFamily: SERIF, fontSize: "1.4rem", color: "#111", fontWeight: 400 }}>New Invoice</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Stack spacing={2.5}>
            <Box sx={{ bgcolor: "#fff", border: "1px solid #e5e7eb", p: 2.5, borderRadius: "8px" }}>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", mb: 2 }}>Client Details</Typography>
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Client Name *" value={form.clientName} onChange={e => set("clientName", e.target.value)} sx={fx} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Client Email" value={form.clientEmail} onChange={e => set("clientEmail", e.target.value)} sx={fx} /></Grid>
                </Grid>
                <TextField fullWidth size="small" label="Property Address" value={form.address} onChange={e => set("address", e.target.value)} sx={fx} />
                <TextField fullWidth size="small" label="Job Title" placeholder={labels.jobTitlePlaceholder} value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)} sx={fx} />
              </Stack>
            </Box>

            <Box sx={{ bgcolor: "#fff", border: "1px solid #e5e7eb", p: 2.5, borderRadius: "8px" }}>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", mb: 2 }}>Invoice Settings</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}><TextField fullWidth size="small" label="Date" type="date" value={form.invoiceDate} onChange={e => set("invoiceDate", e.target.value)} InputLabelProps={{ shrink: true }} sx={fx} /></Grid>
                <Grid item xs={6} sm={4}><TextField fullWidth size="small" label="VAT Rate (%)" type="number" value={form.vatRate} onChange={e => set("vatRate", e.target.value)} sx={fx} /></Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small" sx={fx}>
                    <InputLabel>Payment Status</InputLabel>
                    <Select value={form.paymentStatus} label="Payment Status" onChange={e => set("paymentStatus", e.target.value)}
                      MenuProps={{ PaperProps: { sx: { bgcolor: "#fff", color: "#111", borderRadius: "8px", border: "1px solid #e5e7eb" } } }}>
                      {PAYMENT_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ bgcolor: "#fff", border: "1px solid #e5e7eb", p: 2.5, borderRadius: "8px" }}>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", mb: 2 }}>Line Items</Typography>
              <Stack spacing={1.5}>
                {form.items.map((item, idx) => (
                  <Box key={item.id} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", color: brandColor, fontWeight: 700, mt: 1.2, width: 22, flexShrink: 0 }}>{String(idx + 1).padStart(2, "0")}</Typography>
                    <TextField size="small" label="Description" value={item.desc} onChange={e => updateItem(item.id, "desc", e.target.value)} sx={{ ...fx, flex: 1 }} />
                    <TextField size="small" label="Qty" type="number" value={item.qty} onChange={e => updateItem(item.id, "qty", e.target.value)} sx={{ ...fx, width: 68, flexShrink: 0 }} />
                    <FormControl size="small" sx={{ ...fx, width: 90, flexShrink: 0 }}>
                      <InputLabel>Unit</InputLabel>
                      <Select value={item.unit} label="Unit" onChange={e => updateItem(item.id, "unit", e.target.value)}
                        MenuProps={{ PaperProps: { sx: { bgcolor: "#fff", color: "#111", borderRadius: "8px", border: "1px solid #e5e7eb" } } }}>
                        {labels.units.map(u => <MenuItem key={u} value={u} sx={{ fontSize: "0.8rem" }}>{u}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <TextField size="small" label="£ Price" type="number" value={item.price} onChange={e => updateItem(item.id, "price", e.target.value)} sx={{ ...fx, width: 88, flexShrink: 0 }} />
                    <IconButton size="small" onClick={() => setForm(p => ({ ...p, items: p.items.filter(i => i.id !== item.id) }))} sx={{ color: "rgba(0,0,0,0.3)", mt: 0.5, flexShrink: 0, "&:hover": { color: "#ff6b6b" } }}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
              <Button startIcon={<AddIcon sx={{ fontSize: 15 }} />} onClick={() => setForm(p => ({ ...p, items: [...p.items, blankItem(labels.units[0])] }))}
                sx={{ color: brandColor, fontWeight: 700, fontSize: "0.72rem", mt: 2, "&:hover": { bgcolor: `${brandColor}10` } }}>
                Add Line Item
              </Button>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ pb: 2 }}>
              <Button onClick={() => setView("list")} sx={{ color: "rgba(0,0,0,0.5)", fontWeight: 600 }}>Cancel</Button>
              <Button startIcon={<PrintIcon sx={{ fontSize: 16 }} />} onClick={() => printInvoice(form, businessName, brandColor, logoUrl)}
                sx={{ color: brandColor, fontWeight: 700, fontSize: "0.74rem", "&:hover": { bgcolor: `${brandColor}10` } }}>
                Print Preview
              </Button>
              <Button startIcon={saving ? null : <SaveIcon sx={{ fontSize: 16 }} />} onClick={saveInvoice} disabled={saving || !form.clientName.trim()}
                sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.74rem", borderRadius: 0, px: 3, py: 1,
                  "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" }, "&:disabled": { bgcolor: brandColor, opacity: 0.5 } }}>
                {saving ? <CircularProgress size={15} sx={{ color: "#0d0d0d" }} /> : "Save Invoice"}
              </Button>
            </Stack>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Box sx={{ bgcolor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", position: { lg: "sticky" }, top: { lg: 90 } }}>
            <Box sx={{ borderBottom: `3px solid ${brandColor}`, px: 3, py: 1.75 }}>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: brandColor }}>Live Preview</Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              <Typography sx={{ fontFamily: SERIF, fontSize: "1.3rem", color: "#111", mb: 0.5, lineHeight: 1.2 }}>{form.jobTitle || "Work Completed"}</Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.76rem", color: "rgba(0,0,0,0.45)", mb: 2.5 }}>{form.clientName || "Client name"} · {form.invoiceDate}</Typography>
              <Box sx={{ borderTop: "1px solid #e5e7eb", mb: 2 }}>
                {form.items.filter(i => i.desc).length === 0 ? (
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.75rem", color: "rgba(0,0,0,0.3)", py: 2, textAlign: "center" }}>Add line items to see totals</Typography>
                ) : form.items.filter(i => i.desc).map(item => (
                  <Box key={item.id} sx={{ display: "flex", justifyContent: "space-between", py: 1.25, borderBottom: "1px solid #f3f4f6" }}>
                    <Box sx={{ minWidth: 0, pr: 1 }}>
                      <Typography sx={{ fontFamily: SANS, fontSize: "0.8rem", color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.desc}</Typography>
                      <Typography sx={{ fontFamily: SANS, fontSize: "0.66rem", color: "rgba(0,0,0,0.4)" }}>{item.qty} {item.unit}</Typography>
                    </Box>
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.8rem", color: "#111", fontWeight: 600, flexShrink: 0 }}>{fmt(Number(item.qty || 0) * Number(item.price || 0))}</Typography>
                  </Box>
                ))}
              </Box>
              <Stack spacing={0.75}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.76rem", color: "rgba(0,0,0,0.45)" }}>Subtotal</Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.76rem", color: "rgba(0,0,0,0.65)" }}>{fmt(totals.subtotal)}</Typography>
                </Box>
                {Number(form.vatRate) > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.76rem", color: "rgba(0,0,0,0.45)" }}>VAT ({form.vatRate}%)</Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.76rem", color: "rgba(0,0,0,0.65)" }}>{fmt(totals.vat)}</Typography>
                  </Box>
                )}
                <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1.5, borderTop: `2px solid ${brandColor}`, mt: 0.5 }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "1.05rem", color: "#111" }}>Total</Typography>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "1.05rem", color: brandColor, fontWeight: 700 }}>{fmt(totals.total)}</Typography>
                </Box>
              </Stack>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
