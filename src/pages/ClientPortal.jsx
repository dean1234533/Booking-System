import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Container, Typography, CircularProgress, Stack,
  Grid, Paper, Button, TextField, MenuItem, Divider,
  Chip, IconButton, Alert,
} from "@mui/material";
import FitnessCenterIcon    from "@mui/icons-material/FitnessCenter";
import RestaurantMenuIcon   from "@mui/icons-material/RestaurantMenu";
import TrendingUpIcon       from "@mui/icons-material/TrendingUp";
import AssignmentIcon       from "@mui/icons-material/Assignment";
import PersonIcon           from "@mui/icons-material/Person";
import AddIcon              from "@mui/icons-material/Add";
import CheckCircleIcon      from "@mui/icons-material/CheckCircle";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import CloseIcon            from "@mui/icons-material/Close";
import { Dialog, DialogContent } from "@mui/material";
import {
  doc, getDoc, getDocs, collection,
  addDoc, serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { getNutritionPlan } from "../firebase/firestore";
import PWAInstallBanner from "../components/dashboard/PWAInstallBanner";
import OfflineIndicator from "../components/dashboard/OfflineIndicator";

const SERIF = "'Playfair Display', serif";
const SANS  = "'DM Sans', sans-serif";

const METRICS = [
  { id: "weight",      label: "Weight",         unit: "kg"  },
  { id: "bodyfat",     label: "Body Fat",        unit: "%"   },
  { id: "chest",       label: "Chest",           unit: "cm"  },
  { id: "waist",       label: "Waist",           unit: "cm"  },
  { id: "hips",        label: "Hips",            unit: "cm"  },
  { id: "steps",       label: "Daily Steps",     unit: "steps" },
  { id: "sleep",       label: "Sleep",           unit: "hrs" },
  { id: "energy",      label: "Energy Level",    unit: "/10" },
];

// ── YouTube helper ────────────────────────────────────────────────────────────
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

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHead({ icon: Icon, title, brandColor }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
      <Box sx={{
        width: 36, height: 36, borderRadius: "8px",
        bgcolor: `${brandColor}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon sx={{ fontSize: 18, color: brandColor }} />
      </Box>
      <Typography sx={{ fontFamily: SERIF, fontSize: "1.3rem", fontWeight: 600, color: "#fff" }}>
        {title}
      </Typography>
    </Box>
  );
}

// ── Workout card ──────────────────────────────────────────────────────────────
function WorkoutCard({ plan, brandColor }) {
  const [videoUrl, setVideoUrl] = useState(null);

  return (
    <>
      <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", p: 3, mb: 2 }}>
        <Typography sx={{ fontFamily: SERIF, fontSize: "1.1rem", color: "#fff", mb: 0.5 }}>
          {plan.name}
        </Typography>
        {plan.description && (
          <Typography sx={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", mb: 2 }}>
            {plan.description}
          </Typography>
        )}

        {(plan.exercises || []).map((ex, i) => {
          const ytId = extractYouTubeId(ex.videoUrl);
          return (
            <Box key={i} sx={{
              display: "flex", alignItems: "flex-start", gap: 2,
              py: 1.5, borderTop: i === 0 ? "none" : "1px solid #222",
            }}>
              {/* Thumbnail / play button */}
              {ytId ? (
                <Box
                  onClick={() => setVideoUrl(ex.videoUrl)}
                  sx={{
                    flexShrink: 0, width: 72, height: 48, borderRadius: "6px",
                    bgcolor: "#111", overflow: "hidden", cursor: "pointer", position: "relative",
                    "&:hover .play": { opacity: 1 },
                  }}
                >
                  <Box component="img"
                    src={`https://img.youtube.com/vi/${ytId}/default.jpg`}
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <Box className="play" sx={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center",
                    justifyContent: "center", bgcolor: "rgba(0,0,0,0.5)", opacity: 0, transition: ".2s",
                  }}>
                    <PlayCircleOutlineIcon sx={{ color: "#fff", fontSize: 22 }} />
                  </Box>
                </Box>
              ) : (
                <Box sx={{
                  flexShrink: 0, width: 72, height: 48, borderRadius: "6px",
                  bgcolor: "#222", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <FitnessCenterIcon sx={{ fontSize: 20, color: "#555" }} />
                </Box>
              )}

              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff", mb: 0.3 }}>
                  {ex.name}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {ex.sets  && <Chip label={`${ex.sets} sets`}  size="small" sx={chipSx(brandColor)} />}
                  {ex.reps  && <Chip label={`${ex.reps} reps`}  size="small" sx={chipSx(brandColor)} />}
                  {ex.duration && <Chip label={ex.duration}     size="small" sx={chipSx(brandColor)} />}
                </Stack>
                {ex.notes && (
                  <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", mt: 0.5 }}>
                    {ex.notes}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Paper>

      {/* Video dialog */}
      <Dialog open={Boolean(videoUrl)} onClose={() => setVideoUrl(null)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 0, bgcolor: "#000", position: "relative" }}>
          <IconButton onClick={() => setVideoUrl(null)} sx={{ position: "absolute", top: 8, right: 8, color: "#fff", zIndex: 1 }}>
            <CloseIcon />
          </IconButton>
          {videoUrl && (
            <Box component="iframe"
              src={`https://www.youtube.com/embed/${extractYouTubeId(videoUrl)}?autoplay=1`}
              allow="autoplay; encrypted-media"
              allowFullScreen
              sx={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block" }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const chipSx = (brand) => ({
  bgcolor: `${brand}18`, color: brand,
  fontSize: "0.7rem", fontWeight: 600, height: 20,
  border: `1px solid ${brand}33`,
});

// ── Main portal ───────────────────────────────────────────────────────────────
export default function ClientPortal() {
  const { trainerId, clientId } = useParams();

  const [loading,       setLoading]       = useState(true);
  const [trainer,       setTrainer]       = useState(null);
  const [client,        setClient]        = useState(null);
  const [workoutPlans,  setWorkoutPlans]  = useState([]);
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [progressLog,   setProgressLog]   = useState([]);
  const [section,       setSection]       = useState("workouts");

  // Progress form
  const [logMetric, setLogMetric] = useState("weight");
  const [logValue,  setLogValue]  = useState("");
  const [logNotes,  setLogNotes]  = useState("");
  const [logDate,   setLogDate]   = useState(() => new Date().toISOString().split("T")[0]);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  const brandColor = trainer?.brandColor || "#C9A84C";

  useEffect(() => {
    if (!trainerId || !clientId) return;
    load();
  }, [trainerId, clientId]);

  async function load() {
    setLoading(true);
    try {
      const [trainerSnap, clientSnap] = await Promise.all([
        getDoc(doc(db, "barbers", trainerId)),
        getDoc(doc(db, "barbers", trainerId, "clients", clientId)),
      ]);
      const trainerData = trainerSnap.exists() ? trainerSnap.data() : null;
      const clientData  = clientSnap.exists()  ? { id: clientSnap.id, ...clientSnap.data() } : null;
      setTrainer(trainerData);
      setClient(clientData);

      // Load workout plans (all plans, or those matching client name)
      const plansSnap = await getDocs(collection(db, "barbers", trainerId, "workoutPlans"));
      const allPlans  = plansSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const clientName = (clientData?.customerName || "").toLowerCase();
      const matched = allPlans.filter(p =>
        !p.name || clientName.length < 2 ||
        (p.name || "").toLowerCase().includes(clientName) ||
        (p.assignedTo || []).includes(clientId)
      );
      setWorkoutPlans(matched.length > 0 ? matched : allPlans.slice(0, 1));

      // Nutrition plan
      const nutri = await getNutritionPlan(trainerId, clientId);
      setNutritionPlan(nutri);

      // Progress log
      const progSnap = await getDocs(
        query(
          collection(db, "barbers", trainerId, "clients", clientId, "progressEntries"),
          orderBy("createdAt", "desc")
        )
      );
      setProgressLog(progSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("ClientPortal load error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogProgress(e) {
    e.preventDefault();
    if (!logValue) return;
    setSaving(true);
    try {
      const entry = {
        metric: logMetric,
        value:  parseFloat(logValue),
        unit:   METRICS.find(m => m.id === logMetric)?.unit || "",
        date:   logDate,
        notes:  logNotes,
        loggedBy: "client",
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(
        collection(db, "barbers", trainerId, "clients", clientId, "progressEntries"),
        entry
      );
      setProgressLog(prev => [{ id: ref.id, ...entry, createdAt: new Date().toISOString() }, ...prev]);
      setLogValue(""); setLogNotes("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error("Progress log error:", e);
    } finally {
      setSaving(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ color: "#C9A84C" }} />
      </Box>
    );
  }

  if (!trainer || !client) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography sx={{ color: "rgba(255,255,255,0.4)", fontFamily: SANS }}>
          Portal not found. Check your link.
        </Typography>
      </Box>
    );
  }

  const NAV = [
    { id: "workouts",   label: "Workouts",   icon: FitnessCenterIcon },
    { id: "nutrition",  label: "Nutrition",  icon: RestaurantMenuIcon },
    { id: "progress",   label: "Progress",   icon: TrendingUpIcon },
    { id: "forms",      label: "Forms",      icon: AssignmentIcon },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0d0d0d", fontFamily: SANS }}>

      {/* ── Header ── */}
      <Box sx={{
        borderBottom: `1px solid rgba(255,255,255,0.07)`,
        bgcolor: "#111",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <Container maxWidth="md">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {trainer.logoUrl && (
                <Box component="img" src={trainer.logoUrl}
                  sx={{ height: 36, width: "auto", borderRadius: "6px", objectFit: "contain" }} />
              )}
              <Box>
                <Typography sx={{ fontFamily: SERIF, fontSize: "0.95rem", color: "#fff", lineHeight: 1.1 }}>
                  {trainer.businessName || trainer.name}
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>
                  Personal Training Portal
                </Typography>
              </Box>
            </Stack>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{
                width: 30, height: 30, borderRadius: "50%",
                bgcolor: `${brandColor}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <PersonIcon sx={{ fontSize: 16, color: brandColor }} />
              </Box>
              <Typography sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", display: { xs: "none", sm: "block" } }}>
                {client.customerName}
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <OfflineIndicator />
      <PWAInstallBanner brandColor={brandColor} />

      {/* ── Welcome banner ── */}
      <Box sx={{ bgcolor: "#111", borderBottom: "1px solid rgba(255,255,255,0.05)", py: 3 }}>
        <Container maxWidth="md">
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.5rem", sm: "1.9rem" }, color: "#fff" }}>
            Hey, <em style={{ fontStyle: "italic", color: brandColor }}>{client.customerName?.split(" ")[0]}</em> 👋
          </Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", mt: 0.5 }}>
            Your personal training hub — workouts, nutrition, and progress all in one place.
          </Typography>
        </Container>
      </Box>

      {/* ── Section nav ── */}
      <Box sx={{ bgcolor: "#111", borderBottom: "1px solid rgba(255,255,255,0.07)", position: "sticky", top: 57, zIndex: 99 }}>
        <Container maxWidth="md">
          <Stack direction="row" spacing={0}>
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = section === id;
              return (
                <Button
                  key={id}
                  onClick={() => setSection(id)}
                  disableRipple
                  startIcon={<Icon sx={{ fontSize: "15px !important" }} />}
                  sx={{
                    color:        active ? brandColor : "rgba(255,255,255,0.4)",
                    borderBottom: active ? `2px solid ${brandColor}` : "2px solid transparent",
                    borderRadius: 0,
                    px: { xs: 1.5, sm: 2 },
                    py: 1.4,
                    fontFamily: SANS,
                    fontWeight: active ? 700 : 400,
                    fontSize: "0.78rem",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    "& .MuiButton-startIcon": { display: { xs: "none", sm: "flex" } },
                    "&:hover": { bgcolor: "transparent", color: "#fff" },
                  }}
                >
                  {label}
                </Button>
              );
            })}
          </Stack>
        </Container>
      </Box>

      {/* ── Content ── */}
      <Container maxWidth="md" sx={{ py: 4 }}>

        {/* ── Workouts ── */}
        {section === "workouts" && (
          <Box>
            <SectionHead icon={FitnessCenterIcon} title="Your Workout Plans" brandColor={brandColor} />
            {workoutPlans.length === 0 ? (
              <EmptyState message="No workout plans assigned yet. Check back soon." brandColor={brandColor} />
            ) : (
              workoutPlans.map(plan => <WorkoutCard key={plan.id} plan={plan} brandColor={brandColor} />)
            )}
          </Box>
        )}

        {/* ── Nutrition ── */}
        {section === "nutrition" && (
          <Box>
            <SectionHead icon={RestaurantMenuIcon} title="Your Nutrition Plan" brandColor={brandColor} />
            {!nutritionPlan ? (
              <EmptyState message="No nutrition plan assigned yet. Your trainer will add one soon." brandColor={brandColor} />
            ) : (
              <NutritionDisplay plan={nutritionPlan} brandColor={brandColor} />
            )}
          </Box>
        )}

        {/* ── Progress ── */}
        {section === "progress" && (
          <Box>
            <SectionHead icon={TrendingUpIcon} title="Log Your Progress" brandColor={brandColor} />

            {/* Log form */}
            <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", p: 3, mb: 3 }}>
              <Typography sx={{ fontFamily: SERIF, fontSize: "1rem", color: "#fff", mb: 2 }}>
                Add a new entry
              </Typography>
              <Box component="form" onSubmit={handleLogProgress}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select fullWidth label="Metric" value={logMetric}
                      onChange={e => setLogMetric(e.target.value)}
                      size="small" sx={inputSx(brandColor)}
                    >
                      {METRICS.map(m => (
                        <MenuItem key={m.id} value={m.id}>{m.label} ({m.unit})</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth label={`Value (${METRICS.find(m => m.id === logMetric)?.unit})`}
                      type="number" value={logValue}
                      onChange={e => setLogValue(e.target.value)}
                      size="small" sx={inputSx(brandColor)}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth label="Date" type="date"
                      value={logDate} onChange={e => setLogDate(e.target.value)}
                      size="small" InputLabelProps={{ shrink: true }} sx={inputSx(brandColor)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2} sx={{ display: "flex", alignItems: "flex-end" }}>
                    <Button
                      type="submit" fullWidth variant="contained" disabled={saving || !logValue}
                      startIcon={saved ? <CheckCircleIcon /> : <AddIcon />}
                      sx={{
                        height: 40, bgcolor: brandColor, color: "#000",
                        fontWeight: 700, fontSize: "0.78rem", borderRadius: "8px",
                        "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" },
                      }}
                    >
                      {saved ? "Saved!" : "Log"}
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth label="Notes (optional)" value={logNotes}
                      onChange={e => setLogNotes(e.target.value)}
                      size="small" placeholder="How did you feel? Any observations..."
                      sx={inputSx(brandColor)}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Paper>

            {/* Progress history */}
            {progressLog.length > 0 && (
              <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", overflow: "hidden" }}>
                <Box sx={{ px: 3, py: 2, borderBottom: "1px solid #222" }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "0.95rem", color: "#fff" }}>
                    History
                  </Typography>
                </Box>
                {progressLog.map((entry, i) => {
                  const meta = METRICS.find(m => m.id === entry.metric);
                  return (
                    <Box key={entry.id} sx={{
                      px: 3, py: 1.75,
                      borderBottom: i < progressLog.length - 1 ? "1px solid #1e1e1e" : "none",
                      display: "flex", alignItems: "center", gap: 2,
                    }}>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip label={meta?.label || entry.metric} size="small" sx={chipSx(brandColor)} />
                          <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>
                            {entry.value} {entry.unit}
                          </Typography>
                        </Stack>
                        {entry.notes && (
                          <Typography sx={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.3)", mt: 0.3 }}>
                            {entry.notes}
                          </Typography>
                        )}
                      </Box>
                      <Typography sx={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                        {entry.date || (entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleDateString("en-GB") : "")}
                      </Typography>
                    </Box>
                  );
                })}
              </Paper>
            )}

            {progressLog.length === 0 && (
              <EmptyState message="No progress entries yet. Log your first one above." brandColor={brandColor} />
            )}
          </Box>
        )}

        {/* ── Forms ── */}
        {section === "forms" && (
          <Box>
            <SectionHead icon={AssignmentIcon} title="Your Forms" brandColor={brandColor} />
            <Grid container spacing={2}>
              {[
                { label: "Weekly Check-In",   desc: "How are you feeling this week?",          path: `/check-in/${trainerId}` },
                { label: "Food Diary",        desc: "Log today's meals and nutrition.",         path: `/food-diary/${trainerId}` },
                { label: "PAR-Q Health Form", desc: "Physical Activity Readiness Questionnaire.", path: `/par-q/${trainerId}` },
              ].map(form => (
                <Grid item xs={12} sm={4} key={form.label}>
                  <Paper
                    onClick={() => window.location.href = form.path}
                    sx={{
                      bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px",
                      p: 2.5, cursor: "pointer", transition: "border-color .2s",
                      "&:hover": { borderColor: `${brandColor}55` },
                    }}
                  >
                    <AssignmentIcon sx={{ fontSize: 22, color: brandColor, mb: 1 }} />
                    <Typography sx={{ fontFamily: SERIF, fontSize: "0.95rem", color: "#fff", mb: 0.5 }}>
                      {form.label}
                    </Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>
                      {form.desc}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
}

// ── Nutrition display ─────────────────────────────────────────────────────────
function NutritionDisplay({ plan, brandColor }) {
  if (!plan?.foods || plan.foods.length === 0) {
    return <EmptyState message="Nutrition plan is empty. Your trainer will fill this in." brandColor={brandColor} />;
  }

  const totalCal   = plan.foods.reduce((s, f) => s + (f.calories  || 0), 0);
  const totalProt  = plan.foods.reduce((s, f) => s + (f.protein   || 0), 0);
  const totalCarbs = plan.foods.reduce((s, f) => s + (f.carbs     || 0), 0);
  const totalFat   = plan.foods.reduce((s, f) => s + (f.fat       || 0), 0);

  return (
    <>
      {/* Macro summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Calories", value: Math.round(totalCal),   unit: "kcal", color: brandColor },
          { label: "Protein",  value: Math.round(totalProt),  unit: "g",    color: "#FF6B6B" },
          { label: "Carbs",    value: Math.round(totalCarbs), unit: "g",    color: "#4CAF50" },
          { label: "Fat",      value: Math.round(totalFat),   unit: "g",    color: "#FFC107" },
        ].map(m => (
          <Grid item xs={6} sm={3} key={m.label}>
            <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", p: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: m.color, lineHeight: 1 }}>
                {m.value}
              </Typography>
              <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", mt: 0.25 }}>
                {m.unit} {m.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Food list */}
      <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", overflow: "hidden" }}>
        {plan.foods.map((food, i) => (
          <Box key={i} sx={{
            px: 3, py: 1.75, display: "flex", alignItems: "center", gap: 2,
            borderBottom: i < plan.foods.length - 1 ? "1px solid #1e1e1e" : "none",
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff" }}>
                {food.name}
              </Typography>
              <Typography sx={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.35)" }}>
                {food.servingSize && `${food.servingSize} · `}{food.mealType || ""}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent="flex-end">
              {food.calories && <Chip label={`${Math.round(food.calories)} kcal`} size="small" sx={chipSx(brandColor)} />}
              {food.protein  && <Chip label={`${Math.round(food.protein)}g P`}    size="small" sx={{ bgcolor: "#FF6B6B18", color: "#FF6B6B", fontSize: "0.68rem", height: 20, border: "1px solid #FF6B6B33" }} />}
            </Stack>
          </Box>
        ))}
      </Paper>
    </>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ message, brandColor }) {
  return (
    <Box sx={{ textAlign: "center", py: 8 }}>
      <Box sx={{
        width: 56, height: 56, borderRadius: "50%",
        bgcolor: `${brandColor}15`, border: `1px solid ${brandColor}33`,
        display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2,
      }}>
        <FitnessCenterIcon sx={{ fontSize: 22, color: brandColor, opacity: 0.7 }} />
      </Box>
      <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", fontFamily: SANS }}>
        {message}
      </Typography>
    </Box>
  );
}

// ── Input style ───────────────────────────────────────────────────────────────
function inputSx(brand) {
  return {
    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: brand },
    "& .MuiOutlinedInput-root": {
      color: "#fff", borderRadius: "8px",
      "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
      "&:hover fieldset": { borderColor: "rgba(255,255,255,0.28)" },
      "&.Mui-focused fieldset": { borderColor: brand },
    },
    "& .MuiSelect-icon": { color: "rgba(255,255,255,0.4)" },
  };
}
