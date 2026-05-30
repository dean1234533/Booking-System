import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import { logActivity, getClientActivities } from "../../../firebase/firestore";

/**
 * Client Activity Tab - Log and track client workouts and activities
 */
export default function ClientActivityTab({ trainerId, clientId, clientName }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().split(" ")[0].slice(0, 5),
    type: "Cardio",
    duration: "",
    intensity: "Medium",
    caloriesBurned: "",
    notes: "",
  });

  const activityTypes = [
    "Cardio",
    "Strength",
    "Flexibility",
    "Sports",
    "Walking",
    "Running",
    "Cycling",
    "Swimming",
    "HIIT",
    "Pilates",
    "Yoga",
    "Other",
  ];

  const intensityLevels = ["Low", "Medium", "High"];

  useEffect(() => {
    loadActivities();
  }, [trainerId, clientId]);

  const loadActivities = async () => {
    if (!trainerId || !clientId) return;

    setLoading(true);
    setError("");

    try {
      const data = await getClientActivities(trainerId, clientId);
      // Sort by date, newest first
      data.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateB - dateA;
      });
      setActivities(data || []);
    } catch (err) {
      console.error("Error loading activities:", err);
      setError("Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOpenDialog = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().split(" ")[0].slice(0, 5),
      type: "Cardio",
      duration: "",
      intensity: "Medium",
      caloriesBurned: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSaveActivity = async () => {
    if (!formData.duration || !formData.date) {
      setError("Please fill in required fields (Date and Duration)");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await logActivity(trainerId, clientId, {
        ...formData,
        duration: parseInt(formData.duration),
        caloriesBurned: formData.caloriesBurned
          ? parseInt(formData.caloriesBurned)
          : null,
      });

      // Reload activities
      await loadActivities();
      setDialogOpen(false);
    } catch (err) {
      console.error("Error logging activity:", err);
      setError("Failed to save activity: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getTotalCalories = () => {
    return activities.reduce((sum, a) => sum + (a.caloriesBurned || 0), 0);
  };

  const getTotalDuration = () => {
    return activities.reduce((sum, a) => sum + (a.duration || 0), 0);
  };

  const getActivityColor = (type) => {
    const colors = {
      Cardio: "#FF6B6B",
      Strength: "#4CAF50",
      Flexibility: "#FFC107",
      Sports: "#2196F3",
      Walking: "#8BC34A",
      Running: "#FF5722",
      Cycling: "#009688",
      Swimming: "#00BCD4",
      HIIT: "#F44336",
      Pilates: "#9C27B0",
      Yoga: "#E91E63",
      Other: "#9E9E9E",
    };
    return colors[type] || "#999999";
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5">Activity Log</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Log Activity
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: "center", p: 2 }}>
            <Typography color="textSecondary" variant="body2">
              Total Activities
            </Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
              {activities.length}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: "center", p: 2 }}>
            <Typography color="textSecondary" variant="body2">
              Total Duration
            </Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
              {getTotalDuration()}
              <Typography variant="body2" component="span">
                {" "}
                min
              </Typography>
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: "center", p: 2 }}>
            <Typography color="textSecondary" variant="body2">
              Calories Burned
            </Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
              {getTotalCalories()}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: "center", p: 2 }}>
            <Typography color="textSecondary" variant="body2">
              Last Activity
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {activities.length > 0
                ? new Date(`${activities[0].date}T${activities[0].time}`).toLocaleDateString(
                    "en-GB",
                    {
                      month: "short",
                      day: "numeric",
                    }
                  )
                : "None"}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty State */}
      {!loading && activities.length === 0 && (
        <Card sx={{ p: 3, textAlign: "center" }}>
          <FitnessCenterIcon
            sx={{ fontSize: 48, color: "grey.300", mb: 1 }}
          />
          <Typography color="textSecondary">
            No activities logged yet. Click 'Log Activity' to get started!
          </Typography>
        </Card>
      )}

      {/* Activities List */}
      {!loading && activities.length > 0 && (
        <Grid container spacing={2}>
          {activities.map((activity, index) => (
            <Grid item xs={12} key={index}>
              <Card sx={{ transition: "all 0.2s", "&:hover": { boxShadow: 3 } }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    {/* Type Badge */}
                    <Grid item xs={12} sm="auto">
                      <Box
                        sx={{
                          bgcolor: getActivityColor(activity.type),
                          color: "white",
                          p: 1.5,
                          borderRadius: 1,
                          minWidth: 100,
                          textAlign: "center",
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {activity.type}
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Activity Details */}
                    <Grid item xs={12} sm>
                      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Date
                          </Typography>
                          <Typography variant="body1">
                            {new Date(activity.date).toLocaleDateString(
                              "en-GB",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Time
                          </Typography>
                          <Typography variant="body1">{activity.time}</Typography>
                        </Box>

                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Duration
                          </Typography>
                          <Typography variant="body1">
                            {activity.duration} min
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Intensity
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              color:
                                activity.intensity === "High"
                                  ? "#F44336"
                                  : activity.intensity === "Medium"
                                  ? "#FF9800"
                                  : "#4CAF50",
                            }}
                          >
                            {activity.intensity}
                          </Typography>
                        </Box>

                        {activity.caloriesBurned && (
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              Calories
                            </Typography>
                            <Typography variant="body1">
                              {activity.caloriesBurned}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Notes */}
                      {activity.notes && (
                        <Typography
                          variant="body2"
                          sx={{ mt: 1, fontStyle: "italic" }}
                        >
                          "{activity.notes}"
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Log Activity Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Log Activity for {clientName}</DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {/* Date */}
          <TextField
            fullWidth
            type="date"
            name="date"
            label="Date"
            value={formData.date}
            onChange={handleInputChange}
            InputLabelProps={{ shrink: true }}
            margin="normal"
            required
          />

          {/* Time */}
          <TextField
            fullWidth
            type="time"
            name="time"
            label="Time"
            value={formData.time}
            onChange={handleInputChange}
            InputLabelProps={{ shrink: true }}
            margin="normal"
          />

          {/* Activity Type */}
          <FormControl fullWidth margin="normal">
            <InputLabel>Activity Type</InputLabel>
            <Select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              label="Activity Type"
            >
              {activityTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Duration */}
          <TextField
            fullWidth
            type="number"
            name="duration"
            label="Duration (minutes)"
            value={formData.duration}
            onChange={handleInputChange}
            margin="normal"
            required
            inputProps={{ min: 1, max: 600 }}
          />

          {/* Intensity */}
          <FormControl fullWidth margin="normal">
            <InputLabel>Intensity</InputLabel>
            <Select
              name="intensity"
              value={formData.intensity}
              onChange={handleInputChange}
              label="Intensity"
            >
              {intensityLevels.map((level) => (
                <MenuItem key={level} value={level}>
                  {level}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Calories Burned */}
          <TextField
            fullWidth
            type="number"
            name="caloriesBurned"
            label="Calories Burned (optional)"
            value={formData.caloriesBurned}
            onChange={handleInputChange}
            margin="normal"
            inputProps={{ min: 0, max: 5000 }}
          />

          {/* Notes */}
          <TextField
            fullWidth
            multiline
            rows={3}
            name="notes"
            label="Notes (optional)"
            value={formData.notes}
            onChange={handleInputChange}
            margin="normal"
            placeholder="How did the activity go? Any observations?"
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveActivity}
            variant="contained"
            color="primary"
            disabled={saving || !formData.duration || !formData.date}
          >
            {saving ? <CircularProgress size={24} /> : "Save Activity"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
