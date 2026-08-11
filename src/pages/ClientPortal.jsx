import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Container, Typography, CircularProgress, Stack,
  Grid, Paper, Button, TextField, MenuItem, Divider,
  Chip, IconButton, Alert, Collapse, Select, FormControl, InputLabel,
  Checkbox, FormControlLabel,
} from "@mui/material";
import FitnessCenterIcon     from "@mui/icons-material/FitnessCenter";
import ArrowBackIcon         from "@mui/icons-material/ArrowBack";
import RestaurantMenuIcon    from "@mui/icons-material/RestaurantMenu";
import TrendingUpIcon        from "@mui/icons-material/TrendingUp";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import CalendarMonthIcon     from "@mui/icons-material/CalendarMonth";
import AddIcon               from "@mui/icons-material/Add";
import CheckCircleIcon       from "@mui/icons-material/CheckCircle";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import CloseIcon             from "@mui/icons-material/Close";
import ExpandMoreIcon        from "@mui/icons-material/ExpandMore";
import DeleteIcon            from "@mui/icons-material/Delete";
import MenuBookIcon          from "@mui/icons-material/MenuBook";
import AutoAwesomeIcon       from "@mui/icons-material/AutoAwesome";
import HealthAndSafetyIcon  from "@mui/icons-material/HealthAndSafety";
import { Dialog, DialogContent } from "@mui/material";
import {
  doc, getDoc, getDocs, collection,
  addDoc, serverTimestamp, query, orderBy, limit,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { getNutritionPlan } from "../firebase/firestore";
import PWAInstallBanner from "../components/dashboard/PWAInstallBanner";
import OfflineIndicator from "../components/dashboard/OfflineIndicator";
import FoodGeneratorContent from "../components/FoodGeneratorContent";

const SERIF = "'Playfair Display', serif";
const SANS  = "'DM Sans', sans-serif";

const METRICS = [
  { id: "weight",  label: "Weight",      unit: "kg"    },
  { id: "bodyfat", label: "Body Fat",    unit: "%"     },
  { id: "chest",   label: "Chest",       unit: "cm"    },
  { id: "waist",   label: "Waist",       unit: "cm"    },
  { id: "hips",    label: "Hips",        unit: "cm"    },
  { id: "steps",   label: "Daily Steps", unit: "steps" },
  { id: "sleep",   label: "Sleep",       unit: "hrs"   },
  { id: "energy",  label: "Energy Level",unit: "/10"   },
];

const DAYS       = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MEAL_TYPES = ["Breakfast","Lunch","Dinner","Snack","Drink","Other"];
const blankMeal  = () => ({ id: `m-${Date.now()}-${Math.random()}`, time: "", type: "Breakfast", description: "", amount: "" });

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

const chipSx = (brand) => ({
  bgcolor: `${brand}18`, color: brand,
  fontSize: "0.7rem", fontWeight: 600, height: 20,
  border: `1px solid ${brand}33`,
});

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
    "& textarea, & input": { "&::placeholder": { color: "rgba(255,255,255,0.18)", opacity: 1 } },
  };
}

function BackButton({ onClick }) {
  return (
    <Button
      onClick={onClick}
      startIcon={<ArrowBackIcon sx={{ fontSize: "16px !important" }} />}
      sx={{
        mb: 3, color: "rgba(255,255,255,0.45)", fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500, fontSize: "0.8rem", px: 0, minWidth: 0,
        "&:hover": { bgcolor: "transparent", color: "#fff" },
      }}
    >
      Back
    </Button>
  );
}

