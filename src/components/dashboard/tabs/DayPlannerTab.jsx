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
  pending:       { label: "Pending",     bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)", bar: "rgba(255,255,255,0.18)" },
  "in-progress": { label: "In Progress", bg: "rgba(234,179,8,0.14)",   color: "#eab308",                bar: "#eab308" },
  done:          { label: "Done",        bg: "rgba(74,222,128,0.12)",  color: "#4ade80",                bar: "#4ade80" },
};

function fieldSx(brand) {
  return {
    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: brand },
    "& .MuiOutlinedInput-root": {
      color: "#fff", borderRadius: 0,
      "& fieldset":             { borderColor: "rgba(255,255,255,0.12)" },
      "&:hover fieldset":       { borderColor: "rgba(255,255,255,0.28)" },
      "&.Mui-focused fieldset": { borderColor: brand },
    },
    "& .MuiSelect-icon": { color: "rgba(255,255,255,0.35)" },
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
            sx={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 0,
              "&:hover": { color: "#fff", borderColor: "rgba(255,255,255,0.3)" } }}>
            <ArrowBackIcon sx={{ fontSize: 16 }} />
          </IconButton>

          <Box sx={{ textAlign: "center", px: 1 }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1rem", sm: "1.35rem" }, color: "#fff", fontWeight: 400, lineHeight: 1.2 }}>
              {formatDate(date)}
            </Typography>
            {isToday && (
              <Typography sx={{ fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: brandColor, mt: 0.2 }}>
                Today
              </Typography>
            )}
          </Box>

          <IconButton size="small" onClick={() => setDate(d => addDays(d, 1))}
            sx={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 0,
              "&:hover": { color: "#fff", borderColor: "rgba(255,255,255,0.3)" } }}>
            <ArrowForwardIcon sx={{ fontSize: 16 }} />
          </IconButton>

          {!isToday && (
            <Tooltip title="Jump to today">
              <IconButton size="small" onClick={() => setDate(new Date())}
                sx={{ color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 0, ml: 0.5,
                  "&:hover": { color: brandColor, borderColor: `${brandColor}50` } }}>
                <TodayIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
          {total > 0 && (
            <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(255,255,255,0.32)" }}>
              {done}/{total} done
            </Typography>
          )}
          <Button
            startIcon={<AddIcon sx={{ fontSize: 15 }} />}
            onClick={() => setAdding(a => !a)}
            sx={{
              bgcolor: adding ? "transparent" : brandColor,
              color:   adding ? "rgba(255,255,255,0.5)" : "#0d0d0d",
              fontWeight: 700, fontSize: "0.74rem", borderRadius: 0, px: 2, py: 0.9,
              border: adding ? "1px solid rgba(255,255,255,0.12)" : "none",
              "&:hover": adding
                ? { color: "#fff", borderColor: "rgba(255,255,255,0.28)" }
                : { bgcolor: brandColor, filter: "brightness(1.1)" },
            }}
          >
            {adding ? "Cancel" : "Add Job"}
          </Button>
        </Box>
      </Box>

      {/* ── Add form ── */}
      {adding && (
        <Box sx={{ bgcolor: "#111", border: `1px solid ${brandColor}28`, p: 2.5, mb: 3 }}>
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
                  MenuProps={{ PaperProps: { sx: { bgcolor: "#1a1a1a", color: "#fff", borderRadius: 0, maxHeight: 280 } } }}>
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
        <Box sx={{ textAlign: "center", py: 9, color: "rgba(255,255,255,0.18)" }}>
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
                display: "flex", bgcolor: "#111",
                border: "1px solid rgba(255,255,255,0.07)",
                overflow: "hidden",
                opacity: job.status === "done" ? 0.6 : 1,
                transition: "opacity .2s",
              }}>
                {/* Status bar */}
                <Box sx={{ width: 4, bgcolor: sc.bar, flexShrink: 0 }} />

                {/* Time block */}
                <Box sx={{
                  px: 2, py: 2.5, borderRight: "1px solid rgba(255,255,255,0.06)",
                  minWidth: 80, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}>
                  <Typography sx={{ fontFamily: SANS, fontWeight: 800, fontSize: "0.9rem", color: "#fff" }}>{job.time}</Typography>
                  {job.endTime && (
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.62rem", color: "rgba(255,255,255,0.28)", mt: 0.25 }}>→ {job.endTime}</Typography>
                  )}
                </Box>

                {/* Job info */}
                <Box sx={{ flex: 1, px: 2, py: 2, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
                    <Typography sx={{ fontFamily: SANS, fontWeight: 700, color: "#fff", fontSize: "0.88rem" }}>{job.client}</Typography>
                    <Chip label={job.jobType} size="small" sx={{ bgcolor: `${brandColor}15`, color: brandColor, fontSize: "0.6rem", height: 18, borderRadius: 0 }} />
                  </Box>
                  {job.address && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                      <LocationIcon sx={{ fontSize: 12, color: "rgba(255,255,255,0.28)" }} />
                      <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(255,255,255,0.38)" }}>{job.address}</Typography>
                    </Box>
                  )}
                  {job.notes && (
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.7rem", color: "rgba(255,255,255,0.32)", fontStyle: "italic" }}>{job.notes}</Typography>
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
                      "&:hover": { filter: "brightness(1.2)" },
                    }}
                  />
                  <IconButton size="small" onClick={() => deleteJob(job.id)}
                    sx={{ color: "rgba(255,255,255,0.2)", "&:hover": { color: "#ff6b6b" } }}>
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
        <Box sx={{ mt: 3, p: 2.5, bgcolor: "#111", border: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 4 }}>
          {[
            { label: "Total Jobs",  val: total },
            { label: "Completed",   val: done },
            { label: "Remaining",   val: total - done },
          ].map(s => (
            <Box key={s.label}>
              <Typography sx={{ fontFamily: SERIF, fontSize: "1.6rem", color: "#fff", lineHeight: 1 }}>{s.val}</Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", mt: 0.3 }}>
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
