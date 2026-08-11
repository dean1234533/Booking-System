import React, { useState, useEffect } from "react";
import {
  Box, Typography, TextField, Button, Stack, IconButton,
  Grid, CircularProgress, Chip, FormControl, InputLabel, Select, MenuItem, Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  LocationOn as LocationIcon,
  Today as TodayIcon,
} from "@mui/icons-material";
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase/config";

const SANS  = "'DM Sans', sans-serif";
const SERIF = "'Playfair Display', serif";

const JOB_TYPES = [
  "Full Interior Paint",
  "Full Exterior Paint",
  "Feature Wall",
  "Ceiling",
  "Woodwork / Gloss",
  "Prep & Prime",
  "Touch-Ups",
  "Wallpaper — Hang",
  "Wallpaper — Strip",
  "Site Visit / Quote",
  "Other",
];

const STATUS = {
  pending:       { label: "Pending",     bg: "rgba(0,0,0,0.06)",          color: "rgba(0,0,0,0.5)",  bar: "rgba(0,0,0,0.18)" },
  "in-progress": { label: "In Progress", bg: "rgba(234,179,8,0.14)",       color: "#b45309",          bar: "#eab308" },
  done:          { label: "Done",        bg: "rgba(22,163,74,0.1)",        color: "#16a34a",          bar: "#16a34a" },
};

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

