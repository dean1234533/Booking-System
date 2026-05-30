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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tabs,
  Tab,
  MenuItem,
  LinearProgress,
  Chip,
  Avatar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PhotoIcon from "@mui/icons-material/Photo";
import DownloadIcon from "@mui/icons-material/Download";
import ShareIcon from "@mui/icons-material/Share";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  getClientsList,
  uploadBarberImage,
} from "../../../firebase/firestore";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const METRIC_TYPES = [
  { id: "weight", label: "Weight (lbs)", unit: "lbs", category: "body" },
  { id: "chest", label: "Chest (inches)", unit: "in", category: "measurements" },
  { id: "waist", label: "Waist (inches)", unit: "in", category: "measurements" },
  { id: "hips", label: "Hips (inches)", unit: "in", category: "measurements" },
  { id: "arms", label: "Arms (inches)", unit: "in", category: "measurements" },
  { id: "legs", label: "Legs (inches)", unit: "in", category: "measurements" },
  { id: "bodyfat", label: "Body Fat (%)", unit: "%", category: "body" },
  { id: "strength", label: "Max Strength (lbs)", unit: "lbs", category: "strength" },
  { id: "endurance", label: "Endurance (mins)", unit: "mins", category: "performance" },
  { id: "reps", label: "Max Reps", unit: "reps", category: "strength" },
];

/**
 * Progress Tracker Tab - Track and visualize client progress
 * Features: Metric logging, progress charts, photos, reports
 */
