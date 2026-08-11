import React, { useState, useMemo } from "react";
import {
  Box, Typography, Chip, Grid, Card, CardContent,
  Tabs, Tab, TextField, MenuItem, Divider, Accordion, AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  GOALS, MEAL_TYPES, FOOD_DATA,
  NUTRITION_GUIDE, BMI_CATEGORIES, BODY_TYPES,
} from "../data/foodGeneratorData";

const macroBar = (val, max, color) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
    <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: "#2a2a2a", overflow: "hidden" }}>
      <Box sx={{ width: `${Math.min((val / max) * 100, 100)}%`, height: "100%", bgcolor: color, borderRadius: 3, transition: "width .3s" }} />
    </Box>
    <Typography variant="caption" sx={{ color: "#aaa", minWidth: 26, textAlign: "right" }}>{val}g</Typography>
  </Box>
);

function FoodCard({ food, color }) {
  return (
    <Card sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 2, height: "100%", transition: "border-color .2s", "&:hover": { borderColor: color } }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Typography variant="body2" fontWeight={700} sx={{ color: "#fff", mb: 0.5, lineHeight: 1.3 }}>{food.name}</Typography>
        <Typography variant="caption" sx={{ color: "#777", display: "block", mb: 1.5, lineHeight: 1.4 }}>{food.desc}</Typography>
        <Box sx={{ pt: 1, borderTop: "1px solid #2a2a2a" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="caption" sx={{ color, fontWeight: 800 }}>{food.cal} kcal</Typography>
          </Box>
          {macroBar(food.p, 60, "#5b9bd5")}
          {macroBar(food.c, 100, "#f5a623")}
          {macroBar(food.f, 40, "#e05c5c")}
          <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
            {[["P", food.p, "#5b9bd5"], ["C", food.c, "#f5a623"], ["F", food.f, "#e05c5c"]].map(([l, v, c]) => (
              <Typography key={l} variant="caption" sx={{ color: c, opacity: 0.8, fontSize: "0.65rem" }}>{l}: {v}g</Typography>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function GuideSection({ section }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography variant="h3" sx={{ lineHeight: 1 }}>{section.icon}</Typography>
        <Typography variant="h6" fontWeight={800} sx={{ color: "#fff" }}>{section.title}</Typography>
      </Box>
      <Typography variant="body2" sx={{ color: "#bbb", mb: 3, lineHeight: 1.7 }}>{section.intro}</Typography>
      {section.points.map((pt, i) => (
        <Accordion key={i} disableGutters sx={{ bgcolor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px !important", mb: 1, "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#888" }} />}>
            <Typography variant="body2" fontWeight={700} sx={{ color: "#ddd" }}>{pt.heading}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ color: "#aaa", lineHeight: 1.8 }}>{pt.body}</Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

export default function FoodGeneratorContent({ brandColor = "#C9A84C" }) {
  const [goal,         setGoal]         = useState("weight-loss");
  const [mealTab,      setMealTab]      = useState(0);
  const [gender,       setGender]       = useState("male");
  const [weight,       setWeight]       = useState("");
  const [height,       setHeight]       = useState("");
  const [age,          setAge]          = useState("");
  const [activity,     setActivity]     = useState("moderate");
  const [guideSection, setGuideSection] = useState(0);

  const macroCalc = useMemo(() => {
    const w = parseFloat(weight), h = parseFloat(height), a = parseInt(age);
    if (!w || !h || !a || w < 30 || w > 300 || h < 100 || h > 250 || a < 10 || a > 100) return null;

    const bmr = gender === "male"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;

    const actMap = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very: 1.9 };
    const tdee = Math.round(bmr * (actMap[activity] || 1.55));

    const selectedGoal = GOALS.find(g => g.id === goal) || GOALS[0];
    const { protein: pPct, carbs: cPct, fat: fPct } = selectedGoal.macroSplit;
    const adjustment = goal === "bulking" ? 400 : goal === "weight-loss" ? -400 : -150;
    const targetCal = tdee + adjustment;

    const bmi = parseFloat((w / ((h / 100) ** 2)).toFixed(1));
    const bmiCategory = BMI_CATEGORIES.find(b => {
      if (b.range.startsWith("<")) return bmi < 18.5;
      if (b.range.startsWith("30")) return bmi >= 30;
      const [lo, hi] = b.range.split("–").map(Number);
      return bmi >= lo && bmi <= hi;
    });

    const water = Math.round(w * 40 + (activity === "active" || activity === "very" ? 800 : activity === "moderate" ? 500 : 0));

    return {
      bmr: Math.round(bmr), tdee, targetCal,
      protein:  Math.round(targetCal * (pPct / 100) / 4),
      carbs:    Math.round(targetCal * (cPct / 100) / 4),
      fat:      Math.round(targetCal * (fPct / 100) / 9),
      bmi, bmiCategory,
      waterL: (water / 1000).toFixed(1),
    };
  }, [weight, height, age, gender, activity, goal]);

  const selectedGoal  = GOALS.find(g => g.id === goal) || GOALS[0];
  const foods         = (FOOD_DATA[goal] || {})[MEAL_TYPES[mealTab]?.id] || [];
  const guideSections = [
    NUTRITION_GUIDE.preWorkout, NUTRITION_GUIDE.postWorkout, NUTRITION_GUIDE.breakfast,
    NUTRITION_GUIDE.lateNight,  NUTRITION_GUIDE.hydration,   NUTRITION_GUIDE.shakesForBusy,
  ];

  const fieldSx = {
    "& .MuiInputLabel-root":             { color: "#666" },
    "& .MuiInputLabel-root.Mui-focused": { color: brandColor },
    "& .MuiOutlinedInput-root": {
      color: "#fff",
      "& fieldset":             { borderColor: "#333" },
      "&:hover fieldset":       { borderColor: "#555" },
      "&.Mui-focused fieldset": { borderColor: brandColor },
    },
    "& .MuiSelect-icon": { color: "#666" },
  };

  return (
    <Box sx={{ color: "#fff", fontFamily: "'Inter', sans-serif" }}>

      {/* Goal Selection */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>Choose Your Goal</Typography>
        <Typography variant="body2" sx={{ color: "#777", mb: 3 }}>
          Select a goal to personalise your food recommendations, calorie targets, and macro splits.
        </Typography>
        <Grid container spacing={2}>
          {GOALS.map(g => (
            <Grid item xs={12} sm={4} key={g.id}>
              <Card
                onClick={() => setGoal(g.id)}
                sx={{
                  cursor: "pointer",
                  bgcolor: goal === g.id ? "#1a1a1a" : "#111",
                  border: `2px solid ${goal === g.id ? g.color : "#222"}`,
                  borderRadius: 3, transition: "all .2s",
                  "&:hover": { borderColor: g.color },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h4" sx={{ mb: 0.5 }}>{g.emoji}</Typography>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ color: goal === g.id ? g.color : "#fff" }}>{g.label}</Typography>
                  <Typography variant="caption" sx={{ color: "#777", lineHeight: 1.5, display: "block", mt: 0.5 }}>{g.tagline}</Typography>
                  {goal === g.id && (
                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid #2a2a2a" }}>
                      <Typography variant="caption" sx={{ color: g.color }}>{g.calNote}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Calculator */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>Your Personal Calculator</Typography>
        <Typography variant="body2" sx={{ color: "#777", mb: 3 }}>
          Enter your details to get exact calorie and macro targets, your BMI, and daily water intake.
        </Typography>
        <Card sx={{ bgcolor: "#111", border: "1px solid #222", borderRadius: 3, p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <TextField select fullWidth label="Gender" size="small" value={gender} onChange={e => setGender(e.target.value)} sx={fieldSx}>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <TextField fullWidth label="Weight (kg)" size="small" type="number" value={weight} onChange={e => setWeight(e.target.value)} sx={fieldSx} />
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <TextField fullWidth label="Height (cm)" size="small" type="number" value={height} onChange={e => setHeight(e.target.value)} sx={fieldSx} />
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <TextField fullWidth label="Age" size="small" type="number" value={age} onChange={e => setAge(e.target.value)} sx={fieldSx} />
            </Grid>
            <Grid item xs={6} sm={3} md={4}>
              <TextField select fullWidth label="Activity Level" size="small" value={activity} onChange={e => setActivity(e.target.value)} sx={fieldSx}>
                <MenuItem value="sedentary">Sedentary (desk job, no exercise)</MenuItem>
                <MenuItem value="light">Light (1–2 days/week)</MenuItem>
                <MenuItem value="moderate">Moderate (3–5 days/week)</MenuItem>
                <MenuItem value="active">Active (6–7 days/week)</MenuItem>
                <MenuItem value="very">Very Active (physical job + training)</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          {macroCalc ? (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ borderColor: "#222", mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" sx={{ color: "#555", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Daily Calories</Typography>
                  <Box sx={{ display: "flex", gap: 2, mt: 1.5, flexWrap: "wrap" }}>
                    {[["Maintenance", macroCalc.tdee, "#777"], ["Your Target", macroCalc.targetCal, brandColor]].map(([l, v, c]) => (
                      <Box key={l} sx={{ textAlign: "center" }}>
                        <Typography variant="h4" fontWeight={900} sx={{ color: c, lineHeight: 1 }}>{v.toLocaleString()}</Typography>
                        <Typography variant="caption" sx={{ color: "#555" }}>{l}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" sx={{ color: "#555", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Daily Macros</Typography>
                  <Box sx={{ mt: 1.5 }}>
                    {[
                      ["Protein", macroCalc.protein, "#5b9bd5", selectedGoal.macroSplit.protein],
                      ["Carbs",   macroCalc.carbs,   "#f5a623", selectedGoal.macroSplit.carbs],
                      ["Fat",     macroCalc.fat,     "#e05c5c", selectedGoal.macroSplit.fat],
                    ].map(([l, v, c, pct]) => (
                      <Box key={l} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.8 }}>
                        <Typography variant="caption" sx={{ color: "#777", width: 48 }}>{l}</Typography>
                        <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: "#1e1e1e" }}>
                          <Box sx={{ width: `${pct}%`, height: "100%", bgcolor: c, borderRadius: 3 }} />
                        </Box>
                        <Typography variant="caption" sx={{ color: c, fontWeight: 700, width: 52 }}>{v}g · {pct}%</Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" sx={{ color: "#555", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>BMI & Hydration</Typography>
                  <Box sx={{ mt: 1.5, display: "flex", gap: 3, flexWrap: "wrap" }}>
                    <Box>
                      <Typography variant="h4" fontWeight={900} sx={{ color: macroCalc.bmiCategory?.color || "#fff", lineHeight: 1 }}>{macroCalc.bmi}</Typography>
                      <Typography variant="caption" sx={{ color: macroCalc.bmiCategory?.color || "#555" }}>{macroCalc.bmiCategory?.label || "BMI"}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h4" fontWeight={900} sx={{ color: "#4caf80", lineHeight: 1 }}>{macroCalc.waterL}L</Typography>
                      <Typography variant="caption" sx={{ color: "#555" }}>Daily Water</Typography>
                    </Box>
                  </Box>
                  {macroCalc.bmiCategory && (
                    <Typography variant="caption" sx={{ color: "#666", display: "block", mt: 1.5, lineHeight: 1.6 }}>
                      {macroCalc.bmiCategory.tip}
                    </Typography>
                  )}
                </Grid>
              </Grid>
              <Box sx={{ mt: 2, p: 1.5, bgcolor: "#0d0d0d", borderRadius: 2, borderLeft: `3px solid ${selectedGoal.color}` }}>
                <Typography variant="caption" sx={{ color: "#888", lineHeight: 1.6 }}>
                  <b style={{ color: selectedGoal.color }}>{selectedGoal.label}</b> split — Protein {selectedGoal.macroSplit.protein}% · Carbs {selectedGoal.macroSplit.carbs}% · Fat {selectedGoal.macroSplit.fat}%
                  &nbsp;|&nbsp; BMR: {macroCalc.bmr} kcal · TDEE: {macroCalc.tdee} kcal
                </Typography>
              </Box>
            </Box>
          ) : (
            <Typography variant="caption" sx={{ color: "#444", display: "block", mt: 2 }}>Fill in all fields above to calculate your personalised targets.</Typography>
          )}
        </Card>
      </Box>

      {/* Body Types */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>Body Types — Know Your Blueprint</Typography>
        <Typography variant="body2" sx={{ color: "#777", mb: 3 }}>
          Understanding your body type helps you set realistic expectations and tailor your approach.
        </Typography>
        <Grid container spacing={2}>
          {BODY_TYPES.map(bt => (
            <Grid item xs={12} md={4} key={bt.type}>
              <Card sx={{ bgcolor: "#111", border: "1px solid #222", borderRadius: 2, height: "100%" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ color: brandColor, mb: 0.5 }}>{bt.type}</Typography>
                  <Typography variant="caption" sx={{ color: "#777", display: "block", mb: 1.5 }}>{bt.desc}</Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 2 }}>
                    {bt.traits.map(t => <Chip key={t} label={t} size="small" sx={{ bgcolor: "#1e1e1e", color: "#aaa", fontSize: "0.65rem", height: 20 }} />)}
                  </Box>
                  <Typography variant="caption" sx={{ color: "#888", lineHeight: 1.7, display: "block" }}>{bt.advice}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Food Menu */}
      <Box sx={{ mb: 5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 0.5, flexWrap: "wrap" }}>
          <Typography variant="h5" fontWeight={900}>{selectedGoal.emoji} {selectedGoal.label} — Food Guide</Typography>
          <Chip label={`${foods.length} options`} size="small" sx={{ bgcolor: selectedGoal.color, color: "#fff", fontWeight: 700 }} />
        </Box>
        <Typography variant="body2" sx={{ color: "#777", mb: 3 }}>25 realistic, easy-to-make options per meal category.</Typography>
        <Tabs
          value={mealTab} onChange={(_, v) => setMealTab(v)}
          variant="scrollable" scrollButtons="auto"
          sx={{
            mb: 3,
            "& .MuiTab-root": { color: "#555", textTransform: "none", fontWeight: 700, minHeight: 44 },
            "& .Mui-selected": { color: `${selectedGoal.color} !important` },
            "& .MuiTabs-indicator": { bgcolor: selectedGoal.color },
          }}
        >
          {MEAL_TYPES.map(mt => <Tab key={mt.id} label={`${mt.emoji} ${mt.label}`} />)}
        </Tabs>
        <Grid container spacing={1.5}>
          {foods.map((food, i) => <Grid item xs={12} sm={6} md={4} lg={3} key={i}><FoodCard food={food} color={selectedGoal.color} /></Grid>)}
        </Grid>
        <Box sx={{ mt: 2, p: 1.5, bgcolor: "#0d0d0d", borderRadius: 2, border: "1px solid #1e1e1e" }}>
          <Typography variant="caption" sx={{ color: "#555" }}>
            🔵 Protein &nbsp;·&nbsp; 🟡 Carbs &nbsp;·&nbsp; 🔴 Fat &nbsp;·&nbsp; Macros are per typical serving.
          </Typography>
        </Box>
      </Box>

      {/* Nutrition Guides */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>Nutrition Guides</Typography>
        <Typography variant="body2" sx={{ color: "#777", mb: 3 }}>Evidence-based advice on timing, hydration, late-night eating, and more.</Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
          {guideSections.map((s, i) => (
            <Chip key={i} label={`${s.icon} ${s.title}`} onClick={() => setGuideSection(i)}
              sx={{ bgcolor: guideSection === i ? brandColor : "#1a1a1a", color: guideSection === i ? "#fff" : "#888", fontWeight: 700, cursor: "pointer", border: "1px solid", borderColor: guideSection === i ? brandColor : "#2a2a2a", transition: "all .2s" }} />
          ))}
        </Box>
        <Card sx={{ bgcolor: "#111", border: "1px solid #222", borderRadius: 3, p: { xs: 2, md: 3 } }}>
          <GuideSection section={guideSections[guideSection]} />
        </Card>
      </Box>

      {/* Drinks Guide */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>☕ What to Drink — Complete Guide</Typography>
        <Typography variant="body2" sx={{ color: "#777", mb: 3 }}>The pros, cons, and honest verdicts on every drink you might reach for.</Typography>
        <Grid container spacing={2}>
          {NUTRITION_GUIDE.drinksGuide.map((drink, i) => (
            <Grid item xs={12} md={6} key={i}>
              <Card sx={{ bgcolor: "#111", border: `1px solid ${drink.color}22`, borderRadius: 2, height: "100%" }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#fff" }}>{drink.name}</Typography>
                    <Chip label={drink.rating} size="small" sx={{ bgcolor: `${drink.color}22`, color: drink.color, fontWeight: 700, fontSize: "0.65rem", height: 20 }} />
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    {drink.pros.map((p, j) => <Typography key={j} variant="caption" sx={{ color: "#4caf80", display: "block", lineHeight: 1.6 }}>✓ {p}</Typography>)}
                  </Box>
                  <Box sx={{ mb: 1.5 }}>
                    {drink.cons.map((c, j) => <Typography key={j} variant="caption" sx={{ color: "#e05c5c", display: "block", lineHeight: 1.6 }}>✗ {c}</Typography>)}
                  </Box>
                  <Box sx={{ p: 1.5, bgcolor: "#0d0d0d", borderRadius: 1.5, borderLeft: `3px solid ${drink.color}` }}>
                    <Typography variant="caption" sx={{ color: "#aaa", lineHeight: 1.6 }}><b style={{ color: drink.color }}>Verdict: </b>{drink.verdict}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* BMI Reference */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>BMI Reference Guide</Typography>
        <Typography variant="body2" sx={{ color: "#777", mb: 3 }}>
          BMI is a useful screening tool, not a definitive health measure.
        </Typography>
        <Grid container spacing={2}>
          {BMI_CATEGORIES.map(cat => (
            <Grid item xs={12} sm={6} md={3} key={cat.label}>
              <Card sx={{ bgcolor: "#111", border: `2px solid ${cat.color}44`, borderRadius: 2, height: "100%" }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ color: cat.color }}>{cat.label}</Typography>
                    <Chip label={`BMI ${cat.range}`} size="small" sx={{ bgcolor: `${cat.color}22`, color: cat.color, fontSize: "0.62rem", height: 18 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: "#777", lineHeight: 1.7 }}>{cat.tip}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Typography variant="caption" sx={{ color: "#333", display: "block", textAlign: "center", pt: 2, borderTop: "1px solid #1e1e1e" }}>
        Nutritional figures are estimates for guidance only. Consult a registered nutritionist or dietitian for medical advice.
      </Typography>
    </Box>
  );
}