function dateKey(d) { return d.toISOString().split("T")[0]; }

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDate(d) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function DayPlannerTab({ barber, brandColor }) {
  const [date,    setDate]    = useState(new Date());
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({
    time: "08:00", endTime: "16:00", client: "",
    address: "", jobType: JOB_TYPES[0], notes: "",
  });

  const fx  = fieldSx(brandColor);
  const tid = barber?.uid;
  const key = dateKey(date);
  const isToday = key === dateKey(new Date());

  useEffect(() => { load(); }, [key, tid]);

  async function load() {
    if (!tid) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "barbers", tid, "dayPlan", key, "jobs"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      setJobs(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function addJob() {
    if (!form.client.trim()) return;
    setSaving(true);
    try {
      const data = { ...form, status: "pending", createdAt: serverTimestamp() };
      const ref  = await addDoc(collection(db, "barbers", tid, "dayPlan", key, "jobs"), data);
      const updated = [...jobs, { id: ref.id, ...data }];
      updated.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      setJobs(updated);
      setForm({ time: "08:00", endTime: "16:00", client: "", address: "", jobType: JOB_TYPES[0], notes: "" });
      setAdding(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function cycleStatus(job) {
    const cycle = { pending: "in-progress", "in-progress": "done", done: "pending" };
    const next  = cycle[job.status] || "pending";
    try {
      await updateDoc(doc(db, "barbers", tid, "dayPlan", key, "jobs", job.id), { status: next });
      setJobs(p => p.map(j => j.id === job.id ? { ...j, status: next } : j));
    } catch (e) { console.error(e); }
  }

  async function deleteJob(id) {
    try {
      await deleteDoc(doc(db, "barbers", tid, "dayPlan", key, "jobs", id));
      setJobs(p => p.filter(j => j.id !== id));
    } catch (e) { console.error(e); }
  }

  const done  = jobs.filter(j => j.status === "done").length;
  const total = jobs.length;

  return (
    <Box>
      {/* ── Date navigation ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton size="small" onClick={() => setDate(d => addDays(d, -1))}
            sx={{ color: "rgba(0,0,0,0.45)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "6px",
              "&:hover": { color: "#111", borderColor: "rgba(0,0,0,0.3)" } }}>
            <ArrowBackIcon sx={{ fontSize: 16 }} />
          </IconButton>

          <Box sx={{ textAlign: "center", px: 1 }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1rem", sm: "1.35rem" }, color: "#111", fontWeight: 400, lineHeight: 1.2 }}>
              {formatDate(date)}
            </Typography>
            {isToday && (
              <Typography sx={{ fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: brandColor, mt: 0.2 }}>
                Today
              </Typography>
            )}
          </Box>

          <IconButton size="small" onClick={() => setDate(d => addDays(d, 1))}
            sx={{ color: "rgba(0,0,0,0.45)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "6px",
              "&:hover": { color: "#111", borderColor: "rgba(0,0,0,0.3)" } }}>
            <ArrowForwardIcon sx={{ fontSize: 16 }} />
          </IconButton>

          {!isToday && (
            <Tooltip title="Jump to today">
              <IconButton size="small" onClick={() => setDate(new Date())}
                sx={{ color: "rgba(0,0,0,0.35)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "6px", ml: 0.5,
                  "&:hover": { color: brandColor, borderColor: `${brandColor}50` } }}>
                <TodayIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
          {total > 0 && (
            <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(0,0,0,0.45)" }}>
              {done}/{total} done
            </Typography>
          )}
          <Button
            startIcon={<AddIcon sx={{ fontSize: 15 }} />}
            onClick={() => setAdding(a => !a)}
            sx={{
              bgcolor: adding ? "transparent" : brandColor,
              color:   adding ? "rgba(0,0,0,0.5)" : "#0d0d0d",
              fontWeight: 700, fontSize: "0.74rem", borderRadius: 0, px: 2, py: 0.9,
              border: adding ? "1px solid rgba(0,0,0,0.15)" : "none",
              "&:hover": adding
                ? { color: "#111", borderColor: "rgba(0,0,0,0.3)" }
                : { bgcolor: brandColor, filter: "brightness(1.1)" },
            }}
          >
            {adding ? "Cancel" : "Add Job"}
          </Button>
        </Box>
      </Box>

      {/* ── Add form ── */}
      {adding && (
        <Box sx={{ bgcolor: "#f8f9fa", border: `1px solid ${brandColor}28`, p: 2.5, mb: 3, borderRadius: "8px" }}>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: brandColor, mb: 2 }}>
            New Job
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" label="Start" type="time" value={form.time} onChange={e => setF("time", e.target.value)} InputLabelProps={{ shrink: true }} sx={fx} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" label="End" type="time" value={form.endTime} onChange={e => setF("endTime", e.target.value)} InputLabelProps={{ shrink: true }} sx={fx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" sx={fx}>
                <InputLabel>Job Type</InputLabel>
                <Select value={form.jobType} label="Job Type" onChange={e => setF("jobType", e.target.value)}
                  MenuProps={{ PaperProps: { sx: { bgcolor: "#fff", color: "#111", borderRadius: "8px", border: "1px solid #e5e7eb", maxHeight: 280 } } }}>
                  {JOB_TYPES.map(t => (
                    <MenuItem key={t} value={t} sx={{ fontSize: "0.82rem", "&:hover": { bgcolor: `${brandColor}20` } }}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Client Name *" value={form.client} onChange={e => setF("client", e.target.value)} sx={fx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Address" value={form.address} onChange={e => setF("address", e.target.value)} sx={fx} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Notes" value={form.notes} onChange={e => setF("notes", e.target.value)} sx={fx} />
            </Grid>
          </Grid>
          <Button onClick={addJob} disabled={saving || !form.client.trim()}
            sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.74rem", borderRadius: 0, px: 3, py: 1,
              "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" },
              "&:disabled": { bgcolor: brandColor, opacity: 0.5 },
            }}>
            {saving ? <CircularProgress size={15} sx={{ color: "#0d0d0d" }} /> : "Add to Day"}
          </Button>
        </Box>
      )}

      {/* ── Jobs ── */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 7 }}>
          <CircularProgress sx={{ color: brandColor }} size={34} thickness={2} />
        </Box>
      ) : jobs.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 9, color: "rgba(0,0,0,0.3)" }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.25rem" }}>No jobs planned</Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", mt: 0.75 }}>
            Add jobs above to build your day schedule
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {jobs.map(job => {
            const sc = STATUS[job.status] || STATUS.pending;
            return (
              <Box key={job.id} sx={{
                display: "flex", bgcolor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                overflow: "hidden",
                opacity: job.status === "done" ? 0.65 : 1,
                transition: "opacity .2s",
              }}>
                {/* Status bar */}
                <Box sx={{ width: 4, bgcolor: sc.bar, flexShrink: 0 }} />

                {/* Time block */}
                <Box sx={{
                  px: 2, py: 2.5, borderRight: "1px solid #f3f4f6",
                  minWidth: 80, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}>
                  <Typography sx={{ fontFamily: SANS, fontWeight: 800, fontSize: "0.9rem", color: "#111" }}>{job.time}</Typography>
                  {job.endTime && (
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.62rem", color: "rgba(0,0,0,0.35)", mt: 0.25 }}>→ {job.endTime}</Typography>
                  )}
                </Box>

                {/* Job info */}
                <Box sx={{ flex: 1, px: 2, py: 2, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
                    <Typography sx={{ fontFamily: SANS, fontWeight: 700, color: "#111", fontSize: "0.88rem" }}>{job.client}</Typography>
                    <Chip label={job.jobType} size="small" sx={{ bgcolor: `${brandColor}15`, color: brandColor, fontSize: "0.6rem", height: 18, borderRadius: 0 }} />
                  </Box>
                  {job.address && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                      <LocationIcon sx={{ fontSize: 12, color: "rgba(0,0,0,0.35)" }} />
                      <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(0,0,0,0.5)" }}>{job.address}</Typography>
                    </Box>
                  )}
                  {job.notes && (
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.7rem", color: "rgba(0,0,0,0.45)", fontStyle: "italic" }}>{job.notes}</Typography>
                  )}
                </Box>

                {/* Status chip + delete */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.5, flexShrink: 0 }}>
                  <Chip
                    label={sc.label}
                    size="small"
                    onClick={() => cycleStatus(job)}
                    sx={{
                      bgcolor: sc.bg, color: sc.color, fontSize: "0.62rem", height: 22, borderRadius: 0,
                      cursor: "pointer", letterSpacing: "0.04em",
                      "&:hover": { filter: "brightness(0.95)" },
                    }}
                  />
                  <IconButton size="small" onClick={() => deleteJob(job.id)}
                    sx={{ color: "rgba(0,0,0,0.3)", "&:hover": { color: "#ff6b6b" } }}>
                    <DeleteIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* ── Day summary ── */}
      {total > 0 && (
        <Box sx={{ mt: 3, p: 2.5, bgcolor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", display: "flex", gap: 4 }}>
          {[
            { label: "Total Jobs",  val: total },
            { label: "Completed",   val: done },
            { label: "Remaining",   val: total - done },
          ].map(s => (
            <Box key={s.label}>
              <Typography sx={{ fontFamily: SERIF, fontSize: "1.6rem", color: "#111", lineHeight: 1 }}>{s.val}</Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", mt: 0.3 }}>
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
