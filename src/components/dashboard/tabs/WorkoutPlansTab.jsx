import React, { useState, useEffect } from "react";
import {
  Box, Typography, TextField, Button, IconButton, Paper, Grid,
  Stack, Chip, Tooltip, CircularProgress, Dialog, DialogContent,
} from "@mui/material";
import AddIcon            from "@mui/icons-material/Add";
import DeleteIcon         from "@mui/icons-material/Delete";
import PlayCircleIcon     from "@mui/icons-material/PlayCircle";
import ShareIcon          from "@mui/icons-material/Share";
import ArrowBackIcon      from "@mui/icons-material/ArrowBack";
import ContentCopyIcon    from "@mui/icons-material/ContentCopy";
import SaveIcon           from "@mui/icons-material/Save";
import EditIcon           from "@mui/icons-material/Edit";
import FitnessCenterIcon  from "@mui/icons-material/FitnessCenter";
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

const newExercise = () => ({
  id: `${Date.now()}-${Math.random()}`,
  name: "", youtubeUrl: "", sets: "", reps: "", time: "", notes: "",
});

// ── Shared dark field style (generated per brandColor) ───────────────────────
function fieldSx(brand) {
  return {
    "& .MuiInputLabel-root":            { color: "rgba(255,255,255,0.3)", fontSize: "0.82rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: brand },
    "& .MuiOutlinedInput-root": {
      color: "#fff", borderRadius: 0,
      "& fieldset":               { borderColor: "rgba(255,255,255,0.1)" },
      "&:hover fieldset":         { borderColor: "rgba(255,255,255,0.25)" },
      "&.Mui-focused fieldset":   { borderColor: brand },
    },
    "& textarea, & input": { "&::placeholder": { color: "rgba(255,255,255,0.18)", opacity: 1 } },
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WorkoutPlansTab({ barber, brandColor }) {
  const [plans,         setPlans]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [view,          setView]          = useState("list"); // "list" | "builder"
  const [editingPlan,   setEditingPlan]   = useState(null);
  const [planName,      setPlanName]      = useState("");
  const [exercises,     setExercises]     = useState([newExercise()]);
  const [saving,        setSaving]        = useState(false);
  const [videoUrl,      setVideoUrl]      = useState(null);
  const [copiedId,      setCopiedId]      = useState(null);

  const trainerId = barber?.uid || barber?.id;
  const fs = fieldSx(brandColor);

  useEffect(() => { loadPlans(); }, [trainerId]);

  async function loadPlans() {
    if (!trainerId) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "barbers", trainerId, "workoutPlans"));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPlans(list);
    } catch (e) { console.error(e); }
    finally     { setLoading(false); }
  }

  function openBuilder(plan = null) {
    setEditingPlan(plan);
    setPlanName(plan?.name || "");
    setExercises(
      plan?.exercises?.length
        ? plan.exercises.map(e => ({ ...e, id: e.id || newExercise().id }))
        : [newExercise()]
    );
    setView("builder");
  }

  function updateEx(id, field, val) {
    setExercises(prev => prev.map(e => e.id === id ? { ...e, [field]: val } : e));
  }

  async function savePlan() {
    if (!planName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name:      planName.trim(),
        exercises: exercises.map(({ id, ...rest }) => rest),
        updatedAt: serverTimestamp(),
      };
      if (editingPlan) {
        await updateDoc(doc(db, "barbers", trainerId, "workoutPlans", editingPlan.id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "barbers", trainerId, "workoutPlans"), payload);
      }
      await loadPlans();
      setView("list");
    } catch (e) { console.error(e); }
    finally     { setSaving(false); }
  }

  async function deletePlan(planId) {
    if (!window.confirm("Delete this workout plan? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "barbers", trainerId, "workoutPlans", planId));
      setPlans(prev => prev.filter(p => p.id !== planId));
    } catch (e) { console.error(e); }
  }

  function copyShareLink(planId) {
    const url = `${window.location.origin}/workout/${trainerId}/${planId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(planId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  // ── Plan list ─────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4 }}>
          <Box>
            <Typography sx={{ color: "#fff", fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 400, lineHeight: 1.2 }}>
              Workout Plans
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", mt: 0.5 }}>
              Build programmes, add YouTube exercises, and share directly with clients.
            </Typography>
          </Box>
          <Button
            startIcon={<AddIcon />}
            onClick={() => openBuilder()}
            sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.76rem", letterSpacing: "0.08em", px: 2.5, py: 1.2, borderRadius: 0, whiteSpace: "nowrap", flexShrink: 0, "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" }, boxShadow: "none" }}
          >
            New Plan
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
            <CircularProgress sx={{ color: brandColor }} thickness={2} />
          </Box>
        ) : plans.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 10, border: "1px dashed rgba(255,255,255,0.08)" }}>
            <FitnessCenterIcon sx={{ fontSize: 44, color: "rgba(255,255,255,0.1)", mb: 2 }} />
            <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.88rem" }}>
              No plans yet. Create your first workout programme.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {plans.map(plan => {
              const exCount = plan.exercises?.length || 0;
              const date = plan.createdAt?.toDate?.()?.toLocaleDateString("en-GB", {
                day: "numeric", month: "short", year: "numeric",
              }) || "";
              return (
                <Grid item xs={12} sm={6} md={4} key={plan.id}>
                  <Paper sx={{
                    bgcolor: "#1a1a1a", borderRadius: 0,
                    border: "1px solid rgba(255,255,255,0.07)",
                    overflow: "hidden", height: "100%",
                    display: "flex", flexDirection: "column",
                    transition: "border-color .2s",
                    "&:hover": { borderColor: `${brandColor}40` },
                  }}>
                    <Box sx={{ height: 3, bgcolor: brandColor, flexShrink: 0 }} />
                    <Box sx={{ p: 2.5, flex: 1 }}>
                      <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "0.98rem", lineHeight: 1.35, mb: 1 }}>
                        {plan.name}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
                        <Chip
                          label={`${exCount} exercise${exCount !== 1 ? "s" : ""}`}
                          size="small"
                          sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", fontSize: "0.67rem", height: 20, borderRadius: 0 }}
                        />
                        {date && (
                          <Typography sx={{ fontSize: "0.67rem", color: "rgba(255,255,255,0.22)" }}>
                            {date}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                    <Box sx={{ px: 2, pb: 2, display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<EditIcon sx={{ fontSize: "14px !important" }} />}
                        onClick={() => openBuilder(plan)}
                        sx={{ flex: 1, color: brandColor, border: `1px solid ${brandColor}30`, borderRadius: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", py: 0.9, "&:hover": { bgcolor: `${brandColor}12`, borderColor: brandColor } }}
                      >
                        Open
                      </Button>
                      <Tooltip title={copiedId === plan.id ? "Link copied!" : "Copy share link"} placement="top">
                        <IconButton
                          size="small"
                          onClick={() => copyShareLink(plan.id)}
                          sx={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 0, color: copiedId === plan.id ? brandColor : "rgba(255,255,255,0.35)", width: 34, "&:hover": { borderColor: brandColor, color: brandColor } }}
                        >
                          {copiedId === plan.id
                            ? <ContentCopyIcon sx={{ fontSize: 15 }} />
                            : <ShareIcon sx={{ fontSize: 15 }} />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete plan" placement="top">
                        <IconButton
                          size="small"
                          onClick={() => deletePlan(plan.id)}
                          sx={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 0, color: "rgba(255,255,255,0.35)", width: 34, "&:hover": { borderColor: "#ff6b6b", color: "#ff6b6b" } }}
                        >
                          <DeleteIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    );
  }

  // ── Builder ───────────────────────────────────────────────────────────────
  const activeVideoId = videoUrl ? extractYouTubeId(videoUrl) : null;

  return (
    <Box>
      {/* Builder header row */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <IconButton
          onClick={() => setView("list")}
          sx={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 0, color: "rgba(255,255,255,0.45)", "&:hover": { color: "#fff", borderColor: "rgba(255,255,255,0.3)" } }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <TextField
          fullWidth
          placeholder="Plan name, e.g. Upper Body Strength Day"
          value={planName}
          onChange={e => setPlanName(e.target.value)}
          variant="standard"
          InputProps={{ disableUnderline: false }}
          sx={{
            "& .MuiInput-root input": { color: "#fff", fontSize: "1.25rem", fontWeight: 700, pb: 0.5 },
            "& .MuiInput-root input::placeholder": { color: "rgba(255,255,255,0.2)", opacity: 1 },
            "& .MuiInput-underline:before": { borderBottomColor: "rgba(255,255,255,0.1)" },
            "& .MuiInput-underline:after":  { borderBottomColor: brandColor },
            "& .MuiInput-underline:hover:not(.Mui-disabled):before": { borderBottomColor: "rgba(255,255,255,0.25)" },
          }}
        />
        <Button
          startIcon={saving ? <CircularProgress size={13} sx={{ color: "#0d0d0d" }} /> : <SaveIcon sx={{ fontSize: 17 }} />}
          onClick={savePlan}
          disabled={saving || !planName.trim()}
          sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.76rem", letterSpacing: "0.06em", px: 2.5, py: 1.2, borderRadius: 0, flexShrink: 0, "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" }, "&:disabled": { bgcolor: brandColor, opacity: 0.5 }, boxShadow: "none" }}
        >
          {saving ? "Saving…" : editingPlan ? "Update" : "Save"}
        </Button>
      </Box>

      {/* Exercise cards */}
      <Stack spacing={2}>
        {exercises.map((ex, idx) => {
          const ytId = extractYouTubeId(ex.youtubeUrl);
          return (
            <Paper key={ex.id} sx={{ bgcolor: "#1a1a1a", borderRadius: 0, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
              {/* Card header */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.5, borderBottom: "1px solid rgba(255,255,255,0.05)", bgcolor: "rgba(0,0,0,0.2)" }}>
                <Typography sx={{ color: brandColor, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", minWidth: 26, userSelect: "none" }}>
                  {String(idx + 1).padStart(2, "0")}
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Exercise name"
                  value={ex.name}
                  onChange={e => updateEx(ex.id, "name", e.target.value)}
                  variant="standard"
                  InputProps={{ disableUnderline: false }}
                  sx={{
                    "& .MuiInput-root input": { color: "#fff", fontWeight: 600, fontSize: "0.92rem" },
                    "& .MuiInput-root input::placeholder": { color: "rgba(255,255,255,0.2)", opacity: 1 },
                    "& .MuiInput-underline:before": { borderBottomColor: "transparent" },
                    "& .MuiInput-underline:after":  { borderBottomColor: brandColor },
                    "& .MuiInput-underline:hover:not(.Mui-disabled):before": { borderBottomColor: "rgba(255,255,255,0.1)" },
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => setExercises(prev => prev.filter(e => e.id !== ex.id))}
                  sx={{ color: "rgba(255,255,255,0.2)", flexShrink: 0, "&:hover": { color: "#ff6b6b" } }}
                >
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>

              {/* Fields */}
              <Box sx={{ p: 2.5 }}>
                {/* YouTube URL + Play */}
                <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "flex-start" }}>
                  <TextField
                    fullWidth
                    label="YouTube URL"
                    placeholder="https://youtube.com/watch?v=..."
                    value={ex.youtubeUrl}
                    onChange={e => updateEx(ex.id, "youtubeUrl", e.target.value)}
                    size="small"
                    sx={fs}
                  />
                  <Tooltip title={ytId ? "Watch video" : "Paste a YouTube URL first"} placement="top">
                    <span>
                      <IconButton
                        onClick={() => ytId && setVideoUrl(ex.youtubeUrl)}
                        disabled={!ytId}
                        sx={{
                          bgcolor: ytId ? brandColor : "rgba(255,255,255,0.05)",
                          color:   ytId ? "#0d0d0d" : "rgba(255,255,255,0.2)",
                          borderRadius: 0, p: 1, mt: 0.25, flexShrink: 0,
                          "&:hover":    { filter: ytId ? "brightness(1.1)" : undefined },
                          "&:disabled": { opacity: 0.4 },
                        }}
                      >
                        <PlayCircleIcon sx={{ fontSize: 22 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>

                {/* Sets / Reps / Time */}
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <TextField fullWidth label="Sets" type="number" value={ex.sets} onChange={e => updateEx(ex.id, "sets", e.target.value)} size="small" sx={fs} inputProps={{ min: 0 }} />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField fullWidth label="Reps" type="number" value={ex.reps} onChange={e => updateEx(ex.id, "reps", e.target.value)} size="small" sx={fs} inputProps={{ min: 0 }} />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField fullWidth label="Time (e.g. 45s)" value={ex.time} onChange={e => updateEx(ex.id, "time", e.target.value)} size="small" sx={fs} />
                  </Grid>
                </Grid>

                {/* Notes */}
                <TextField
                  fullWidth
                  label="Notes"
                  placeholder="Coaching cues, rest periods, modifications..."
                  value={ex.notes}
                  onChange={e => updateEx(ex.id, "notes", e.target.value)}
                  multiline
                  minRows={2}
                  size="small"
                  sx={fs}
                />
              </Box>
            </Paper>
          );
        })}
      </Stack>

      {/* Add exercise button */}
      <Button
        fullWidth
        startIcon={<AddIcon />}
        onClick={() => setExercises(prev => [...prev, newExercise()])}
        sx={{ mt: 2, py: 1.8, border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 0, color: "rgba(255,255,255,0.3)", fontWeight: 700, fontSize: "0.76rem", letterSpacing: "0.08em", "&:hover": { borderColor: brandColor, color: brandColor, bgcolor: `${brandColor}08` } }}
      >
        Add Exercise
      </Button>

      {/* YouTube player dialog */}
      <Dialog
        open={Boolean(activeVideoId)}
        onClose={() => setVideoUrl(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0d0d0d", borderRadius: 0, overflow: "hidden", m: { xs: 1, sm: 3 } } }}
      >
        <DialogContent sx={{ p: 0, lineHeight: 0 }}>
          {activeVideoId && (
            <Box
              component="iframe"
              src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              sx={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block", minHeight: { xs: 220, sm: 340 } }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
