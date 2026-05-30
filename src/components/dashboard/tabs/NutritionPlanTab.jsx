import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper,
  IconButton,
  Tab,
  Tabs,
  LinearProgress,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import { getNutritionPlan, saveNutritionPlan, getCustomFoods, addCustomFood, deleteCustomFood, getClientsList } from "../../../firebase/firestore";
import foodDatabaseJson from "../../../data/foodDatabase.json";

const MACRO_COLORS = {
  protein: "#FF6B6B",
  carbs: "#4CAF50",
  fat: "#FFC107",
};

/**
 * Nutrition Plan Tab - Create and manage nutrition plans for clients
 * Features: Food database, macro tracking, custom foods, plan saving
 */
export default function NutritionPlanTab({ trainerId, bookings = [] }) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedClientName, setSelectedClientName] = useState("");
  const [clients, setClients] = useState([]);
  const [plan, setPlan] = useState(null);
  const [foodList, setFoodList] = useState(foodDatabaseJson.foods);
  const [customFoods, setCustomFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [addFoodDialogOpen, setAddFoodDialogOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [foodPortion, setFoodPortion] = useState("1");
  const [addCustomFoodDialogOpen, setAddCustomFoodDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [notes, setNotes] = useState("");
  const [editNotesMode, setEditNotesMode] = useState(false);

  const [customFoodForm, setCustomFoodForm] = useState({
    name: "",
    category: "Custom",
    servingSize: "100g",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    sugars: "",
  });

  const categories = [
    "all",
    ...new Set(foodDatabaseJson.foods.map((f) => f.category)),
  ];

  useEffect(() => {
    loadClients();
  }, [trainerId]);

  useEffect(() => {
    if (selectedClientId) {
      loadPlan();
      loadCustomFoods();
    }
  }, [trainerId, selectedClientId]);

  const loadClients = async () => {
    if (!trainerId) return;
    setLoading(true);
    try {
      const data = await getClientsList(trainerId);
      setClients(data || []);
      if (data && data.length > 0) {
        setSelectedClientId(data[0].id);
        setSelectedClientName(data[0].customerName);
      }
    } catch (err) {
      console.error("Error loading clients:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPlan = async () => {
    if (!trainerId || !clientId) return;
    setLoading(true);
    setError("");

    try {
      const existingPlan = await getNutritionPlan(trainerId, clientId);
      if (existingPlan) {
        setPlan(existingPlan);
        setNotes(existingPlan.notes || "");
      } else {
        setPlan({ foods: [], totals: {} });
      }
    } catch (err) {
      console.error("Error loading plan:", err);
      setError("Failed to load nutrition plan");
    } finally {
      setLoading(false);
    }
  };

  const loadCustomFoods = async () => {
    if (!trainerId) return;
    try {
      const foods = await getCustomFoods(trainerId);
      setCustomFoods(foods);
      setFoodList([...foodDatabaseJson.foods, ...foods]);
    } catch (err) {
      console.error("Error loading custom foods:", err);
    }
  };

  const handleAddCustomFood = async () => {
    if (!customFoodForm.name.trim()) {
      setError("Food name is required");
      return;
    }

    try {
      const newFood = await addCustomFood(trainerId, customFoodForm);
      setCustomFoods([...customFoods, newFood]);
      setFoodList([...foodList, newFood]);
      setCustomFoodForm({
        name: "",
        category: "Custom",
        servingSize: "100g",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
        fiber: "",
        sugars: "",
      });
      setAddCustomFoodDialogOpen(false);
      setError("");
    } catch (err) {
      setError("Failed to add custom food: " + err.message);
    }
  };

  const handleDeleteCustomFood = async (foodId) => {
    try {
      await deleteCustomFood(trainerId, foodId);
      const updated = customFoods.filter((f) => f.id !== foodId);
      setCustomFoods(updated);
      setFoodList(foodDatabaseJson.foods.concat(updated));
    } catch (err) {
      setError("Failed to delete food: " + err.message);
    }
  };

  const handleAddFoodToPlan = () => {
    if (!selectedFood || !foodPortion) return;

    const portion = parseFloat(foodPortion) || 1;
    const foodItem = {
      ...selectedFood,
      portion,
      calories: selectedFood.calories * portion,
      protein: selectedFood.protein * portion,
      carbs: selectedFood.carbs * portion,
      fat: selectedFood.fat * portion,
      fiber: selectedFood.fiber * portion,
      sugars: selectedFood.sugars * portion,
    };

    setPlan((prev) => ({
      ...prev,
      foods: [...(prev.foods || []), foodItem],
    }));

    setAddFoodDialogOpen(false);
    setSelectedFood(null);
    setFoodPortion("1");
  };

  const handleRemoveFood = (index) => {
    setPlan((prev) => ({
      ...prev,
      foods: prev.foods.filter((_, i) => i !== index),
    }));
  };

  const handleSavePlan = async () => {
    if (!trainerId || !clientId) return;

    setSaving(true);
    setError("");

    try {
      const totals = {
        calories: plan.foods.reduce((sum, f) => sum + f.calories, 0),
        protein: plan.foods.reduce((sum, f) => sum + f.protein, 0),
        carbs: plan.foods.reduce((sum, f) => sum + f.carbs, 0),
        fat: plan.foods.reduce((sum, f) => sum + f.fat, 0),
        fiber: plan.foods.reduce((sum, f) => sum + f.fiber, 0),
        sugars: plan.foods.reduce((sum, f) => sum + f.sugars, 0),
      };

      await saveNutritionPlan(trainerId, selectedClientId, {
        ...plan,
        totals,
        notes,
        clientName: selectedClientName,
      });

      setError("");
      // Could show success toast here
    } catch (err) {
      console.error("Error saving plan:", err);
      setError("Failed to save plan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredFoods = foodList.filter((food) => {
    const matchesSearch = food.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || food.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totals = {
    calories: plan?.foods?.reduce((sum, f) => sum + f.calories, 0) || 0,
    protein: plan?.foods?.reduce((sum, f) => sum + f.protein, 0) || 0,
    carbs: plan?.foods?.reduce((sum, f) => sum + f.carbs, 0) || 0,
    fat: plan?.foods?.reduce((sum, f) => sum + f.fat, 0) || 0,
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Client Selector */}
      {!selectedClientId && clients.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No clients found. Create bookings to get started with nutrition plans.
        </Alert>
      ) : (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <TextField
                select
                fullWidth
                label="Select Client"
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  const client = clients.find((c) => c.id === e.target.value);
                  setSelectedClientName(client?.customerName || "");
                }}
                disabled={loading}
              >
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.customerName} ({client.customerEmail})
                  </MenuItem>
                ))}
              </TextField>
            </CardContent>
          </Card>

          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {!loading && (
            <>
              {/* Header */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Typography variant="h5">
                  Nutrition Plan for {selectedClientName}
                </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSavePlan}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Plan"}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Tabs */}
        <Grid item xs={12}>
          <Paper>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
              <Tab label="Build Plan" />
              <Tab label="Manage Foods" />
            </Tabs>
          </Paper>
        </Grid>

        {/* Build Plan Tab */}
        {tabValue === 0 && (
          <>
            {/* Macro Summary */}
            {plan?.foods && plan.foods.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                      Daily Totals
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Calories
                          </Typography>
                          <Typography variant="h6">
                            {Math.round(totals.calories)}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box>
                          <Typography
                            variant="body2"
                            color="textSecondary"
                          >
                            Protein
                          </Typography>
                          <Typography variant="h6">
                            {totals.protein.toFixed(1)}g
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((totals.protein / 150) * 100, 100)}
                          sx={{
                            mt: 1,
                            bgcolor: "grey.300",
                            "& .MuiLinearProgress-bar": {
                              bgcolor: MACRO_COLORS.protein,
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box>
                          <Typography
                            variant="body2"
                            color="textSecondary"
                          >
                            Carbs
                          </Typography>
                          <Typography variant="h6">
                            {totals.carbs.toFixed(1)}g
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((totals.carbs / 300) * 100, 100)}
                          sx={{
                            mt: 1,
                            bgcolor: "grey.300",
                            "& .MuiLinearProgress-bar": {
                              bgcolor: MACRO_COLORS.carbs,
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box>
                          <Typography
                            variant="body2"
                            color="textSecondary"
                          >
                            Fat
                          </Typography>
                          <Typography variant="h6">
                            {totals.fat.toFixed(1)}g
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((totals.fat / 80) * 100, 100)}
                          sx={{
                            mt: 1,
                            bgcolor: "grey.300",
                            "& .MuiLinearProgress-bar": {
                              bgcolor: MACRO_COLORS.fat,
                            },
                          }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Foods in Plan */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle2">
                      Foods in Plan ({plan?.foods?.length || 0})
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => setAddFoodDialogOpen(true)}
                    >
                      Add Food
                    </Button>
                  </Box>

                  {!plan?.foods || plan.foods.length === 0 ? (
                    <Typography color="textSecondary">
                      No foods added yet. Click "Add Food" to start building the
                      plan.
                    </Typography>
                  ) : (
                    <Grid container spacing={1}>
                      {plan.foods.map((food, idx) => (
                        <Grid item xs={12} key={idx}>
                          <Paper
                            sx={{
                              p: 2,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2">
                                {food.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {(food.portion * 100).toFixed(0)}g ({food.servingSize})
                              </Typography>
                              <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                                <Chip
                                  label={`${Math.round(food.calories)} cal`}
                                  size="small"
                                  variant="outlined"
                                />
                                <Chip
                                  label={`${food.protein.toFixed(1)}g P`}
                                  size="small"
                                  sx={{
                                    bgcolor: MACRO_COLORS.protein,
                                    color: "white",
                                  }}
                                />
                                <Chip
                                  label={`${food.carbs.toFixed(1)}g C`}
                                  size="small"
                                  sx={{
                                    bgcolor: MACRO_COLORS.carbs,
                                    color: "white",
                                  }}
                                />
                                <Chip
                                  label={`${food.fat.toFixed(1)}g F`}
                                  size="small"
                                  sx={{
                                    bgcolor: MACRO_COLORS.fat,
                                    color: "white",
                                  }}
                                />
                              </Box>
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveFood(idx)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle2">Notes for Client</Typography>
                    <IconButton
                      size="small"
                      onClick={() => setEditNotesMode(!editNotesMode)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Box>
                  {editNotesMode ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes, tips, or guidance for your client..."
                      variant="outlined"
                    />
                  ) : (
                    <Typography variant="body2">
                      {notes || "No notes added yet."}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Manage Foods Tab */}
        {tabValue === 1 && (
          <>
            {/* Add Custom Food */}
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<AddIcon />}
                onClick={() => setAddCustomFoodDialogOpen(true)}
              >
                Add Custom Food
              </Button>
            </Grid>

            {/* Search & Filter */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                placeholder="Search foods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: "grey.500" }} />,
                }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                size="small"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </TextField>
            </Grid>

            {/* Foods Grid */}
            <Grid item xs={12}>
              <Grid container spacing={1}>
                {filteredFoods.map((food) => (
                  <Grid item xs={12} sm={6} md={4} key={food.id || food.name}>
                    <Paper
                      sx={{
                        p: 1.5,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        "&:hover": { boxShadow: 3, transform: "translateY(-2px)" },
                      }}
                      onClick={() => {
                        setSelectedFood(food);
                        setAddFoodDialogOpen(true);
                      }}
                    >
                      <Typography variant="subtitle2">{food.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {food.servingSize}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
                        <Chip
                          label={`${food.calories} cal`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`${food.protein}g P`}
                          size="small"
                          sx={{ bgcolor: MACRO_COLORS.protein, color: "white" }}
                        />
                        <Chip
                          label={`${food.carbs}g C`}
                          size="small"
                          sx={{ bgcolor: MACRO_COLORS.carbs, color: "white" }}
                        />
                      </Box>
                      {customFoods.some((cf) => cf.id === food.id) && (
                        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                          <Button
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomFood(food.id);
                            }}
                          >
                            Delete
                          </Button>
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </>
        )}
      </Grid>

      {/* Add Food Dialog */}
      <Dialog
        open={addFoodDialogOpen}
        onClose={() => setAddFoodDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedFood ? `Add ${selectedFood.name}` : "Select Food"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedFood ? (
            <>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Serving Size: {selectedFood.servingSize}
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Number of Servings"
                value={foodPortion}
                onChange={(e) => setFoodPortion(e.target.value)}
                inputProps={{ step: 0.5, min: 0.5 }}
                margin="normal"
              />
              <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                Macros (per serving × {foodPortion}):
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Calories
                    </Typography>
                    <Typography variant="body2">
                      {(selectedFood.calories * parseFloat(foodPortion)).toFixed(0)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Protein
                    </Typography>
                    <Typography variant="body2">
                      {(selectedFood.protein * parseFloat(foodPortion)).toFixed(1)}g
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Carbs
                    </Typography>
                    <Typography variant="body2">
                      {(selectedFood.carbs * parseFloat(foodPortion)).toFixed(1)}g
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Fat
                    </Typography>
                    <Typography variant="body2">
                      {(selectedFood.fat * parseFloat(foodPortion)).toFixed(1)}g
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </>
          ) : (
            <Typography>Please select a food first.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddFoodDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddFoodToPlan}
            variant="contained"
            disabled={!selectedFood}
          >
            Add to Plan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Custom Food Dialog */}
      <Dialog
        open={addCustomFoodDialogOpen}
        onClose={() => setAddCustomFoodDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Custom Food</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Food Name"
            value={customFoodForm.name}
            onChange={(e) =>
              setCustomFoodForm({ ...customFoodForm, name: e.target.value })
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Category"
            value={customFoodForm.category}
            onChange={(e) =>
              setCustomFoodForm({ ...customFoodForm, category: e.target.value })
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Serving Size"
            value={customFoodForm.servingSize}
            onChange={(e) =>
              setCustomFoodForm({
                ...customFoodForm,
                servingSize: e.target.value,
              })
            }
            margin="normal"
          />
          <Grid container spacing={1} sx={{ mt: 1 }}>
            {["calories", "protein", "carbs", "fat", "fiber", "sugars"].map(
              (macro) => (
                <Grid item xs={6} key={macro}>
                  <TextField
                    fullWidth
                    type="number"
                    label={macro.charAt(0).toUpperCase() + macro.slice(1)}
                    value={customFoodForm[macro]}
                    onChange={(e) =>
                      setCustomFoodForm({
                        ...customFoodForm,
                        [macro]: e.target.value,
                      })
                    }
                    inputProps={{ step: 0.1 }}
                    size="small"
                  />
                </Grid>
              )
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddCustomFoodDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddCustomFood}
            variant="contained"
            color="primary"
          >
            Add Food
          </Button>
        </DialogActions>
      </Dialog>
            </>
          )}
        </>
      )}
    </Box>
  );
}
