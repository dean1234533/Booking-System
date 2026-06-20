import React, { useState, useMemo } from "react";
import {
  Box, TextField, Button, Grid, Paper, Typography, Chip,
  Dialog, DialogTitle, DialogContent, Stack, Alert, CircularProgress,
} from "@mui/material";
import { Favorite as FavoriteIcon, FavoriteBorder as FavoriteBorderIcon } from "@mui/icons-material";
import exercisesData from "../../../data/exercises.json";
import { generateStickFigureSVG } from "../../../utils/generateStickFigure";
import { saveFavoriteExercise, deleteFavoriteExercise, getFavoriteExercises } from "../../../firebase/firestore";

const BODY_PARTS = ["Legs", "Arms", "Back", "Chest", "Shoulders", "Core", "Glutes", "Cardio"];
const CATEGORIES = [
  { key: "exercises", label: "Exercises", color: "#2196F3" },
  { key: "warmups", label: "Warm-ups", color: "#FF9800" },
  { key: "stretches", label: "Stretches", color: "#4CAF50" },
  { key: "cooldowns", label: "Cool-downs", color: "#9C27B0" },
];

export default function ExerciseGeneratorTab({ barber, brandColor, profile }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState(null); // null = all, or set of category keys
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  // Load favorites on mount
  React.useEffect(() => {
    loadFavorites();
  }, [barber?.uid]);

  const loadFavorites = async () => {
    if (!barber?.uid) {
      setLoadingFavorites(false);
      return;
    }
    try {
      const favs = await getFavoriteExercises(barber.uid);
      setFavorites(favs);
    } catch (err) {
      console.error("Error loading favorites:", err);
    } finally {
      setLoadingFavorites(false);
    }
  };

  // Filter exercises based on search and category
  const filteredExercises = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const results = [];
    const bodyPartKey = searchTerm.toLowerCase();

    // Search for matching body parts (case insensitive)
    BODY_PARTS.forEach((bp) => {
      if (bp.toLowerCase().includes(bodyPartKey)) {
        const exercises = exercisesData[bp.toLowerCase()];
        if (exercises) {
          Object.entries(exercises).forEach(([category, categoryExercises]) => {
            if (!selectedCategories || selectedCategories.has(category)) {
              categoryExercises.forEach((exercise) => {
                results.push({
                  ...exercise,
                  bodyPart: bp.toLowerCase(),
                  category: category.replace("warmups", "warmup").replace("cooldowns", "cooldown"),
                });
              });
            }
          });
        }
      }
    });

    return results;
  }, [searchTerm, selectedCategories]);

  const handleToggleCategory = (categoryKey) => {
    setSelectedCategories((prev) => {
      if (!prev) {
        return new Set([categoryKey]);
      }
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
        return next.size === 0 ? null : next;
      } else {
        next.add(categoryKey);
        return next;
      }
    });
  };

  const handleSaveFavorite = async (exercise) => {
    if (!barber?.uid) {
      setSaveMessage({ type: "error", text: "User not logged in" });
      return;
    }

    setSavingFavorite(true);
    setSaveMessage(null);

    try {
      const isFavorite = favorites.some((f) => f.id === exercise.id);
      if (isFavorite) {
        await deleteFavoriteExercise(barber.uid, exercise.id);
        setFavorites((prev) => prev.filter((f) => f.id !== exercise.id));
        setSaveMessage({ type: "success", text: "Removed from favorites" });
      } else {
        await saveFavoriteExercise(barber.uid, exercise);
        setFavorites((prev) => [...prev, exercise]);
        setSaveMessage({ type: "success", text: "Added to favorites" });
      }
    } catch (err) {
      console.error("Error saving favorite:", err);
      setSaveMessage({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setSavingFavorite(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const getCategoryColor = (category) => {
    return CATEGORIES.find((c) => c.key === category)?.color || "#999";
  };

  const isFavorite = (exercise) => favorites.some((f) => f.id === exercise.id);

  const svgMarkup = selectedExercise ? generateStickFigureSVG(selectedExercise.svgType) : null;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
          Exercise Generator
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Search for a body part to discover exercises, warm-ups, stretches, and cool-downs.
        </Typography>

        {/* Search Input */}
        <TextField
          fullWidth
          placeholder="Search body part (legs, arms, back, chest, etc.)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ mb: 2 }}
        />

        {/* Category Filters */}
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          {CATEGORIES.map((category) => (
            <Chip
              key={category.key}
              label={category.label}
              onClick={() => handleToggleCategory(category.key)}
              variant={selectedCategories?.has(category.key) ? "filled" : "outlined"}
              sx={{
                bgcolor: selectedCategories?.has(category.key) ? category.color : "transparent",
                color: selectedCategories?.has(category.key) ? "#fff" : "text.primary",
                borderColor: category.color,
                cursor: "pointer",
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Save Message */}
      {saveMessage && (
        <Alert severity={saveMessage.type} sx={{ mb: 2 }} onClose={() => setSaveMessage(null)}>
          {saveMessage.text}
        </Alert>
      )}

      {/* Results Grid */}
      {searchTerm.trim() ? (
        filteredExercises.length > 0 ? (
          <Grid container spacing={2}>
            {filteredExercises.map((exercise) => (
              <Grid item xs={12} sm={6} md={4} key={exercise.id}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: `1px solid #e0e0e0`,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      transform: "translateY(-2px)",
                    },
                  }}
                  onClick={() => setSelectedExercise(exercise)}
                >
                  {/* Category Badge */}
                  <Chip
                    label={exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1)}
                    size="small"
                    sx={{
                      bgcolor: getCategoryColor(exercise.category),
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.7rem",
                      mb: 1,
                    }}
                  />

                  {/* Exercise Name */}
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                    {exercise.name}
                  </Typography>

                  {/* Difficulty & Sets/Reps */}
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip
                      label={exercise.difficulty}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: "24px",
                        fontSize: "0.75rem",
                        borderColor:
                          exercise.difficulty === "beginner"
                            ? "#4CAF50"
                            : exercise.difficulty === "intermediate"
                            ? "#FF9800"
                            : "#F44336",
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
                      {exercise.setsReps}
                    </Typography>
                  </Stack>

                  {/* Description */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, minHeight: "40px" }}>
                    {exercise.description}
                  </Typography>

                  {/* Favorite Button */}
                  <Button
                    fullWidth
                    size="small"
                    variant="outlined"
                    startIcon={
                      isFavorite(exercise) ? (
                        <FavoriteIcon sx={{ color: brandColor }} />
                      ) : (
                        <FavoriteBorderIcon />
                      )
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveFavorite(exercise);
                    }}
                    disabled={savingFavorite}
                    sx={{
                      borderColor: isFavorite(exercise) ? brandColor : "#ddd",
                      color: isFavorite(exercise) ? brandColor : "text.secondary",
                      fontWeight: 600,
                    }}
                  >
                    {isFavorite(exercise) ? "Saved" : "Add to Favorites"}
                  </Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper sx={{ p: 4, textAlign: "center", bgcolor: "rgba(255,255,255,0.04)" }}>
            <Typography color="text.secondary">No exercises found for "{searchTerm}"</Typography>
          </Paper>
        )
      ) : (
        <Paper sx={{ p: 4, textAlign: "center", bgcolor: "rgba(255,255,255,0.04)" }}>
          <Typography color="text.secondary">Enter a body part to get started</Typography>
        </Paper>
      )}

      {/* Exercise Detail Modal */}
      <Dialog
        open={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        {selectedExercise && (
          <>
            <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid #e0e0e0" }}>
              {selectedExercise.name}
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              {/* Category & Difficulty */}
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip
                  label={selectedExercise.category.toUpperCase()}
                  sx={{ bgcolor: getCategoryColor(selectedExercise.category), color: "#fff" }}
                />
                <Chip label={selectedExercise.difficulty} variant="outlined" />
              </Stack>

              {/* Sets/Reps */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                <strong>Sets/Reps:</strong> {selectedExercise.setsReps}
              </Typography>

              {/* Description */}
              <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.8 }}>
                {selectedExercise.description}
              </Typography>

              {/* Muscles Worked */}
              {selectedExercise.muscles && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    MUSCLES WORKED
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                    {selectedExercise.muscles.map((muscle) => (
                      <Chip key={muscle} label={muscle} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Form Cues */}
              {selectedExercise.cues && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    FORM CUES
                  </Typography>
                  <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px", fontSize: "0.875rem" }}>
                    {selectedExercise.cues.map((cue) => (
                      <li key={cue}>{cue}</li>
                    ))}
                  </ul>
                </Box>
              )}

              {/* Stick Figure Animation */}
              {svgMarkup && (
                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: "rgba(255,255,255,0.03)",
                    borderRadius: 1,
                    border: "1px solid #e0e0e0",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 1 }}>
                    EXERCISE DEMO
                  </Typography>
                  <div
                    dangerouslySetInnerHTML={{ __html: svgMarkup }}
                    style={{
                      maxHeight: "200px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  />
                </Box>
              )}

              {/* Favorite Button */}
              <Button
                fullWidth
                variant="contained"
                startIcon={
                  isFavorite(selectedExercise) ? (
                    <FavoriteIcon />
                  ) : (
                    <FavoriteBorderIcon />
                  )
                }
                onClick={() => handleSaveFavorite(selectedExercise)}
                disabled={savingFavorite}
                sx={{
                  bgcolor: isFavorite(selectedExercise) ? brandColor : "#999",
                  "&:hover": { bgcolor: brandColor },
                }}
              >
                {savingFavorite ? (
                  <CircularProgress size={20} color="inherit" />
                ) : isFavorite(selectedExercise) ? (
                  "Remove from Favorites"
                ) : (
                  "Add to Favorites"
                )}
              </Button>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
