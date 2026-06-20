import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  Tabs,
  Tab,
  Paper,
} from "@mui/material";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import SearchIcon from "@mui/icons-material/Search";
import VoiceRecorderModal from "../../VoiceRecorderModal";
import {
  saveConsultation,
  getClientConsultations,
  getConsultationsByCategory,
  searchConsultations,
} from "../../../firebase/firestore";
import {
  getAvailableCategories,
  getCategoryColor,
  formatCategories,
} from "../../../utils/categorizationEngine";

/**
 * Consultation Tab - Record, view, and organize consultation notes
 * Features: Voice recording, auto-categorization, category-based filtering, search
 */
export default function ConsultationTab({ trainerId, clientId, clientName }) {
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [tabValue, setTabValue] = useState(0);

  const availableCategories = getAvailableCategories();

  useEffect(() => {
    loadConsultations();
  }, [trainerId, clientId, selectedCategory]);

  const loadConsultations = async () => {
    if (!trainerId || !clientId) return;

    setLoading(true);
    setError("");

    try {
      let data;

      if (selectedCategory === "all") {
        data = await getClientConsultations(trainerId, clientId);
      } else {
        data = await getConsultationsByCategory(
          trainerId,
          clientId,
          selectedCategory
        );
      }

      // Sort by date, newest first
      data.sort(
        (a, b) =>
          new Date(b.timestamp || b.createdAt) -
          new Date(a.timestamp || a.createdAt)
      );

      setConsultations(data || []);
    } catch (err) {
      console.error("Error loading consultations:", err);
      setError("Failed to load consultations");
    } finally {
      setLoading(false);
    }
  };

  const handleRecorderSave = async (recordingData) => {
    try {
      await saveConsultation(trainerId, clientId, {
        ...recordingData,
        clientId,
        clientName,
      });

      // Reload consultations
      await loadConsultations();
      setRecorderOpen(false);
    } catch (err) {
      console.error("Error saving consultation:", err);
      setError("Failed to save consultation: " + err.message);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadConsultations();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const results = await searchConsultations(
        trainerId,
        clientId,
        searchQuery
      );
      setConsultations(results || []);
    } catch (err) {
      console.error("Error searching consultations:", err);
      setError("Failed to search consultations");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = async () => {
    setSearchQuery("");
    await loadConsultations();
  };

  const filteredConsultations =
    selectedCategory === "all"
      ? consultations
      : consultations.filter((c) =>
          c.categories?.includes(selectedCategory)
        );

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
        <Typography variant="h5">Consultation Notes</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<RecordVoiceOverIcon />}
          onClick={() => setRecorderOpen(true)}
        >
          Record Consultation
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Search Bar */}
      <Paper sx={{ display: "flex", gap: 1, mb: 3, p: 1 }}>
        <TextField
          size="small"
          placeholder="Search consultations..."
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: "grey.500" }} />,
          }}
        />
        <Button
          variant="outlined"
          onClick={handleSearch}
          disabled={!searchQuery.trim()}
        >
          Search
        </Button>
        {searchQuery && (
          <Button variant="outlined" onClick={handleClearSearch} color="error">
            Clear
          </Button>
        )}
      </Paper>

      {/* Category Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => {
            setTabValue(newValue);
            const categories = ["all", ...availableCategories];
            setSelectedCategory(categories[newValue]);
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label={`All (${consultations.length})`}
            sx={{
              bgcolor: selectedCategory === "all" ? "primary.light" : "inherit",
            }}
          />
          {availableCategories.map((category) => {
            const count = consultations.filter((c) =>
              c.categories?.includes(category)
            ).length;
            return (
              <Tab
                key={category}
                label={`${category} (${count})`}
                sx={{
                  bgcolor:
                    selectedCategory === category
                      ? getCategoryColor(category)
                      : "inherit",
                  color:
                    selectedCategory === category
                      ? "white"
                      : "text.primary",
                }}
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty State */}
      {!loading && filteredConsultations.length === 0 && (
        <Card sx={{ p: 3, textAlign: "center" }}>
          <RecordVoiceOverIcon
            sx={{ fontSize: 48, color: "grey.300", mb: 1 }}
          />
          <Typography color="textSecondary">
            {searchQuery
              ? "No consultations match your search"
              : selectedCategory === "all"
              ? "No consultation notes yet. Click 'Record Consultation' to get started!"
              : `No notes in the "${selectedCategory}" category yet`}
          </Typography>
        </Card>
      )}

      {/* Consultations List */}
      {!loading && filteredConsultations.length > 0 && (
        <Grid container spacing={2}>
          {filteredConsultations.map((consultation) => (
            <Grid item xs={12} key={consultation.id || consultation.timestamp}>
              <Card sx={{ transition: "all 0.2s", "&:hover": { boxShadow: 3 } }}>
                <CardContent>
                  {/* Header with Date and Duration */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                      mb: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        {new Date(
                          consultation.timestamp || consultation.createdAt
                        ).toLocaleDateString("en-GB", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                        {consultation.duration && (
                          <Typography
                            component="span"
                            variant="body2"
                            sx={{ ml: 1 }}
                          >
                            • {consultation.duration} min
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Transcript */}
                  <Typography
                    variant="body2"
                    sx={{
                      mb: 2,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: 150,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {consultation.transcript}
                  </Typography>

                  {/* Categories */}
                  {consultation.categories &&
                    consultation.categories.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {consultation.categories.map((category) => (
                            <Chip
                              key={category}
                              label={category}
                              size="small"
                              sx={{
                                bgcolor: getCategoryColor(category),
                                color: "white",
                                fontWeight: 500,
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                  {/* Read More Link */}
                  <Button
                    size="small"
                    sx={{ textTransform: "none", mt: 1 }}
                    onClick={() => {
                      // Could implement a detail view modal
                      console.log("View details for:", consultation.id);
                    }}
                  >
                    View Full Transcript →
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        open={recorderOpen}
        onClose={() => setRecorderOpen(false)}
        onSave={handleRecorderSave}
      />
    </Box>
  );
}
