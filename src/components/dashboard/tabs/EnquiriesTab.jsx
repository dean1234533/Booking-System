import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Typography, TextField, Button, Stack, IconButton, Chip,
  Grid, CircularProgress, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Tooltip,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  RequestQuote as RequestQuoteIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import {
  collection, getDocs, doc, updateDoc, deleteDoc, orderBy, query,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { ENQUIRY_STATUSES } from "../../../utils/tradeJobs";

const SANS  = "'DM Sans', sans-serif";
const SERIF = SANS;

const STATUS_COLOR = {
  new:                 { bg: "rgba(37,99,235,0.1)",  color: "#1d4ed8" },
  contacted:           { bg: "rgba(0,0,0,0.06)",      color: "rgba(0,0,0,0.6)" },
  "site visit booked": { bg: "rgba(147,51,234,0.1)",  color: "#7e22ce" },
  quoted:              { bg: "rgba(234,179,8,0.14)",  color: "#b45309" },
  accepted:            { bg: "rgba(22,163,74,0.1)",   color: "#16a34a" },
  scheduled:           { bg: "rgba(22,163,74,0.14)",  color: "#15803d" },
  completed:           { bg: "rgba(22,163,74,0.18)",  color: "#166534" },
  declined:            { bg: "rgba(220,38,38,0.1)",   color: "#dc2626" },
};

const URGENCY_COLOR = {
  emergency: "#dc2626",
  urgent:    "#ea580c",
  routine:   "#2563eb",
  flexible:  "rgba(0,0,0,0.4)",
};

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

export default function EnquiriesTab({ barber, brandColor, onConvertToQuote }) {
  const [enquiries, setEnquiries] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected,  setSelected]  = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fx = fieldSx(brandColor);
  const tid = barber?.uid;

  useEffect(() => { load(); }, [tid]);

  async function load() {
    if (!tid) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "barbers", tid, "enquiries"), orderBy("submittedAt", "desc")));
      setEnquiries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      // orderBy requires the field to exist on every doc — fall back to unordered read
      try {
        const snap = await getDocs(collection(db, "barbers", tid, "enquiries"));
        setEnquiries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
    } finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return enquiries.filter(e => {
      const matchesStatus = statusFilter === "all" || (e.status || "new") === statusFilter;
      const matchesSearch = !term || [e.name, e.phone, e.email, e.address, e.postcode, e.problemDescription]
        .some(v => v?.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [enquiries, search, statusFilter]);

  async function setStatus(enquiry, status) {
    try {
      await updateDoc(doc(db, "barbers", tid, "enquiries", enquiry.id), { status });
      setEnquiries(p => p.map(e => e.id === enquiry.id ? { ...e, status } : e));
      setSelected(s => s?.id === enquiry.id ? { ...s, status } : s);
    } catch (e) { console.error(e); }
  }

  async function addNote(enquiry) {
    if (!noteDraft.trim()) return;
    setSavingNote(true);
    try {
      const note = { text: noteDraft.trim(), createdAt: new Date().toISOString() };
      const notes = [...(enquiry.notes || []), note];
      await updateDoc(doc(db, "barbers", tid, "enquiries", enquiry.id), { notes });
      setEnquiries(p => p.map(e => e.id === enquiry.id ? { ...e, notes } : e));
      setSelected(s => s?.id === enquiry.id ? { ...s, notes } : s);
      setNoteDraft("");
    } catch (e) { console.error(e); }
    finally { setSavingNote(false); }
  }

  async function removeEnquiry(id) {
    if (!window.confirm("Delete this enquiry? This can't be undone.")) return;
    try {
      await deleteDoc(doc(db, "barbers", tid, "enquiries", id));
      setEnquiries(p => p.filter(e => e.id !== id));
      setSelected(s => s?.id === id ? null : s);
    } catch (e) { console.error(e); }
  }

  async function convertToQuote(enquiry) {
    if (enquiry.convertedToQuoteId) return;
    try {
      await updateDoc(doc(db, "barbers", tid, "enquiries", enquiry.id), { status: "quoted" });
      setEnquiries(p => p.map(e => e.id === enquiry.id ? { ...e, status: "quoted" } : e));
    } catch (e) { console.error(e); }
    onConvertToQuote?.({
      name: enquiry.name, email: enquiry.email, address: enquiry.address,
      problemDescription: enquiry.problemDescription, sourceEnquiryId: enquiry.id,
    });
    setSelected(null);
  }

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", py: 7 }}><CircularProgress sx={{ color: brandColor }} size={34} thickness={2} /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontFamily: SERIF, fontSize: "1.5rem", color: "#111", fontWeight: 400, lineHeight: 1.2 }}>
          Enquiries
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", color: "rgba(0,0,0,0.45)", mt: 0.4 }}>
          Job requests submitted from your public page
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 3 }}>
        <TextField
          size="small" fullWidth placeholder="Search name, phone, address, postcode…"
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, color: "rgba(0,0,0,0.35)", mr: 1 }} /> }}
          sx={fx}
        />
        <FormControl size="small" sx={{ ...fx, minWidth: 190, flexShrink: 0 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}
            MenuProps={{ PaperProps: { sx: { bgcolor: "#fff", color: "#111", borderRadius: "8px", border: "1px solid #e5e7eb" } } }}>
            <MenuItem value="all">All statuses</MenuItem>
            {ENQUIRY_STATUSES.map(s => <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      {filtered.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 9, color: "rgba(0,0,0,0.3)" }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.25rem" }}>No enquiries {enquiries.length ? "match your filters" : "yet"}</Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", mt: 0.75 }}>
            {enquiries.length ? "Try clearing the search or status filter." : "New job requests will appear here as soon as someone submits your job-request form."}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {filtered.map(enquiry => {
            const sc = STATUS_COLOR[enquiry.status || "new"] || STATUS_COLOR.new;
            return (
              <Box key={enquiry.id} onClick={() => setSelected(enquiry)}
                sx={{ bgcolor: "#fff", border: "1px solid #dfe3e7", p: 2.25, borderRadius: "18px 18px 18px 6px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 2, transition: "border-color .15s, transform .15s, box-shadow .15s",
                  "&:hover": { borderColor: brandColor, transform: "translateY(-2px)", boxShadow: "0 12px 28px rgba(17,17,22,.07)" } }}>
                {enquiry.urgency && (
                  <Box sx={{ width: 4, alignSelf: "stretch", bgcolor: URGENCY_COLOR[enquiry.urgency] || "rgba(0,0,0,0.15)", flexShrink: 0, borderRadius: "4px" }} />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography sx={{ fontFamily: SANS, fontWeight: 700, color: "#111", fontSize: "0.88rem" }}>{enquiry.name || "Unnamed"}</Typography>
                    {enquiry.serviceCategory && (
                      <Chip label={enquiry.serviceCategory} size="small" sx={{ bgcolor: `${brandColor}15`, color: brandColor, fontSize: "0.6rem", height: 18, borderRadius: 0 }} />
                    )}
                  </Box>
                  <Typography noWrap sx={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(0,0,0,0.45)", mt: 0.25 }}>
                    {enquiry.problemDescription || enquiry.message || "No description provided"}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.66rem", color: "rgba(0,0,0,0.35)", mt: 0.25 }}>
                    {enquiry.address || enquiry.postcode || ""} {enquiry.submittedAt?.toDate ? `· ${enquiry.submittedAt.toDate().toLocaleDateString("en-GB")}` : ""}
                  </Typography>
                </Box>
                <Chip label={enquiry.status || "new"} size="small" sx={{ ...sc, fontWeight: 700, fontSize: "0.65rem", textTransform: "capitalize", flexShrink: 0 }} />
              </Box>
            );
          })}
        </Stack>
      )}

      {/* ── Detail dialog ── */}
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        {selected && (
          <>
            <DialogTitle sx={{ fontFamily: SERIF, fontWeight: 400 }}>{selected.name || "Enquiry"}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  {selected.phone && (
                    <Button size="small" startIcon={<PhoneIcon sx={{ fontSize: 15 }} />} href={`tel:${selected.phone}`}
                      sx={{ color: brandColor }}>{selected.phone}</Button>
                  )}
                  {selected.email && (
                    <Button size="small" startIcon={<EmailIcon sx={{ fontSize: 15 }} />} href={`mailto:${selected.email}`}
                      sx={{ color: brandColor }}>{selected.email}</Button>
                  )}
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Service category</Typography>
                    <Typography sx={{ fontSize: "0.86rem", textTransform: "capitalize" }}>{selected.serviceCategory || "—"}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Urgency</Typography>
                    <Typography sx={{ fontSize: "0.86rem", textTransform: "capitalize" }}>{selected.urgency || "—"}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Property address</Typography>
                    <Typography sx={{ fontSize: "0.86rem" }}>{selected.address || selected.postcode || "—"}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Preferred date/time</Typography>
                    <Typography sx={{ fontSize: "0.86rem" }}>{selected.preferredDate || "—"} {selected.preferredTime || ""}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Problem description</Typography>
                    <Typography sx={{ fontSize: "0.86rem" }}>{selected.problemDescription || selected.message || "—"}</Typography>
                  </Grid>
                </Grid>

                {selected.photoUrls?.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>Photos</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {selected.photoUrls.map((url, i) => (
                        <Box key={i} component="a" href={url} target="_blank" rel="noopener noreferrer">
                          <Box component="img" src={url} alt={`Attachment ${i + 1}`} sx={{ width: 72, height: 72, objectFit: "cover", borderRadius: 1, border: "1px solid #e5e7eb" }} />
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                <FormControl size="small" fullWidth sx={fx}>
                  <InputLabel>Status</InputLabel>
                  <Select value={selected.status || "new"} label="Status" onChange={e => setStatus(selected, e.target.value)}
                    MenuProps={{ PaperProps: { sx: { bgcolor: "#fff", color: "#111", borderRadius: "8px", border: "1px solid #e5e7eb" } } }}>
                    {ENQUIRY_STATUSES.map(s => <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>{s}</MenuItem>)}
                  </Select>
                </FormControl>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>Notes</Typography>
                  <Stack spacing={0.75} sx={{ mb: 1.25 }}>
                    {(selected.notes || []).map((n, i) => (
                      <Box key={i} sx={{ p: 1, bgcolor: "#f8f9fa", borderRadius: 1 }}>
                        <Typography sx={{ fontSize: "0.8rem" }}>{n.text}</Typography>
                        <Typography sx={{ fontSize: "0.62rem", color: "rgba(0,0,0,0.4)" }}>{new Date(n.createdAt).toLocaleString("en-GB")}</Typography>
                      </Box>
                    ))}
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField size="small" fullWidth placeholder="Add a note…" value={noteDraft} onChange={e => setNoteDraft(e.target.value)} sx={fx} />
                    <Button size="small" disabled={savingNote || !noteDraft.trim()} onClick={() => addNote(selected)} sx={{ color: brandColor, flexShrink: 0 }}>
                      Add
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button color="error" startIcon={<DeleteIcon />} onClick={() => removeEnquiry(selected.id)} sx={{ mr: "auto" }}>
                Delete
              </Button>
              {selected.convertedToQuoteId ? (
                <Chip label="Already converted to a quote" size="small" sx={{ bgcolor: "rgba(22,163,74,0.1)", color: "#16a34a" }} />
              ) : (
                <Tooltip title="Opens a new quote pre-filled with this enquiry's details">
                  <Button variant="contained" startIcon={<RequestQuoteIcon />} onClick={() => convertToQuote(selected)}
                    sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" } }}>
                    Convert to quote
                  </Button>
                </Tooltip>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
