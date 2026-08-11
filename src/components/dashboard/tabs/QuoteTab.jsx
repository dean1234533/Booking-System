import React, { useState, useEffect } from "react";
import {
  Box, Typography, TextField, Button, Stack, IconButton,
  Grid, FormControl, InputLabel, Select, MenuItem, CircularProgress, Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Print as PrintIcon,
  Save as SaveIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import {
  collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase/config";

const SANS  = "'DM Sans', sans-serif";
const SERIF = "'Playfair Display', serif";
const UNITS = ["m²", "m", "hrs", "days", "item", "room", "coat", "door", "window"];

function fieldSx(brand) {
  return {
    "& .MuiInputLabel-root": { color: "rgba(0,0,0,0.55)", fontSize: "0.85rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: brand },
    "& .MuiOutlinedInput-root": {
      color: "#111", borderRadius: "8px",
      bgcolor: "#fff",
      "& fieldset":             { borderColor: "rgba(0,0,0,0.15)" },
      "&:hover fieldset":       { borderColor: "rgba(0,0,0,0.35)" },
      "&.Mui-focused fieldset": { borderColor: brand },
    },
    "& .MuiSelect-icon": { color: "rgba(0,0,0,0.45)" },
  };
}

const blankItem = () => ({ id: `i-${Date.now()}-${Math.random()}`, desc: "", qty: "1", unit: "item", price: "" });

function calcTotals(items, vatRate) {
  const subtotal = (items || []).reduce((s, i) => s + (Number(i.qty || 0) * Number(i.price || 0)), 0);
  const vat      = subtotal * (Number(vatRate || 0) / 100);
  return { subtotal, vat, total: subtotal + vat };
}

function fmt(n) { return `£${Number(n || 0).toFixed(2)}`; }

function printQuote(q, businessName, brandColor, logoUrl) {
  const { subtotal, vat, total } = calcTotals(q.items, q.vatRate);
  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html><head>
  <title>Quote — ${esc(q.clientName)}</title>
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
    .notes{background:#faf8f5;border-left:3px solid ${brandColor};padding:18px 22px;font-size:0.84rem;color:#78716c;line-height:1.65;margin-bottom:40px}
    .footer{text-align:center;font-size:0.68rem;color:#a8a29e;letter-spacing:0.08em;padding-top:24px;border-top:1px solid #f0ebe2}
    @media print{body{padding:24px}}
  </style></head><body>
  <div class="header">
    <div>
      ${logoUrl ? `<img src="${logoUrl}" style="height:44px;object-fit:contain;display:block;margin-bottom:8px" alt="logo"/>` : ""}
      <div class="biz-name">${esc(businessName)}</div>
    </div>
    <div style="text-align:right">
      <div class="label">Quote Reference</div>
      <div class="meta-val">#${q.reference || (Date.now() % 100000)}</div>
      <div class="label" style="margin-top:12px">Date Issued</div>
      <div class="meta-val">${esc(q.quoteDate || new Date().toLocaleDateString("en-GB"))}</div>
    </div>
  </div>
  <div class="quote-title">Quotation for ${esc(q.jobTitle || "Decorating Works")}</div>
  <div class="meta-row">
    <div><div class="label">Prepared For</div><div class="meta-val">${esc(q.clientName)}</div>${q.clientEmail ? `<div style="font-size:0.78rem;color:#a8a29e;margin-top:2px">${esc(q.clientEmail)}</div>` : ""}</div>
    <div><div class="label">Property Address</div><div class="meta-val">${esc(q.address || "—")}</div></div>
    <div><div class="label">Valid For</div><div class="meta-val">${esc(q.validDays || 30)} days</div></div>
  </div>
  <table>
    <thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th class="right">Unit Price</th><th class="right">Line Total</th></tr></thead>
    <tbody>
      ${(q.items || []).map(item => `
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
    ${Number(q.vatRate) > 0 ? `<div class="t-row"><span>VAT (${esc(q.vatRate)}%)</span><span>${fmt(vat)}</span></div>` : ""}
    <div class="t-final"><span class="t-final-label">Total</span><span class="t-final-val">${fmt(total)}</span></div>
  </div>
  ${q.notes ? `<div class="notes"><strong>Notes &amp; Terms:</strong><br>${esc(q.notes)}</div>` : ""}
  <div class="footer">${esc(businessName)} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString("en-GB")}</div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 420);
}

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export default function QuoteTab({ barber, profile, brandColor }) {
  const [quotes,  setQuotes]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState("list");
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState("");
  const [form,    setForm]    = useState({
    clientName: "", clientEmail: "", address: "",
    quoteDate:  new Date().toISOString().split("T")[0],
    jobTitle:   "", validDays: "30", vatRate: "20",
    items: [blankItem()], notes: "",
  });

  const fx           = fieldSx(brandColor);
  const tid          = barber?.uid;
  const businessName = profile?.businessName || profile?.name || "Your Business";
  const logoUrl      = profile?.logoUrl || "";

  useEffect(() => { load(); }, [tid]);

  async function load() {
    if (!tid) return;
    try {
      const snap = await getDocs(collection(db, "barbers", tid, "quotes"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setQuotes(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function updateItem(id, field, val) {
    setForm(p => ({ ...p, items: p.items.map(i => i.id === id ? { ...i, [field]: val } : i) }));
  }

  async function saveQuote() {
    if (!form.clientName.trim()) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        reference: Date.now() % 100000,
        items: form.items.map(({ id, ...rest }) => rest),
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "barbers", tid, "quotes"), data);
      setQuotes(p => [{ id: ref.id, ...data }, ...p]);
      setView("list");
      setForm({ clientName: "", clientEmail: "", address: "", quoteDate: new Date().toISOString().split("T")[0], jobTitle: "", validDays: "30", vatRate: "20", items: [blankItem()], notes: "" });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function deleteQuote(id) {
    if (!window.confirm("Delete this quote?")) return;
    try {
      await deleteDoc(doc(db, "barbers", tid, "quotes", id));
      setQuotes(p => p.filter(q => q.id !== id));
    } catch (e) { console.error(e); }
  }

  function copyLink(q) {
    const url = `${window.location.origin}/quote-view/${tid}/${q.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setToast("Quote link copied to clipboard!");
    setTimeout(() => setToast(""), 2800);
  }

  const Flash = () => toast ? (
    <Box sx={{ mb: 2.5, px: 2, py: 1.25, bgcolor: `${brandColor}15`, border: `1px solid ${brandColor}35`, fontFamily: SANS, fontSize: "0.78rem", color: brandColor, borderRadius: "6px" }}>
      {toast}
    </Box>
  ) : null;

  const totals = calcTotals(form.items, form.vatRate);

  // ── LIST ──────────────────────────────────────────────────────────────────
  if (view === "list") return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.5rem", color: "#111", fontWeight: 400, lineHeight: 1.2 }}>
            Quote Generator
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", color: "rgba(0,0,0,0.45)", mt: 0.4 }}>
            Instant professional quotes with live PDF preview
          </Typography>
        </Box>
        <Button
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => setView("create")}
          sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.74rem", letterSpacing: "0.06em", borderRadius: 0, px: 2.5, py: 1, flexShrink: 0, ml: 2,
            "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" },
          }}
        >
          New Quote
        </Button>
      </Box>

      <Flash />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 7 }}>
          <CircularProgress sx={{ color: brandColor }} size={34} thickness={2} />
        </Box>
      ) : quotes.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 9, color: "rgba(0,0,0,0.3)" }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.25rem" }}>No quotes yet</Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", mt: 0.75 }}>Generate your first professional quote above</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {quotes.map(q => {
            const t = calcTotals(q.items, q.vatRate);
            return (
              <Box key={q.id} sx={{ bgcolor: "#fff", border: "1px solid #e5e7eb", p: 2.5, display: "flex", alignItems: "center", gap: 2, borderRadius: "8px" }}>
                <Box sx={{ width: 4, alignSelf: "stretch", bgcolor: brandColor, flexShrink: 0, borderRadius: "4px" }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontFamily: SANS, fontWeight: 700, color: "#111", fontSize: "0.88rem" }}>{q.clientName}</Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.7rem", color: "rgba(0,0,0,0.45)" }}>
                    {q.jobTitle || "Decorating Works"} · {q.quoteDate}
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.1rem", color: brandColor, fontWeight: 700, flexShrink: 0 }}>
                  {fmt(t.total)}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                  <Tooltip title="Copy client link">
                    <IconButton size="small" onClick={() => copyLink(q)}
                      sx={{ color: "rgba(0,0,0,0.4)", "&:hover": { color: brandColor } }}>
                      <ContentCopyIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Print / Save PDF">
                    <IconButton size="small" onClick={() => printQuote(q, businessName, brandColor, logoUrl)}
                      sx={{ color: "rgba(0,0,0,0.4)", "&:hover": { color: brandColor } }}>
                      <PrintIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => deleteQuote(q.id)}
                      sx={{ color: "rgba(0,0,0,0.3)", "&:hover": { color: "#ff6b6b" } }}>
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

  // ── CREATE ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <IconButton size="small" onClick={() => setView("list")}
          sx={{ color: "rgba(0,0,0,0.45)", "&:hover": { color: "#111" } }}>
          <ArrowBackIcon sx={{ fontSize: 19 }} />
        </IconButton>
        <Typography sx={{ fontFamily: SERIF, fontSize: "1.4rem", color: "#111", fontWeight: 400 }}>
          New Quote
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* ── Form ── */}
        <Grid item xs={12} lg={7}>
          <Stack spacing={2.5}>

            {/* Client */}
            <Box sx={{ bgcolor: "#fff", border: "1px solid #e5e7eb", p: 2.5, borderRadius: "8px" }}>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", mb: 2 }}>
                Client Details
              </Typography>
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="Client Name *" value={form.clientName} onChange={e => set("clientName", e.target.value)} sx={fx} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="Client Email" value={form.clientEmail} onChange={e => set("clientEmail", e.target.value)} sx={fx} />
                  </Grid>
                </Grid>
                <TextField fullWidth size="small" label="Property Address" value={form.address} onChange={e => set("address", e.target.value)} sx={fx} />
                <TextField fullWidth size="small" label="Job Title" placeholder="e.g. Full interior decoration — 3-bed semi" value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)} sx={fx} />
              </Stack>
            </Box>

            {/* Settings */}
            <Box sx={{ bgcolor: "#fff", border: "1px solid #e5e7eb", p: 2.5, borderRadius: "8px" }}>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", mb: 2 }}>
                Quote Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth size="small" label="Date" type="date" value={form.quoteDate} onChange={e => set("quoteDate", e.target.value)} InputLabelProps={{ shrink: true }} sx={fx} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField fullWidth size="small" label="Valid for (days)" type="number" value={form.validDays} onChange={e => set("validDays", e.target.value)} sx={fx} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField fullWidth size="small" label="VAT Rate (%)" type="number" value={form.vatRate} onChange={e => set("vatRate", e.target.value)} sx={fx} />
                </Grid>
              </Grid>
            </Box>

            {/* Line items */}
            <Box sx={{ bgcolor: "#fff", border: "1px solid #e5e7eb", p: 2.5, borderRadius: "8px" }}>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", mb: 2 }}>
                Line Items
              </Typography>
              <Stack spacing={1.5}>
                {form.items.map((item, idx) => (
                  <Box key={item.id} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", color: brandColor, fontWeight: 700, mt: 1.2, width: 22, flexShrink: 0 }}>
                      {String(idx + 1).padStart(2, "0")}
                    </Typography>
                    <TextField size="small" label="Description" value={item.desc} onChange={e => updateItem(item.id, "desc", e.target.value)} sx={{ ...fx, flex: 1 }} />
                    <TextField size="small" label="Qty" type="number" value={item.qty} onChange={e => updateItem(item.id, "qty", e.target.value)} sx={{ ...fx, width: 68, flexShrink: 0 }} />
                    <FormControl size="small" sx={{ ...fx, width: 84, flexShrink: 0 }}>
                      <InputLabel>Unit</InputLabel>
                      <Select value={item.unit} label="Unit" onChange={e => updateItem(item.id, "unit", e.target.value)}
                        MenuProps={{ PaperProps: { sx: { bgcolor: "#fff", color: "#111", borderRadius: "8px", border: "1px solid #e5e7eb" } } }}>
                        {UNITS.map(u => (
                          <MenuItem key={u} value={u} sx={{ fontSize: "0.8rem", "&:hover": { bgcolor: `${brandColor}20` } }}>{u}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField size="small" label="£ Price" type="number" value={item.price} onChange={e => updateItem(item.id, "price", e.target.value)} sx={{ ...fx, width: 88, flexShrink: 0 }} />
                    <IconButton size="small" onClick={() => setForm(p => ({ ...p, items: p.items.filter(i => i.id !== item.id) }))}
                      sx={{ color: "rgba(0,0,0,0.3)", mt: 0.5, flexShrink: 0, "&:hover": { color: "#ff6b6b" } }}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
              <Button startIcon={<AddIcon sx={{ fontSize: 15 }} />}
                onClick={() => setForm(p => ({ ...p, items: [...p.items, blankItem()] }))}
                sx={{ color: brandColor, fontWeight: 700, fontSize: "0.72rem", mt: 2, "&:hover": { bgcolor: `${brandColor}10` } }}>
                Add Line Item
              </Button>
            </Box>

            {/* Notes */}
            <Box sx={{ bgcolor: "#fff", border: "1px solid #e5e7eb", p: 2.5, borderRadius: "8px" }}>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", mb: 2 }}>
                Notes & Terms
              </Typography>
              <TextField fullWidth multiline rows={3} label="Additional notes or terms of service" value={form.notes} onChange={e => set("notes", e.target.value)} sx={fx} />
            </Box>

            {/* Actions */}
            <Stack direction="row" spacing={1.5} sx={{ pb: 2 }}>
              <Button onClick={() => setView("list")}
                sx={{ color: "rgba(0,0,0,0.5)", fontWeight: 600 }}>
                Cancel
              </Button>
              <Button
                startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
                onClick={() => printQuote({ ...form, items: form.items }, businessName, brandColor, logoUrl)}
                sx={{ color: brandColor, fontWeight: 700, fontSize: "0.74rem", "&:hover": { bgcolor: `${brandColor}10` } }}
              >
                Print Preview
              </Button>
              <Button
                startIcon={saving ? null : <SaveIcon sx={{ fontSize: 16 }} />}
                onClick={saveQuote}
                disabled={saving || !form.clientName.trim()}
                sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.74rem", borderRadius: 0, px: 3, py: 1,
                  "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" },
                  "&:disabled": { bgcolor: brandColor, opacity: 0.5 },
                }}
              >
                {saving ? <CircularProgress size={15} sx={{ color: "#0d0d0d" }} /> : "Save Quote"}
              </Button>
            </Stack>
          </Stack>
        </Grid>

        {/* ── Live Preview ── */}
        <Grid item xs={12} lg={5}>
          <Box sx={{
            bgcolor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px",
            position: { lg: "sticky" }, top: { lg: 90 },
          }}>
            <Box sx={{ borderBottom: `3px solid ${brandColor}`, px: 3, py: 1.75 }}>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: brandColor }}>
                Live Preview
              </Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              <Typography sx={{ fontFamily: SERIF, fontSize: "1.3rem", color: "#111", mb: 0.5, lineHeight: 1.2 }}>
                {form.jobTitle || "Decorating Works"}
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.76rem", color: "rgba(0,0,0,0.45)", mb: 2.5 }}>
                {form.clientName || "Client name"} · {form.quoteDate}
              </Typography>

              {/* Items */}
              <Box sx={{ borderTop: "1px solid #e5e7eb", mb: 2 }}>
                {form.items.filter(i => i.desc).length === 0 ? (
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.75rem", color: "rgba(0,0,0,0.3)", py: 2, textAlign: "center" }}>
                    Add line items to see totals
                  </Typography>
                ) : form.items.filter(i => i.desc).map(item => (
                  <Box key={item.id} sx={{ display: "flex", justifyContent: "space-between", py: 1.25, borderBottom: "1px solid #f3f4f6" }}>
                    <Box sx={{ minWidth: 0, pr: 1 }}>
                      <Typography sx={{ fontFamily: SANS, fontSize: "0.8rem", color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.desc}</Typography>
                      <Typography sx={{ fontFamily: SANS, fontSize: "0.66rem", color: "rgba(0,0,0,0.4)" }}>{item.qty} {item.unit}</Typography>
                    </Box>
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.8rem", color: "#111", fontWeight: 600, flexShrink: 0 }}>
                      {fmt(Number(item.qty || 0) * Number(item.price || 0))}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Totals */}
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

              {form.notes && (
                <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px solid #e5e7eb" }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.7rem", color: "rgba(0,0,0,0.45)", lineHeight: 1.65 }}>
                    {form.notes}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