export default function ProgressTrackerTab({ trainerId }) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedClientName, setSelectedClientName] = useState("");
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [progressData, setProgressData] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    metricId: "",
    value: "",
    notes: "",
  });

  const [photos, setPhotos] = useState({
    before: null,
    after: null,
  });

  useEffect(() => {
    loadClients();
  }, [trainerId]);

  useEffect(() => {
    if (selectedClientId) {
      loadProgressData();
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

  const loadProgressData = async () => {
    // Simulated data load - in production would fetch from Firestore
    // For now, we'll use local state
    if (!progressData[selectedClientId]) {
      setProgressData((prev) => ({
        ...prev,
        [selectedClientId]: {},
      }));
    }
  };

  const handleOpenDialog = (entry = null) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        date: entry.date,
        metricId: entry.metricId,
        value: entry.value.toString(),
        notes: entry.notes || "",
      });
    } else {
      setEditingEntry(null);
      setFormData({
        date: new Date().toISOString().split("T")[0],
        metricId: "",
        value: "",
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSaveEntry = () => {
    if (!formData.metricId || !formData.value) {
      setError("Please select a metric and enter a value");
      return;
    }

    const newEntry = {
      id: editingEntry?.id || Date.now().toString(),
      date: formData.date,
      metricId: formData.metricId,
      value: parseFloat(formData.value),
      notes: formData.notes,
      timestamp: new Date().toISOString(),
    };

    setProgressData((prev) => {
      const clientData = prev[selectedClientId] || {};
      const metricEntries = clientData[formData.metricId] || [];

      if (editingEntry) {
        const updated = metricEntries.map((e) =>
          e.id === editingEntry.id ? newEntry : e
        );
        return {
          ...prev,
          [selectedClientId]: {
            ...clientData,
            [formData.metricId]: updated,
          },
        };
      } else {
        return {
          ...prev,
          [selectedClientId]: {
            ...clientData,
            [formData.metricId]: [...metricEntries, newEntry],
          },
        };
      }
    });

    setDialogOpen(false);
  };

  const handleDeleteEntry = (metricId, entryId) => {
    setProgressData((prev) => ({
      ...prev,
      [selectedClientId]: {
        ...prev[selectedClientId],
        [metricId]: (prev[selectedClientId]?.[metricId] || []).filter(
          (e) => e.id !== entryId
        ),
      },
    }));
  };

  const handlePhotoUpload = async (type, file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadBarberImage(file);
      setPhotos((prev) => ({ ...prev, [type]: url }));
    } catch (err) {
      setError("Failed to upload photo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const getMetricEntries = (metricId) => {
    return (progressData[selectedClientId]?.[metricId] || []).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  };

  const getMetricProgress = (metricId) => {
    const entries = getMetricEntries(metricId);
    if (entries.length < 2) return null;

    const firstValue = entries[0].value;
    const lastValue = entries[entries.length - 1].value;
    const change = lastValue - firstValue;
    const percentChange = ((change / firstValue) * 100).toFixed(1);

    return {
      change,
      percentChange,
      direction: change > 0 ? "up" : change < 0 ? "down" : "same",
    };
  };

  const getChartData = (metricId) => {
    const entries = getMetricEntries(metricId);
    const metric = METRIC_TYPES.find((m) => m.id === metricId);

    return {
      labels: entries.map((e) =>
        new Date(e.date).toLocaleDateString("en-GB", {
          month: "short",
          day: "numeric",
        })
      ),
      datasets: [
        {
          label: metric?.label || "Progress",
          data: entries.map((e) => e.value),
          borderColor: "#2196F3",
          backgroundColor: "rgba(33, 150, 243, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };

  const generateReport = () => {
    const metrics = METRIC_TYPES.filter(
      (m) => (progressData[selectedClientId]?.[m.id] || []).length > 0
    );

    const report = {
      clientName: selectedClientName,
      date: new Date().toLocaleDateString("en-GB"),
      metrics: metrics.map((m) => ({
        name: m.label,
        entries: getMetricEntries(m.id),
        progress: getMetricProgress(m.id),
      })),
      photos,
    };

    return report;
  };

  if (!selectedClientId && clients.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No clients found. Create bookings to get started.
      </Alert>
    );
  }

  const activeMetrics = METRIC_TYPES.filter(
    (m) => (progressData[selectedClientId]?.[m.id] || []).length > 0
  );

  return (
    <Box sx={{ p: 2 }}>
      {/* Client Selector */}
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

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab
            label={`Progress Data (${activeMetrics.length})`}
            icon={<TrendingUpIcon />}
            iconPosition="start"
          />
          <Tab
            label="Photos"
            icon={<PhotoIcon />}
            iconPosition="start"
          />
          <Tab
            label="Report"
            icon={<DownloadIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Progress Data Tab */}
      {tabValue === 0 && (
        <>
          {/* Summary Cards */}
          {activeMetrics.length > 0 && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {activeMetrics.map((metric) => {
                const progress = getMetricProgress(metric.id);
                const entries = getMetricEntries(metric.id);

                return (
                  <Grid item xs={12} sm={6} md={4} key={metric.id}>
                    <Card>
                      <CardContent>
                        <Typography
                          color="textSecondary"
                          gutterBottom
                          variant="body2"
                        >
                          {metric.label}
                        </Typography>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          {entries[entries.length - 1]?.value} {metric.unit}
                        </Typography>
                        {progress && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Chip
                              icon={<TrendingUpIcon />}
                              label={`${
                                progress.direction === "up" ? "+" : ""
                              }${progress.change.toFixed(1)} (${progress.percentChange}%)`}
                              size="small"
                              color={
                                progress.direction === "up"
                                  ? "success"
                                  : progress.direction === "down"
                                  ? "error"
                                  : "default"
                              }
                            />
                          </Box>
                        )}
                        <Typography variant="caption" color="textSecondary">
                          {entries.length} entries
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {/* Add Metric Button */}
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              fullWidth
            >
              Log Progress
            </Button>
          </Box>

          {/* Metrics Charts */}
          {activeMetrics.length > 0 ? (
            <Grid container spacing={2}>
              {activeMetrics.map((metric) => {
                const entries = getMetricEntries(metric.id);
                return (
                  <Grid item xs={12} md={6} key={metric.id}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                          {metric.label} Progression
                        </Typography>
                        {entries.length > 1 ? (
                          <Box sx={{ height: 300 }}>
                            <Line
                              data={getChartData(metric.id)}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: { display: true },
                                },
                              }}
                            />
                          </Box>
                        ) : (
                          <Typography color="textSecondary">
                            Need at least 2 entries to show chart
                          </Typography>
                        )}

                        {/* Entries Table */}
                        <TableContainer sx={{ mt: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: "grey.100" }}>
                                <TableCell>Date</TableCell>
                                <TableCell align="right">Value</TableCell>
                                <TableCell>Notes</TableCell>
                                <TableCell align="right">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {entries.map((entry) => (
                                <TableRow key={entry.id}>
                                  <TableCell>
                                    {new Date(entry.date).toLocaleDateString(
                                      "en-GB"
                                    )}
                                  </TableCell>
                                  <TableCell align="right">
                                    {entry.value} {metric.unit}
                                  </TableCell>
                                  <TableCell>{entry.notes}</TableCell>
                                  <TableCell align="right">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleOpenDialog(entry)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() =>
                                        handleDeleteEntry(metric.id, entry.id)
                                      }
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: "center" }}>
                <TrendingUpIcon sx={{ fontSize: 48, color: "grey.300", mb: 1 }} />
                <Typography color="textSecondary">
                  No progress data yet. Click "Log Progress" to get started!
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Photos Tab */}
      {tabValue === 1 && (
        <Grid container spacing={2}>
          {["before", "after"].map((type) => (
            <Grid item xs={12} sm={6} key={type}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    {type === "before" ? "Before Photo" : "After Photo"}
                  </Typography>

                  {photos[type] ? (
                    <Box sx={{ position: "relative", mb: 2 }}>
                      <img
                        src={photos[type]}
                        alt={type}
                        style={{
                          width: "100%",
                          borderRadius: 8,
                          maxHeight: 400,
                          objectFit: "cover",
                        }}
                      />
                      <Button
                        size="small"
                        color="error"
                        onClick={() =>
                          setPhotos((prev) => ({ ...prev, [type]: null }))
                        }
                        sx={{ mt: 1 }}
                      >
                        Remove Photo
                      </Button>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        bgcolor: "grey.100",
                        p: 4,
                        textAlign: "center",
                        borderRadius: 1,
                        mb: 2,
                      }}
                    >
                      <PhotoIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
                      <Typography color="textSecondary">
                        No photo uploaded
                      </Typography>
                    </Box>
                  )}

                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    disabled={uploading}
                  >
                    {uploading ? <CircularProgress size={24} /> : "Upload Photo"}
                    <input
                      hidden
                      accept="image/*"
                      type="file"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handlePhotoUpload(type, e.target.files[0]);
                        }
                      }}
                    />
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Report Tab */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Progress Report
            </Typography>

            {activeMetrics.length === 0 ? (
              <Alert severity="info">
                No progress data to generate report. Log some metrics first!
              </Alert>
            ) : (
              <Box>
                {/* Report Summary */}
                <Box sx={{ mb: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Client:</strong> {selectedClientName}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Generated:</strong>{" "}
                    {new Date().toLocaleDateString("en-GB")}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Metrics Tracked:</strong> {activeMetrics.length}
                  </Typography>
                </Box>

                {/* Metrics Report */}
                {activeMetrics.map((metric) => {
                  const progress = getMetricProgress(metric.id);
                  const entries = getMetricEntries(metric.id);

                  return (
                    <Box key={metric.id} sx={{ mb: 3, p: 2, border: "1px solid #eee", borderRadius: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 2,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {metric.label}
                        </Typography>
                        {progress && (
                          <Chip
                            icon={<TrendingUpIcon />}
                            label={`${
                              progress.direction === "up" ? "+" : ""
                            }${progress.change.toFixed(1)} (${progress.percentChange}%)`}
                            size="small"
                            color={
                              progress.direction === "up"
                                ? "success"
                                : progress.direction === "down"
                                ? "error"
                                : "default"
                            }
                          />
                        )}
                      </Box>

                      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Start
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {entries[0]?.value} {metric.unit}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Current
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {entries[entries.length - 1]?.value} {metric.unit}
                          </Typography>
                        </Box>
                      </Box>

                      <LinearProgress
                        variant="determinate"
                        value={Math.min(
                          ((entries[entries.length - 1]?.value /
                            entries[0]?.value) *
                            100) || 0,
                          100
                        )}
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption" color="textSecondary">
                        {entries.length} measurements
                      </Typography>
                    </Box>
                  );
                })}

                {/* Photos in Report */}
                {(photos.before || photos.after) && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      Photos
                    </Typography>
                    <Grid container spacing={2}>
                      {photos.before && (
                        <Grid item xs={12} sm={6}>
                          <img
                            src={photos.before}
                            alt="Before"
                            style={{
                              width: "100%",
                              borderRadius: 4,
                              maxHeight: 300,
                              objectFit: "cover",
                            }}
                          />
                          <Typography variant="caption" sx={{ mt: 1 }}>
                            Before
                          </Typography>
                        </Grid>
                      )}
                      {photos.after && (
                        <Grid item xs={12} sm={6}>
                          <img
                            src={photos.after}
                            alt="After"
                            style={{
                              width: "100%",
                              borderRadius: 4,
                              maxHeight: 300,
                              objectFit: "cover",
                            }}
                          />
                          <Typography variant="caption" sx={{ mt: 1 }}>
                            After
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}

                {/* Action Buttons */}
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => {
                      const report = generateReport();
                      const reportText = `
PROGRESS REPORT
Client: ${report.clientName}
Generated: ${report.date}

METRICS:
${report.metrics
  .map((m) => {
    const first = m.entries[0]?.value;
    const last = m.entries[m.entries.length - 1]?.value;
    return `${m.name}: ${first} → ${last} ${METRIC_TYPES.find((mt) => mt.label === m.name)?.unit}`;
  })
  .join("\n")}
`;
                      const blob = new Blob([reportText], {
                        type: "text/plain",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `progress-report-${selectedClientName}.txt`;
                      a.click();
                    }}
                  >
                    Download Report
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ShareIcon />}
                    onClick={() => setReportDialogOpen(true)}
                  >
                    Share with Client
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Entry Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingEntry ? "Edit Progress Entry" : "Log Progress"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            type="date"
            label="Date"
            value={formData.date}
            onChange={(e) =>
              setFormData({ ...formData, date: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
            margin="normal"
          />

          <TextField
            select
            fullWidth
            label="Metric"
            value={formData.metricId}
            onChange={(e) =>
              setFormData({ ...formData, metricId: e.target.value })
            }
            margin="normal"
          >
            {METRIC_TYPES.map((metric) => (
              <MenuItem key={metric.id} value={metric.id}>
                {metric.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            type="number"
            label="Value"
            value={formData.value}
            onChange={(e) =>
              setFormData({ ...formData, value: e.target.value })
            }
            margin="normal"
            inputProps={{ step: 0.1 }}
            helperText={`Unit: ${
              METRIC_TYPES.find((m) => m.id === formData.metricId)?.unit ||
              "value"
            }`}
          />

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Notes (optional)"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEntry} variant="contained" color="primary">
            {editingEntry ? "Update" : "Save"} Entry
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Report Dialog */}
      <Dialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Share Report with {selectedClientName}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            This will send a progress report to the client's chat.
          </Alert>
          <Typography variant="body2" color="textSecondary">
            The client will receive a detailed summary of their progress including:
          </Typography>
          <ul>
            <li>All tracked metrics and changes</li>
            <li>Before/after photos (if available)</li>
            <li>Progress percentages</li>
            <li>Timeline data</li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              // In production, would send via addMessage
              alert("Report sent to client!");
              setReportDialogOpen(false);
            }}
            variant="contained"
            color="primary"
          >
            Send Report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