function SectionHead({ icon: Icon, title, brandColor }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
      <Box sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: `${brandColor}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon sx={{ fontSize: 18, color: brandColor }} />
      </Box>
      <Typography sx={{ fontFamily: SERIF, fontSize: "1.3rem", fontWeight: 600, color: "#fff" }}>
        {title}
      </Typography>
    </Box>
  );
}

function WorkoutCard({ plan, brandColor }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [open, setOpen] = useState(true);

  return (
    <>
      <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", mb: 2, overflow: "hidden" }}>
        <Box
          onClick={() => setOpen(o => !o)}
          sx={{ p: 2.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.05rem", color: "#fff" }}>{plan.name}</Typography>
          <ExpandMoreIcon sx={{ color: "rgba(255,255,255,0.3)", transform: open ? "rotate(180deg)" : "none", transition: ".2s" }} />
        </Box>
        <Collapse in={open}>
          <Divider sx={{ borderColor: "#222" }} />
          <Box sx={{ px: 2.5, pb: 2.5, pt: 1.5 }}>
            {(plan.exercises || []).map((ex, i) => {
              const ytId = extractYouTubeId(ex.youtubeUrl || ex.videoUrl);
              return (
                <Box key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 2, py: 1.5, borderTop: i === 0 ? "none" : "1px solid #222" }}>
                  {ytId ? (
                    <Box onClick={() => setVideoUrl(ex.youtubeUrl || ex.videoUrl)}
                      sx={{ flexShrink: 0, width: 72, height: 48, borderRadius: "6px", bgcolor: "#111", overflow: "hidden", cursor: "pointer", position: "relative", "&:hover .play": { opacity: 1 } }}>
                      <Box component="img" src={`https://img.youtube.com/vi/${ytId}/default.jpg`} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <Box className="play" sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.5)", opacity: 0, transition: ".2s" }}>
                        <PlayCircleOutlineIcon sx={{ color: "#fff", fontSize: 22 }} />
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ flexShrink: 0, width: 72, height: 48, borderRadius: "6px", bgcolor: "#222", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FitnessCenterIcon sx={{ fontSize: 20, color: "#555" }} />
                    </Box>
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff", mb: 0.3 }}>{ex.name}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                      {ex.sets  && <Chip label={`${ex.sets} sets`}  size="small" sx={chipSx(brandColor)} />}
                      {ex.reps  && <Chip label={`${ex.reps} reps`}  size="small" sx={chipSx(brandColor)} />}
                      {(ex.time || ex.duration) && <Chip label={ex.time || ex.duration} size="small" sx={chipSx(brandColor)} />}
                    </Stack>
                    {ex.notes && <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", mt: 0.5 }}>{ex.notes}</Typography>}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Collapse>
      </Paper>

      <Dialog open={Boolean(videoUrl)} onClose={() => setVideoUrl(null)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 0, bgcolor: "#000", position: "relative" }}>
          <IconButton onClick={() => setVideoUrl(null)} sx={{ position: "absolute", top: 8, right: 8, color: "#fff", zIndex: 1 }}><CloseIcon /></IconButton>
          {videoUrl && (
            <Box component="iframe"
              src={`https://www.youtube.com/embed/${extractYouTubeId(videoUrl)}?autoplay=1`}
              allow="autoplay; encrypted-media" allowFullScreen
              sx={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block" }} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function NutritionDisplay({ plan, brandColor }) {
  if (!plan?.foods || plan.foods.length === 0) return <EmptyState message="Nutrition plan not set yet. Your trainer will add one soon." brandColor={brandColor} />;

  const totalCal   = plan.foods.reduce((s, f) => s + (f.calories || 0), 0);
  const totalProt  = plan.foods.reduce((s, f) => s + (f.protein  || 0), 0);
  const totalCarbs = plan.foods.reduce((s, f) => s + (f.carbs    || 0), 0);
  const totalFat   = plan.foods.reduce((s, f) => s + (f.fat      || 0), 0);

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Calories", value: Math.round(totalCal),   unit: "kcal", color: brandColor },
          { label: "Protein",  value: Math.round(totalProt),  unit: "g",    color: "#FF6B6B" },
          { label: "Carbs",    value: Math.round(totalCarbs), unit: "g",    color: "#4CAF50" },
          { label: "Fat",      value: Math.round(totalFat),   unit: "g",    color: "#FFC107" },
        ].map(m => (
          <Grid item xs={6} sm={3} key={m.label}>
            <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", p: 2, textAlign: "center" }}>
              <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</Typography>
              <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", mt: 0.25 }}>{m.unit} {m.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
      <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", overflow: "hidden" }}>
        {plan.foods.map((food, i) => (
          <Box key={i} sx={{ px: 3, py: 1.75, display: "flex", alignItems: "center", gap: 2, borderBottom: i < plan.foods.length - 1 ? "1px solid #1e1e1e" : "none" }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff" }}>{food.name}</Typography>
              <Typography sx={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.35)" }}>{food.servingSize && `${food.servingSize} · `}{food.mealType || ""}</Typography>
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

function EmptyState({ message, brandColor }) {
  return (
    <Box sx={{ textAlign: "center", py: 8 }}>
      <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: `${brandColor}15`, border: `1px solid ${brandColor}33`, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
        <FitnessCenterIcon sx={{ fontSize: 22, color: brandColor, opacity: 0.7 }} />
      </Box>
      <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", fontFamily: SANS }}>{message}</Typography>
    </Box>
  );
}

function SignaturePad({ brand, onChange }) {
  const canvasRef = React.useRef(null);
  const drawing   = React.useRef(false);
  const lastPos   = React.useRef({ x: 0, y: 0 });

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const src    = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width  / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height),
    };
  }
  function startDraw(e) {
    e.preventDefault(); drawing.current = true; lastPos.current = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath(); ctx.arc(lastPos.current.x, lastPos.current.y, 1, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1714"; ctx.fill();
  }
  function draw(e) {
    if (!drawing.current) return; e.preventDefault();
    const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y); ctx.strokeStyle = "#1a1714";
    ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    lastPos.current = pos; onChange(canvas.toDataURL("image/png"));
  }
  function stopDraw() { drawing.current = false; }
  function clear() {
    canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    onChange(null);
  }
  return (
    <Box>
      <canvas ref={canvasRef} width={560} height={150}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        style={{ display: "block", width: "100%", background: "#fafaf8", border: "1.5px solid rgba(255,255,255,0.15)", cursor: "crosshair", touchAction: "none", borderRadius: 4 }}
      />
      <Button size="small" onClick={clear} sx={{ mt: 0.75, color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", fontWeight: 700, p: 0, minWidth: 0, "&:hover": { color: "#ff6b6b", bgcolor: "transparent" } }}>
        Clear signature
      </Button>
    </Box>
  );
}

function YesNo({ value, onChange, brand }) {
  return (
    <Stack direction="row" spacing={1}>
      {["yes", "no"].map(opt => {
        const active = value === opt;
        const isYes  = opt === "yes";
        const color  = isYes ? "#e0a800" : "#66bb6a";
        return (
          <Button key={opt} onClick={() => onChange(opt)}
            sx={{
              minWidth: 72, py: 0.85, fontWeight: 900, fontSize: "0.72rem",
              letterSpacing: "0.12em", borderRadius: "8px", boxShadow: "none",
              border: "1.5px solid",
              borderColor: active ? color : "rgba(255,255,255,0.12)",
              bgcolor:     active ? (isYes ? "rgba(224,168,0,0.16)" : "rgba(102,187,106,0.14)") : "transparent",
              color:       active ? color : "rgba(255,255,255,0.35)",
              transition: "all .15s",
              "&:hover": { borderColor: color, color, bgcolor: isYes ? "rgba(224,168,0,0.1)" : "rgba(102,187,106,0.1)" },
            }}
          >
            {opt.toUpperCase()}
          </Button>
        );
      })}
    </Stack>
  );
}

// ── Main portal ───────────────────────────────────────────────────────────────
export default function ClientPortal() {
  const { trainerId, clientId } = useParams();

  const [loading,        setLoading]        = useState(true);
  const [trainer,        setTrainer]        = useState(null);
  const [client,         setClient]         = useState(null);
  const [workoutPlans,   setWorkoutPlans]   = useState([]);
  const [nutritionPlan,  setNutritionPlan]  = useState(null);
  const [section,        setSection]        = useState("plan");

  // Progress
  const [progressLog,  setProgressLog]  = useState([]);
  const [logMetric,    setLogMetric]    = useState("weight");
  const [logValue,     setLogValue]     = useState("");
  const [logNotes,     setLogNotes]     = useState("");
  const [logDate,      setLogDate]      = useState(() => new Date().toISOString().split("T")[0]);
  const [progSaving,   setProgSaving]   = useState(false);
  const [progSaved,    setProgSaved]    = useState(false);

  // Check-in
  const [checkInQuestions, setCheckInQuestions] = useState([]);
  const [checkInAnswers,   setCheckInAnswers]   = useState({});
  const [checkInDate,      setCheckInDate]      = useState(() => new Date().toISOString().split("T")[0]);
  const [checkInSaving,    setCheckInSaving]    = useState(false);
  const [checkInDone,      setCheckInDone]      = useState(false);
  const [checkInError,     setCheckInError]     = useState("");

  // PAR-Q
  const [parqQuestions,  setParqQuestions]  = useState([]);
  const [parqAnswers,    setParqAnswers]    = useState({});
  const [parqDob,        setParqDob]        = useState("");
  const [parqDate,       setParqDate]       = useState(() => new Date().toISOString().split("T")[0]);
  const [parqSignature,  setParqSignature]  = useState(null);
  const [parqAgreed,     setParqAgreed]     = useState(false);
  const [parqSaving,     setParqSaving]     = useState(false);
  const [parqDone,       setParqDone]       = useState(false);
  const [parqError,      setParqError]      = useState("");

  // Food diary
  const [foodWeekOf,   setFoodWeekOf]   = useState("");
  const [dayMeals,     setDayMeals]     = useState(() => Object.fromEntries(DAYS.map(d => [d, []])));
  const [dayExpanded,  setDayExpanded]  = useState({});
  const [foodSaving,   setFoodSaving]   = useState(false);
  const [foodDone,     setFoodDone]     = useState(false);
  const [foodError,    setFoodError]    = useState("");


  const brandColor = trainer?.brandColor || "#C9A84C";
  const iSx = inputSx(brandColor);

  function notifyTrainer(title, body, tag, data = {}) {
    addDoc(collection(db, "barbers", trainerId, "notifications"), {
      type: tag, title, body, data, read: false, createdAt: serverTimestamp(),
    }).catch(() => {});
  }

  useEffect(() => {
    if (!trainerId || !clientId) return;
    load();
  }, [trainerId, clientId]);

  async function load() {
    setLoading(true);
    try {
      const [trainerSnap, clientSnap, configSnap, parqSnap] = await Promise.all([
        getDoc(doc(db, "barbers", trainerId)),
        getDoc(doc(db, "barbers", trainerId, "clients", clientId)),
        getDoc(doc(db, "barbers", trainerId, "config", "checkIn")),
        getDoc(doc(db, "barbers", trainerId, "config", "parQ")),
      ]);

      const trainerData = trainerSnap.exists() ? trainerSnap.data() : null;
      const clientData  = clientSnap.exists()  ? { id: clientSnap.id, ...clientSnap.data() } : null;
      setTrainer(trainerData);
      setClient(clientData);

      if (configSnap.exists()) setCheckInQuestions(configSnap.data().questions || []);
      if (parqSnap.exists())   setParqQuestions(parqSnap.data().questions || []);

      // Workout plans
      const plansSnap  = await getDocs(collection(db, "barbers", trainerId, "workoutPlans"));
      const allPlans   = plansSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const clientName = (clientData?.customerName || "").toLowerCase();
      const matched    = allPlans.filter(p =>
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
        query(collection(db, "barbers", trainerId, "clients", clientId, "progressEntries"), orderBy("createdAt", "desc"), limit(20))
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
    setProgSaving(true);
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
      const ref = await addDoc(collection(db, "barbers", trainerId, "clients", clientId, "progressEntries"), entry);
      setProgressLog(prev => [{ id: ref.id, ...entry, createdAt: new Date().toISOString() }, ...prev]);
      setLogValue(""); setLogNotes("");
      setProgSaved(true);
      notifyTrainer(
        "Progress Update",
        `${client?.customerName || "A client"} logged ${entry.value}${entry.unit} (${METRICS.find(m => m.id === logMetric)?.label || logMetric})`,
        "progress"
      );
      setTimeout(() => setProgSaved(false), 2500);
    } catch (e) {
      console.error("Progress log error:", e);
    } finally {
      setProgSaving(false);
    }
  }

  async function handleCheckIn(e) {
    e.preventDefault();
    setCheckInError("");
    if (checkInQuestions.length > 0) {
      const unanswered = checkInQuestions.filter(q => q.required && !checkInAnswers[q.id]?.trim());
      if (unanswered.length > 0) {
        setCheckInError("Please answer all required questions.");
        return;
      }
    }
    setCheckInSaving(true);
    try {
      const answersArr = checkInQuestions.map(q => ({
        question: q.text || q.question,
        answer:   checkInAnswers[q.id] || "",
      }));
      await addDoc(collection(db, "barbers", trainerId, "checkInSubmissions"), {
        clientName: client?.customerName || "",
        clientId,
        date:       checkInDate,
        answers:    answersArr,
        submittedAt: serverTimestamp(),
      });
      setCheckInDone(true);
      setCheckInAnswers({});
      notifyTrainer(
        "Weekly Check-In Submitted",
        `${client?.customerName || "A client"} completed their check-in for ${checkInDate}`,
        "checkin"
      );
    } catch (e) {
      console.error("Check-in error:", e);
      setCheckInError("Something went wrong. Please try again.");
    } finally {
      setCheckInSaving(false);
    }
  }

  function setParqAnswer(qId, field, value) {
    setParqAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], [field]: value } }));
  }

  async function handleParqSubmit(e) {
    e.preventDefault();
    setParqError("");
    if (!parqDob)  { setParqError("Please enter your date of birth."); return; }
    if (!parqDate) { setParqError("Please enter today's date."); return; }
    const unanswered = parqQuestions.filter(q => !parqAnswers[q.id]?.answer);
    if (unanswered.length > 0) { setParqError("Please answer all questions."); return; }
    if (!parqSignature) { setParqError("Please sign the form."); return; }
    if (!parqAgreed)    { setParqError("Please agree to the declaration."); return; }
    setParqSaving(true);
    try {
      const answerArr = parqQuestions.map(q => ({
        questionId: q.id,
        question:   q.text,
        answer:     parqAnswers[q.id]?.answer || "no",
        details:    (parqAnswers[q.id]?.details || "").trim(),
      }));
      await addDoc(collection(db, "barbers", trainerId, "parQSubmissions"), {
        clientName: client?.customerName || "",
        clientId,
        dob:        parqDob,
        date:       parqDate,
        answers:    answerArr,
        signature:  parqSignature,
        agreedToDeclaration: true,
        submittedAt: serverTimestamp(),
      });
      setParqDone(true);
      notifyTrainer(
        "PAR-Q Health Form Submitted",
        `${client?.customerName || "A client"} completed their health screening form`,
        "parq"
      );
    } catch (err) {
      console.error(err);
      setParqError("Something went wrong. Please try again.");
    } finally {
      setParqSaving(false);
    }
  }

  function toggleDay(day) { setDayExpanded(p => ({ ...p, [day]: !p[day] })); }
  function addMeal(day)   { setDayMeals(p => ({ ...p, [day]: [...p[day], blankMeal()] })); setDayExpanded(p => ({ ...p, [day]: true })); }
  function removeMeal(day, id) { setDayMeals(p => ({ ...p, [day]: p[day].filter(m => m.id !== id) })); }
  function updateMeal(day, id, field, val) { setDayMeals(p => ({ ...p, [day]: p[day].map(m => m.id === id ? { ...m, [field]: val } : m) })); }

  async function handleFoodDiary(e) {
    e.preventDefault();
    setFoodError("");
    if (!foodWeekOf) { setFoodError("Please select the week."); return; }
    const allEntries = DAYS.flatMap(d => dayMeals[d].map(m => ({ day: d, ...m })));
    if (allEntries.length === 0) { setFoodError("Please add at least one meal or drink."); return; }
    setFoodSaving(true);
    try {
      const entries = allEntries.map(({ id, ...rest }) => rest);
      await addDoc(collection(db, "barbers", trainerId, "foodDiarySubmissions"), {
        clientName: client?.customerName || "",
        clientId,
        weekOf: foodWeekOf,
        entries,
        submittedAt: serverTimestamp(),
      });
      setFoodDone(true);
      setDayMeals(Object.fromEntries(DAYS.map(d => [d, []])));
      setDayExpanded({});
      notifyTrainer(
        "Food Diary Submitted",
        `${client?.customerName || "A client"} submitted their food diary for w/c ${foodWeekOf} (${entries.length} item${entries.length !== 1 ? "s" : ""})`,
        "fooddiary"
      );
    } catch (err) {
      console.error(err);
      setFoodError("Something went wrong. Please try again.");
    } finally {
      setFoodSaving(false);
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
        <Typography sx={{ color: "rgba(255,255,255,0.4)", fontFamily: SANS }}>Portal not found. Check your link.</Typography>
      </Box>
    );
  }

  const NAV = [
    { id: "plan",      label: "My Plan",    icon: FitnessCenterIcon },
    { id: "progress",  label: "Progress",   icon: TrendingUpIcon },
    { id: "checkin",   label: "Check-In",   icon: AssignmentTurnedInIcon },
    { id: "fooddiary", label: "Food Diary", icon: MenuBookIcon },
    { id: "foodgen",   label: "Food Gen",   icon: AutoAwesomeIcon },
    { id: "parq",      label: "PAR-Q",      icon: HealthAndSafetyIcon },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0d0d0d", fontFamily: SANS }}>

      {/* ── Header ── */}
      <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.07)", bgcolor: "#111", position: "sticky", top: 0, zIndex: 100 }}>
        <Container maxWidth="md">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {trainer.logoUrl && (
                <Box component="img" src={trainer.logoUrl} sx={{ height: 36, width: "auto", borderRadius: "6px", objectFit: "contain" }} />
              )}
              <Box>
                <Typography sx={{ fontFamily: SERIF, fontSize: "0.95rem", color: "#fff", lineHeight: 1.1 }}>
                  {trainer.businessName || trainer.name}
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>Personal Training Portal</Typography>
              </Box>
            </Stack>
            <Button
              href={`/pt-book/${trainerId}`}
              variant="contained"
              size="small"
              startIcon={<CalendarMonthIcon sx={{ fontSize: "14px !important" }} />}
              sx={{ bgcolor: brandColor, color: "#000", fontWeight: 700, fontSize: "0.75rem", borderRadius: "8px", "&:hover": { bgcolor: brandColor, filter: "brightness(0.9)" } }}
            >
              Book a session
            </Button>
          </Box>
        </Container>
      </Box>

      <OfflineIndicator />
      <PWAInstallBanner brandColor={brandColor} />

      {/* ── Welcome ── */}
      <Box sx={{ bgcolor: "#111", borderBottom: "1px solid rgba(255,255,255,0.05)", py: 3 }}>
        <Container maxWidth="md">
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.5rem", sm: "1.9rem" }, color: "#fff" }}>
            Hey, <em style={{ fontStyle: "italic", color: brandColor }}>{client.customerName?.split(" ")[0]}</em> 👋
          </Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", mt: 0.5 }}>
            Your training hub — view your plans, log progress, and send your weekly check-in.
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
                <Button key={id} onClick={() => setSection(id)} disableRipple
                  startIcon={<Icon sx={{ fontSize: "15px !important" }} />}
                  sx={{
                    color: active ? brandColor : "rgba(255,255,255,0.4)",
                    borderBottom: active ? `2px solid ${brandColor}` : "2px solid transparent",
                    borderRadius: 0, px: { xs: 1.5, sm: 2 }, py: 1.4,
                    fontFamily: SANS, fontWeight: active ? 700 : 400,
                    fontSize: "0.78rem", letterSpacing: "0.04em", textTransform: "uppercase",
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

        {/* ── MY PLAN — workouts + nutrition combined ── */}
        {section === "plan" && (
          <Box>
            {/* Workouts */}
            <SectionHead icon={FitnessCenterIcon} title="Workout Plans" brandColor={brandColor} />
            {workoutPlans.length === 0 ? (
              <EmptyState message="No workout plans assigned yet. Check back soon." brandColor={brandColor} />
            ) : (
              workoutPlans.map(plan => <WorkoutCard key={plan.id} plan={plan} brandColor={brandColor} />)
            )}

            <Divider sx={{ borderColor: "rgba(255,255,255,0.07)", my: 4 }} />

            {/* Nutrition */}
            <SectionHead icon={RestaurantMenuIcon} title="Nutrition Plan" brandColor={brandColor} />
            {!nutritionPlan ? (
              <EmptyState message="No nutrition plan assigned yet. Your trainer will add one soon." brandColor={brandColor} />
            ) : (
              <NutritionDisplay plan={nutritionPlan} brandColor={brandColor} />
            )}
          </Box>
        )}

        {/* ── PROGRESS ── */}
        {section === "progress" && (
          <Box>
            <BackButton onClick={() => setSection("plan")} />
            <SectionHead icon={TrendingUpIcon} title="Log Your Progress" brandColor={brandColor} />

            <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", p: 3, mb: 3 }}>
              <Typography sx={{ fontFamily: SERIF, fontSize: "1rem", color: "#fff", mb: 2 }}>Add a new entry</Typography>
              <Box component="form" onSubmit={handleLogProgress}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField select fullWidth label="Metric" value={logMetric} onChange={e => setLogMetric(e.target.value)} size="small" sx={iSx}>
                      {METRICS.map(m => <MenuItem key={m.id} value={m.id}>{m.label} ({m.unit})</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth label={`Value (${METRICS.find(m => m.id === logMetric)?.unit})`} type="number" value={logValue} onChange={e => setLogValue(e.target.value)} size="small" sx={iSx} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth label="Date" type="date" value={logDate} onChange={e => setLogDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} sx={iSx} />
                  </Grid>
                  <Grid item xs={12} sm={2} sx={{ display: "flex", alignItems: "flex-end" }}>
                    <Button type="submit" fullWidth variant="contained" disabled={progSaving || !logValue}
                      startIcon={progSaved ? <CheckCircleIcon /> : <AddIcon />}
                      sx={{ height: 40, bgcolor: brandColor, color: "#000", fontWeight: 700, fontSize: "0.78rem", borderRadius: "8px", "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" } }}
                    >
                      {progSaved ? "Saved!" : "Log"}
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Notes (optional)" value={logNotes} onChange={e => setLogNotes(e.target.value)} size="small" placeholder="How did you feel? Any observations..." sx={iSx} />
                  </Grid>
                </Grid>
              </Box>
            </Paper>

            {progressLog.length > 0 && (
              <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", overflow: "hidden" }}>
                <Box sx={{ px: 3, py: 2, borderBottom: "1px solid #222" }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "0.95rem", color: "#fff" }}>History</Typography>
                </Box>
                {progressLog.map((entry, i) => {
                  const meta = METRICS.find(m => m.id === entry.metric);
                  return (
                    <Box key={entry.id} sx={{ px: 3, py: 1.75, borderBottom: i < progressLog.length - 1 ? "1px solid #1e1e1e" : "none", display: "flex", alignItems: "center", gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip label={meta?.label || entry.metric} size="small" sx={chipSx(brandColor)} />
                          <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>{entry.value} {entry.unit}</Typography>
                        </Stack>
                        {entry.notes && <Typography sx={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.3)", mt: 0.3 }}>{entry.notes}</Typography>}
                      </Box>
                      <Typography sx={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                        {entry.date || ""}
                      </Typography>
                    </Box>
                  );
                })}
              </Paper>
            )}
            {progressLog.length === 0 && <EmptyState message="No progress entries yet. Log your first one above." brandColor={brandColor} />}
          </Box>
        )}

        {/* ── CHECK-IN ── */}
        {section === "checkin" && (
          <Box>
            <BackButton onClick={() => setSection("plan")} />
            <SectionHead icon={AssignmentTurnedInIcon} title="Weekly Check-In" brandColor={brandColor} />

            {checkInDone ? (
              <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", p: 4, textAlign: "center" }}>
                <CheckCircleIcon sx={{ fontSize: 52, color: brandColor, mb: 1.5 }} />
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.4rem", color: "#fff", mb: 1 }}>Check-in sent!</Typography>
                <Typography sx={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.4)", mb: 3 }}>
                  Your trainer will review your responses.
                </Typography>
                <Button onClick={() => { setCheckInDone(false); setCheckInDate(new Date().toISOString().split("T")[0]); }}
                  variant="outlined"
                  sx={{ borderColor: brandColor, color: brandColor, borderRadius: "8px", fontWeight: 600, "&:hover": { bgcolor: `${brandColor}15`, borderColor: brandColor } }}
                >
                  Submit another
                </Button>
              </Paper>
            ) : checkInQuestions.length === 0 ? (
              <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", p: 4, textAlign: "center" }}>
                <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.88rem" }}>
                  Your trainer hasn't set up any check-in questions yet. Check back soon.
                </Typography>
              </Paper>
            ) : (
              <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", p: 3 }}>
                <Box component="form" onSubmit={handleCheckIn}>
                  <TextField
                    fullWidth label="Date" type="date" size="small"
                    value={checkInDate} onChange={e => setCheckInDate(e.target.value)}
                    InputLabelProps={{ shrink: true }} sx={{ ...iSx, mb: 3 }}
                  />

                  <Stack spacing={2.5}>
                    {checkInQuestions.map((q, idx) => (
                      <Box key={q.id || idx}>
                        <Typography sx={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.8)", mb: 1 }}>
                          {q.text || q.question}
                        </Typography>
                        <TextField
                          fullWidth multiline minRows={2}
                          placeholder="Your answer..."
                          value={checkInAnswers[q.id || idx] || ""}
                          onChange={e => setCheckInAnswers(prev => ({ ...prev, [q.id || idx]: e.target.value }))}
                          size="small" sx={iSx}
                        />
                      </Box>
                    ))}
                  </Stack>

                  {checkInError && <Alert severity="error" sx={{ mt: 2, bgcolor: "#2a1a1a", color: "#ff8a80" }}>{checkInError}</Alert>}

                  <Button
                    type="submit" variant="contained" fullWidth disabled={checkInSaving}
                    sx={{ mt: 3, height: 48, bgcolor: brandColor, color: "#000", fontWeight: 700, fontSize: "0.88rem", borderRadius: "8px", "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" } }}
                  >
                    {checkInSaving ? <CircularProgress size={22} sx={{ color: "#000" }} /> : "Send Check-In"}
                  </Button>
                </Box>
              </Paper>
            )}
          </Box>
        )}

        {/* ── FOOD GENERATOR ── */}
        {section === "foodgen" && (
          <Box>
            <BackButton onClick={() => setSection("plan")} />
            <SectionHead icon={AutoAwesomeIcon} title="Food Generator" brandColor={brandColor} />
            <FoodGeneratorContent brandColor={brandColor} />
          </Box>
        )}

        {/* ── FOOD DIARY ── */}
        {section === "fooddiary" && (
          <Box>
            <BackButton onClick={() => setSection("plan")} />
            <SectionHead icon={MenuBookIcon} title="Weekly Food Diary" brandColor={brandColor} />

            {foodDone ? (
              <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", p: 4, textAlign: "center" }}>
                <CheckCircleIcon sx={{ fontSize: 52, color: brandColor, mb: 1.5 }} />
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.4rem", color: "#fff", mb: 1 }}>Diary submitted!</Typography>
                <Typography sx={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.4)", mb: 3 }}>
                  Your food diary for the week of <strong style={{ color: "rgba(255,255,255,0.7)" }}>{foodWeekOf}</strong> has been sent to your trainer.
                </Typography>
                <Button
                  onClick={() => { setFoodDone(false); setFoodWeekOf(""); }}
                  variant="outlined"
                  sx={{ borderColor: brandColor, color: brandColor, borderRadius: "8px", fontWeight: 600, "&:hover": { bgcolor: `${brandColor}15`, borderColor: brandColor } }}
                >
                  Submit another week
                </Button>
              </Paper>
            ) : (
              <Box component="form" onSubmit={handleFoodDiary}>
                {/* Week picker */}
                <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", p: 3, mb: 2 }}>
                  <TextField
                    fullWidth label="Week of" type="date" size="small"
                    value={foodWeekOf} onChange={e => setFoodWeekOf(e.target.value)}
                    InputLabelProps={{ shrink: true }} sx={iSx}
                  />
                </Paper>

                {/* Days */}
                <Stack spacing={1.5} sx={{ mb: 3 }}>
                  {DAYS.map(day => {
                    const meals   = dayMeals[day];
                    const isOpen  = dayExpanded[day];
                    const hasMeals = meals.length > 0;
                    return (
                      <Paper key={day} sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", overflow: "hidden" }}>
                        <Box
                          onClick={() => hasMeals && toggleDay(day)}
                          sx={{ display: "flex", alignItems: "center", px: 2.5, py: 1.8, cursor: hasMeals ? "pointer" : "default" }}
                        >
                          <Box sx={{ width: 3, height: 14, bgcolor: hasMeals ? brandColor : "rgba(255,255,255,0.12)", flexShrink: 0, mr: 1.5, borderRadius: 1 }} />
                          <Typography sx={{ flex: 1, color: hasMeals ? "#fff" : "rgba(255,255,255,0.35)", fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                            {day}
                          </Typography>
                          {hasMeals && (
                            <Typography sx={{ color: "rgba(255,255,255,0.25)", fontSize: "0.7rem", mr: 1.5 }}>
                              {meals.length} item{meals.length !== 1 ? "s" : ""}
                            </Typography>
                          )}
                          <Button
                            size="small"
                            startIcon={<AddIcon sx={{ fontSize: "13px !important" }} />}
                            onClick={e => { e.stopPropagation(); addMeal(day); }}
                            sx={{ color: brandColor, fontWeight: 700, fontSize: "0.68rem", letterSpacing: "0.06em", px: 1.2, py: 0.5, minWidth: 0, "&:hover": { bgcolor: `${brandColor}12` } }}
                          >
                            Add
                          </Button>
                          {hasMeals && (
                            <ExpandMoreIcon sx={{ fontSize: 18, color: "rgba(255,255,255,0.3)", ml: 0.5, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                          )}
                        </Box>

                        <Collapse in={isOpen}>
                          <Divider sx={{ borderColor: "#2a2a2a" }} />
                          <Box sx={{ p: 2 }}>
                            <Stack spacing={1.5}>
                              {meals.map(m => (
                                <Box key={m.id} sx={{ bgcolor: "rgba(255,255,255,0.03)", borderRadius: "8px", p: 1.5 }}>
                                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                                    <TextField
                                      label="Time" type="time" value={m.time}
                                      onChange={e => updateMeal(day, m.id, "time", e.target.value)}
                                      size="small" InputLabelProps={{ shrink: true }}
                                      sx={{ ...iSx, width: 120, flexShrink: 0 }}
                                    />
                                    <FormControl size="small" sx={{ ...iSx, flex: 1 }}>
                                      <InputLabel>Type</InputLabel>
                                      <Select
                                        value={m.type} label="Type"
                                        onChange={e => updateMeal(day, m.id, "type", e.target.value)}
                                        MenuProps={{ PaperProps: { sx: { bgcolor: "#1a1a1a", color: "#fff" } } }}
                                      >
                                        {MEAL_TYPES.map(t => (
                                          <MenuItem key={t} value={t} sx={{ fontSize: "0.84rem", "&:hover": { bgcolor: `${brandColor}20` }, "&.Mui-selected": { bgcolor: `${brandColor}30` } }}>{t}</MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                    <IconButton size="small" onClick={() => removeMeal(day, m.id)} sx={{ color: "rgba(255,255,255,0.2)", flexShrink: 0, "&:hover": { color: "#ff6b6b" } }}>
                                      <DeleteIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                  </Box>
                                  <Box sx={{ display: "flex", gap: 1 }}>
                                    <TextField
                                      label={m.type === "Drink" ? "What did you drink?" : "What did you eat?"}
                                      value={m.description} size="small" fullWidth
                                      onChange={e => updateMeal(day, m.id, "description", e.target.value)}
                                      sx={iSx}
                                    />
                                    <TextField
                                      label={m.type === "Drink" ? "How much?" : "Portion"}
                                      placeholder={m.type === "Drink" ? "e.g. 500ml" : "e.g. 200g"}
                                      value={m.amount} size="small"
                                      onChange={e => updateMeal(day, m.id, "amount", e.target.value)}
                                      sx={{ ...iSx, width: 130, flexShrink: 0 }}
                                    />
                                  </Box>
                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        </Collapse>
                      </Paper>
                    );
                  })}
                </Stack>

                {foodError && <Alert severity="error" sx={{ mb: 2, bgcolor: "#2a1a1a", color: "#ff8a80" }}>{foodError}</Alert>}

                <Button
                  type="submit" fullWidth variant="contained" disabled={foodSaving}
                  sx={{ height: 48, bgcolor: brandColor, color: "#000", fontWeight: 700, fontSize: "0.88rem", borderRadius: "8px", "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" } }}
                >
                  {foodSaving ? <CircularProgress size={22} sx={{ color: "#000" }} /> : "Submit Food Diary"}
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* ── PAR-Q ── */}
        {section === "parq" && (
          <Box>
            <BackButton onClick={() => setSection("plan")} />
            <SectionHead icon={HealthAndSafetyIcon} title="Health Screening (PAR-Q)" brandColor={brandColor} />

            {parqDone ? (
              <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", p: 4, textAlign: "center" }}>
                <CheckCircleIcon sx={{ fontSize: 52, color: brandColor, mb: 1.5 }} />
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.4rem", color: "#fff", mb: 1 }}>PAR-Q submitted!</Typography>
                <Typography sx={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.4)" }}>
                  Thank you. Your trainer will review your health information before your session.
                </Typography>
              </Paper>
            ) : parqQuestions.length === 0 ? (
              <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", p: 4, textAlign: "center" }}>
                <HealthAndSafetyIcon sx={{ fontSize: 44, color: "rgba(255,255,255,0.1)", mb: 1.5 }} />
                <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.88rem" }}>
                  Your trainer hasn't set up the PAR-Q form yet. Check back soon.
                </Typography>
              </Paper>
            ) : (
              <Box component="form" onSubmit={handleParqSubmit}>

                {/* Info banner */}
                <Paper sx={{ bgcolor: "rgba(224,168,0,0.08)", border: "1px solid rgba(224,168,0,0.2)", borderRadius: "10px", p: 2.5, mb: 3 }}>
                  <Typography sx={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.75 }}>
                    Please answer every question honestly. This form must be completed before your first session and kept on record by your trainer.
                  </Typography>
                </Paper>

                {/* Personal details */}
                <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: brandColor, mb: 2 }}>
                  Personal Details
                </Typography>
                <Stack spacing={2} sx={{ mb: 4 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField fullWidth label="Date of Birth" type="date" value={parqDob} onChange={e => setParqDob(e.target.value)} InputLabelProps={{ shrink: true }} sx={iSx} />
                    <TextField fullWidth label="Today's Date"  type="date" value={parqDate} onChange={e => setParqDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={iSx} />
                  </Stack>
                </Stack>

                {/* Health questions */}
                <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: brandColor, mb: 2 }}>
                  Health Questions
                </Typography>
                <Stack spacing={2.5} sx={{ mb: 4 }}>
                  {parqQuestions.map((q, idx) => {
                    const ans   = parqAnswers[q.id] || {};
                    const isYes = ans.answer === "yes";
                    return (
                      <Paper key={q.id} sx={{ bgcolor: "#1a1a1a", border: `1px solid ${isYes ? "rgba(224,168,0,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: "10px", overflow: "hidden" }}>
                        <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid rgba(255,255,255,0.05)", bgcolor: "rgba(0,0,0,0.2)", display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                          <Typography sx={{ color: brandColor, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", flexShrink: 0, mt: 0.25 }}>
                            {String(idx + 1).padStart(2, "0")}
                          </Typography>
                          <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: "0.88rem", fontWeight: 500, lineHeight: 1.55, flex: 1 }}>
                            {q.text}
                          </Typography>
                        </Box>
                        <Box sx={{ px: 2.5, pt: 2, pb: isYes ? 1 : 2 }}>
                          <YesNo value={ans.answer || null} onChange={v => setParqAnswer(q.id, "answer", v)} brand={brandColor} />
                        </Box>
                        {isYes && (
                          <Box sx={{ px: 2.5, pb: 2.5 }}>
                            <TextField fullWidth placeholder="Please provide details…" multiline minRows={2}
                              value={ans.details || ""} onChange={e => setParqAnswer(q.id, "details", e.target.value)}
                              sx={{ ...iSx, "& .MuiOutlinedInput-root": { ...iSx["& .MuiOutlinedInput-root"], bgcolor: "rgba(224,168,0,0.04)" } }}
                            />
                          </Box>
                        )}
                      </Paper>
                    );
                  })}
                </Stack>

                {/* Declaration */}
                <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: brandColor, mb: 2 }}>
                  Declaration
                </Typography>
                <Paper sx={{ bgcolor: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", p: 2.5, mb: 3 }}>
                  <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.85, mb: 2 }}>
                    I, <strong style={{ color: "rgba(255,255,255,0.75)" }}>{client?.customerName || "[your name]"}</strong>, confirm that I have answered all questions honestly. I understand that if my health changes so that I would answer YES to any question, I will inform my trainer before my next session.
                  </Typography>
                  <FormControlLabel
                    control={<Checkbox checked={parqAgreed} onChange={e => setParqAgreed(e.target.checked)} sx={{ color: "rgba(255,255,255,0.2)", "&.Mui-checked": { color: brandColor }, py: 0.5 }} />}
                    label={<Typography sx={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>I agree to the above declaration</Typography>}
                  />
                </Paper>

                {/* Signature */}
                <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: brandColor, mb: 1.5 }}>
                  Signature
                </Typography>
                <Typography sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", mb: 2, lineHeight: 1.6 }}>
                  Sign in the box below using your finger or mouse.
                </Typography>
                <Box sx={{ mb: 4 }}>
                  <SignaturePad brand={brandColor} onChange={setParqSignature} />
                </Box>

                {parqError && <Alert severity="error" sx={{ mb: 2, bgcolor: "#2a1a1a", color: "#ff8a80" }}>{parqError}</Alert>}

                <Button type="submit" fullWidth variant="contained" disabled={parqSaving}
                  sx={{ height: 48, bgcolor: brandColor, color: "#000", fontWeight: 700, fontSize: "0.88rem", borderRadius: "8px", "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" } }}
                >
                  {parqSaving ? <CircularProgress size={22} sx={{ color: "#000" }} /> : "Submit PAR-Q Form"}
                </Button>

                <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.18)", textAlign: "center", mt: 2, lineHeight: 1.6 }}>
                  This form is stored securely and only accessible to your trainer.
                </Typography>
              </Box>
            )}
          </Box>
        )}

      </Container>
    </Box>
  );
}
