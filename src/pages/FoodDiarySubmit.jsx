import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Container, Typography, TextField, Button, IconButton,
  Stack, Select, MenuItem, FormControl, InputLabel, CircularProgress,
  Collapse,
} from "@mui/material";
import AddIcon        from "@mui/icons-material/Add";
import DeleteIcon     from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ExpandMoreIcon  from "@mui/icons-material/ExpandMore";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

const SANS  = "'DM Sans', sans-serif";
const SERIF = "'Playfair Display', serif";

const DAYS  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Drink", "Other"];

const blankMeal = () => ({ id: `m-${Date.now()}-${Math.random()}`, time: "", type: "Breakfast", description: "", amount: "" });

function inputSx(brand) {
  return {
    "& .MuiInputLabel-root":             { color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" },
    "& .MuiInputLabel-root.Mui-focused":  { color: brand },
    "& .MuiOutlinedInput-root": {
      color: "#fff", borderRadius: 0,
      "& fieldset":             { borderColor: "rgba(255,255,255,0.12)" },
      "&:hover fieldset":       { borderColor: "rgba(255,255,255,0.28)" },
      "&.Mui-focused fieldset": { borderColor: brand },
    },
    "& .MuiSelect-icon": { color: "rgba(255,255,255,0.35)" },
  };
}

export default function FoodDiarySubmit() {
  const { trainerId } = useParams();
  const [trainer,    setTrainer]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [clientName, setClientName] = useState("");
  const [weekOf,     setWeekOf]     = useState("");
  const [dayMeals,   setDayMeals]   = useState(() => Object.fromEntries(DAYS.map(d => [d, []])));
  const [expanded,   setExpanded]   = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState("");

  const brand = trainer?.brandColor || "#C9A84C";
  const sx    = inputSx(brand);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "barbers", trainerId));
        if (snap.exists()) setTrainer(snap.data());
      } catch (e) { console.error(e); }
      finally     { setLoading(false); }
    }
    load();
  }, [trainerId]);

  function toggle(day) {
    setExpanded(p => ({ ...p, [day]: !p[day] }));
  }

  function addMeal(day) {
    setDayMeals(p => ({ ...p, [day]: [...p[day], blankMeal()] }));
    setExpanded(p => ({ ...p, [day]: true }));
  }

  function removeMeal(day, id) {
    setDayMeals(p => ({ ...p, [day]: p[day].filter(m => m.id !== id) }));
  }

  function updateMeal(day, id, field, val) {
    setDayMeals(p => ({ ...p, [day]: p[day].map(m => m.id === id ? { ...m, [field]: val } : m) }));
  }

  async function submit() {
    if (!clientName.trim()) { setError("Please enter your name."); return; }
    if (!weekOf)            { setError("Please select your week."); return; }
    const allEntries = DAYS.flatMap(d => dayMeals[d].map(m => ({ day: d, ...m })));
    if (allEntries.length === 0) { setError("Please add at least one meal or drink."); return; }
    setError("");
    setSubmitting(true);
    try {
      const entries = allEntries.map(({ id, ...rest }) => rest);
      await addDoc(collection(db, "barbers", trainerId, "foodDiarySubmissions"), {
        clientName: clientName.trim(),
        clientId:   new URLSearchParams(window.location.search).get("client") || null,
        weekOf,
        entries,
        submittedAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ color: "#C9A84C" }} thickness={2} size={50} />
      </Box>
    );
  }

  if (submitted) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
        <Box sx={{ textAlign: "center", maxWidth: 420 }}>
          <CheckCircleIcon sx={{ fontSize: 56, color: brand, mb: 2 }} />
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.8rem", fontWeight: 400, color: "#fff", mb: 1 }}>
            Diary submitted!
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.9rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
            Your food diary for the week of <strong style={{ color: "rgba(255,255,255,0.7)" }}>{weekOf}</strong> has been sent to your trainer.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "#0d0d0d", minHeight: "100vh", fontFamily: SANS }}>
      {/* Header */}
      <Box sx={{ borderBottom: `3px solid ${brand}`, bgcolor: "#111", py: { xs: 5, md: 7 }, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="md">
          {trainer?.businessName && (
            <Typography sx={{ fontFamily: SANS, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: brand, mb: 1.5 }}>
              {trainer.businessName}
            </Typography>
          )}
          <Typography sx={{ fontFamily: SERIF, fontWeight: 400, fontSize: { xs: "1.9rem", md: "2.6rem" }, color: "#fff", lineHeight: 1.1 }}>
            Weekly Food Diary
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.88rem", color: "rgba(255,255,255,0.38)", mt: 1, fontWeight: 300 }}>
            Log everything you ate and drank this week, including the time.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 7 }, px: { xs: 2, md: 5 } }}>
        {/* Name + Week */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 5 }}>
          <TextField
            fullWidth
            label="Your Name"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            sx={sx}
          />
          <TextField
            fullWidth
            label="Week of"
            type="date"
            value={weekOf}
            onChange={e => setWeekOf(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={sx}
          />
        </Stack>

        {/* Days */}
        <Stack spacing={1.5} sx={{ mb: 4 }}>
          {DAYS.map(day => {
            const meals   = dayMeals[day];
            const isOpen  = expanded[day];
            const hasMeals = meals.length > 0;
            return (
              <Box key={day} sx={{ border: "1px solid rgba(255,255,255,0.07)", bgcolor: "#111", overflow: "hidden" }}>
                {/* Day header */}
                <Box
                  onClick={() => (hasMeals || isOpen) && toggle(day)}
                  sx={{ display: "flex", alignItems: "center", px: 2.5, py: 1.8, cursor: hasMeals ? "pointer" : "default", borderBottom: isOpen ? "1px solid rgba(255,255,255,0.05)" : "none", transition: "background .15s", "&:hover": hasMeals ? { bgcolor: "rgba(255,255,255,0.02)" } : {} }}
                >
                  <Box sx={{ width: 3, height: 14, bgcolor: hasMeals ? brand : "rgba(255,255,255,0.12)", flexShrink: 0, mr: 1.5 }} />
                  <Typography sx={{ flex: 1, color: hasMeals ? "#fff" : "rgba(255,255,255,0.35)", fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                    {day}
                  </Typography>
                  {hasMeals && (
                    <Typography sx={{ color: "rgba(255,255,255,0.25)", fontSize: "0.7rem", mr: 1.5 }}>
                      {meals.length} item{meals.length !== 1 ? "s" : ""}
                    </Typography>
                  )}
                  <Button
                    size="small"
                    startIcon={<AddIcon sx={{ fontSize: "14px !important" }} />}
                    onClick={e => { e.stopPropagation(); addMeal(day); }}
                    sx={{ color: brand, fontWeight: 700, fontSize: "0.68rem", letterSpacing: "0.06em", px: 1.2, py: 0.5, minWidth: 0, "&:hover": { bgcolor: `${brand}12` } }}
                  >
                    Add
                  </Button>
                  {hasMeals && (
                    <ExpandMoreIcon sx={{ fontSize: 18, color: "rgba(255,255,255,0.3)", ml: 0.5, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                  )}
                </Box>

                {/* Meal rows */}
                <Collapse in={isOpen}>
                  <Box sx={{ p: 2 }}>
                    <Stack spacing={1.5}>
                      {meals.map(m => {
                        const isDrink = m.type === "Drink";
                        return (
                          <Box key={m.id} sx={{ bgcolor: "rgba(255,255,255,0.025)", p: 1.5 }}>
                            {/* Row 1: Time + Type + Delete */}
                            <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                              <TextField
                                label="Time"
                                type="time"
                                value={m.time}
                                onChange={e => updateMeal(day, m.id, "time", e.target.value)}
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                sx={{ ...sx, width: 120, flexShrink: 0 }}
                              />
                              <FormControl size="small" sx={{ ...sx, flex: 1 }}>
                                <InputLabel>Type</InputLabel>
                                <Select
                                  value={m.type}
                                  label="Type"
                                  onChange={e => updateMeal(day, m.id, "type", e.target.value)}
                                  MenuProps={{ PaperProps: { sx: { bgcolor: "#1a1a1a", color: "#fff", borderRadius: 0 } } }}
                                >
                                  {TYPES.map(t => (
                                    <MenuItem key={t} value={t} sx={{ fontSize: "0.84rem", "&:hover": { bgcolor: `${brand}20` }, "&.Mui-selected": { bgcolor: `${brand}30` } }}>{t}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <IconButton size="small" onClick={() => removeMeal(day, m.id)} sx={{ color: "rgba(255,255,255,0.2)", flexShrink: 0, "&:hover": { color: "#ff6b6b" } }}>
                                <DeleteIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Box>
                            {/* Row 2: Description + Amount */}
                            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                              <TextField
                                label={isDrink ? "What did you drink?" : "What did you eat?"}
                                value={m.description}
                                onChange={e => updateMeal(day, m.id, "description", e.target.value)}
                                size="small"
                                fullWidth
                                sx={sx}
                              />
                              <TextField
                                label={isDrink ? "How much?" : "Portion"}
                                placeholder={isDrink ? "e.g. 500ml, 2 glasses" : "e.g. 1 bowl, 200g"}
                                value={m.amount}
                                onChange={e => updateMeal(day, m.id, "amount", e.target.value)}
                                size="small"
                                InputLabelProps={{ shrink: m.amount ? true : undefined }}
                                sx={{ ...sx, width: 148, flexShrink: 0 }}
                              />
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Stack>

        {error && (
          <Typography sx={{ color: "#ff6b6b", fontSize: "0.82rem", mb: 2 }}>{error}</Typography>
        )}

        <Button
          fullWidth
          onClick={submit}
          disabled={submitting}
          sx={{ py: 1.9, bgcolor: brand, color: "#0d0d0d", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: 0, boxShadow: "none", "&:hover": { bgcolor: brand, filter: "brightness(1.1)" }, "&:disabled": { bgcolor: brand, opacity: 0.5 } }}
        >
          {submitting ? <CircularProgress size={20} sx={{ color: "#0d0d0d" }} /> : "Submit Diary"}
        </Button>
      </Container>
    </Box>
  );
}
