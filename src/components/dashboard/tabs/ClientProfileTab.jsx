import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Grid,
  Tabs,
  Tab,
  Chip,
  Avatar,
  Divider,
  MenuItem,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import MessageIcon from "@mui/icons-material/Message";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SearchIcon from "@mui/icons-material/Search";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LinkIcon from "@mui/icons-material/Link";
import CheckIcon from "@mui/icons-material/Check";
import {
  getOrCreateClient,
  getClientProfile,
  saveClientProfile,
  searchClients,
  getClientsList,
} from "../../../firebase/firestore";
import ClientMessagesTab from "./ClientMessagesTab";
import ClientActivityTab from "./ClientActivityTab";
import ConsultationTab from "./ConsultationTab";
import ClientSubmittedForms from "./ClientSubmittedForms";
import AssignmentIcon from "@mui/icons-material/Assignment";

/**
 * Client Profile Tab - Unified view for all client information
 * Features: Client selection, profile viewing, message/activity/consultation tabs
 */
export default function ClientProfileTab({ barber, profile, brandColor, trainerId: trainerIdProp, bookings = [] }) {
  const trainerId = trainerIdProp || barber?.uid || barber?.id;
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientProfile, setClientProfile] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    loadClients();
  }, [trainerId]);

  useEffect(() => {
    if (selectedClientId) {
      loadClientProfile();
    }
  }, [selectedClientId]);

  const loadClients = async () => {
    if (!trainerId) return;

    setLoading(true);
    setError("");

    try {
      const data = await getClientsList(trainerId);
      setClients(data || []);

      // If no clients yet and there are bookings, suggest creating from bookings
      if ((!data || data.length === 0) && bookings.length > 0) {
        // Auto-create client from first booking if possible
        const firstBooking = bookings[0];
        if (firstBooking) {
          const newClient = await getOrCreateClient(trainerId, firstBooking.id, {
            customerName: firstBooking.customerName,
            customerEmail: firstBooking.customerEmail,
            customerPhone: firstBooking.customerPhone,
          });
          setSelectedClientId(newClient.id);
          setClients([newClient]);
        }
      }
    } catch (err) {
      console.error("Error loading clients:", err);
      setError("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const loadClientProfile = async () => {
    if (!trainerId || !selectedClientId) return;

    setLoading(true);
    setError("");

    try {
      const profile = await getClientProfile(trainerId, selectedClientId);
      setClientProfile(profile || {});
      setEditData(profile || {});
      setEditMode(false);
    } catch (err) {
      console.error("Error loading client profile:", err);
      setError("Failed to load client profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchClients = async (e) => {
    setSearchQuery(e.target.value);

    if (e.target.value.trim()) {
      try {
        const results = await searchClients(trainerId, e.target.value);
        setClients(results || []);
      } catch (err) {
        console.error("Error searching clients:", err);
      }
    } else {
      loadClients();
    }
  };

  const handleUpdateProfile = async () => {
    if (!trainerId || !selectedClientId) return;

    setLoading(true);
    setError("");

    try {
      await saveClientProfile(trainerId, selectedClientId, editData);
      setClientProfile(editData);
      setEditMode(false);
      setError("");
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPortalLink = async () => {
    const url = `${window.location.origin}/client-portal/${trainerId}/${selectedClientId}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      prompt("Copy this link and send to your client:", url);
    }
  };

  const handleWhatsApp = () => {
    if (clientProfile?.customerPhone) {
      const encodedMessage = encodeURIComponent(
        `Hi ${clientProfile.customerName}, this is a message from your Personal Trainer.`
      );
      window.open(
        `https://wa.me/${clientProfile.customerPhone}?text=${encodedMessage}`,
        "_blank"
      );
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (!trainerId) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">PT profile not found. Please log in.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {/* Client Selector */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <SearchIcon color="action" />
                <TextField
                  select
                  fullWidth
                  placeholder="Select or search client..."
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  variant="standard"
                  disabled={loading || clients.length === 0}
                >
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.customerName} ({client.customerEmail})
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {clients.length === 0 && !loading && (
                <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                  No clients yet. Bookings will appear here automatically.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Client Profile */}
        {loading && selectedClientId && (
          <Grid item xs={12}>
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          </Grid>
        )}

        {error && selectedClientId && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          </Grid>
        )}

        {!loading && selectedClientId && clientProfile && (
          <>
            {/* Profile Header */}
            <Grid item xs={12}>
              <Card>
                <CardHeader
                  avatar={
                    <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main" }}>
                      {clientProfile.customerName?.charAt(0) || "?"}
                    </Avatar>
                  }
                  title={clientProfile.customerName || "Unknown Client"}
                  subheader={`Joined ${
                    clientProfile.startDate
                      ? new Date(clientProfile.startDate).toLocaleDateString(
                          "en-GB"
                        )
                      : "Recently"
                  }`}
                  action={
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Button
                        size="small"
                        onClick={handleCopyPortalLink}
                        startIcon={linkCopied ? <CheckIcon /> : <LinkIcon />}
                        variant="outlined"
                        color={linkCopied ? "success" : "primary"}
                      >
                        {linkCopied ? "Copied!" : "Client Portal Link"}
                      </Button>
                      <Button
                        size="small"
                        onClick={handleWhatsApp}
                        startIcon={<WhatsAppIcon />}
                        disabled={!clientProfile.customerPhone}
                        variant="outlined"
                        color="success"
                      >
                        WhatsApp
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setEditMode(!editMode)}
                        variant={editMode ? "contained" : "outlined"}
                      >
                        {editMode ? "Cancel" : "Edit"}
                      </Button>
                    </Box>
                  }
                />
                <Divider />
                <CardContent>
                  {editMode ? (
                    // Edit Mode
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          name="customerName"
                          label="Name"
                          value={editData.customerName || ""}
                          onChange={handleInputChange}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          name="customerEmail"
                          label="Email"
                          type="email"
                          value={editData.customerEmail || ""}
                          onChange={handleInputChange}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          name="customerPhone"
                          label="Phone"
                          value={editData.customerPhone || ""}
                          onChange={handleInputChange}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          name="age"
                          label="Age"
                          type="number"
                          value={editData.age || ""}
                          onChange={handleInputChange}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          name="goals"
                          label="Goals (comma-separated)"
                          value={
                            Array.isArray(editData.goals)
                              ? editData.goals.join(", ")
                              : ""
                          }
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              goals: e.target.value
                                .split(",")
                                .map((g) => g.trim()),
                            })
                          }
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleUpdateProfile}
                            disabled={loading}
                          >
                            Save Changes
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setEditMode(false);
                              setEditData(clientProfile);
                            }}
                          >
                            Cancel
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    // View Mode
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <EmailIcon fontSize="small" color="action" />
                          <Box>
                            <Typography variant="caption" color="textSecondary">
                              Email
                            </Typography>
                            <Typography variant="body2">
                              {clientProfile.customerEmail || "—"}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <PhoneIcon fontSize="small" color="action" />
                          <Box>
                            <Typography variant="caption" color="textSecondary">
                              Phone
                            </Typography>
                            <Typography variant="body2">
                              {clientProfile.customerPhone || "—"}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      {clientProfile.age && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="textSecondary">
                            Age
                          </Typography>
                          <Typography variant="body2">
                            {clientProfile.age}
                          </Typography>
                        </Grid>
                      )}
                      {clientProfile.goals && clientProfile.goals.length > 0 && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="textSecondary">
                            Goals
                          </Typography>
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            {clientProfile.goals.map((goal) => (
                              <Chip
                                key={goal}
                                label={goal}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Tabs for Messages, Activity, Consultations */}
            <Grid item xs={12}>
              <Card>
                <Tabs
                  value={tabValue}
                  onChange={(e, newValue) => setTabValue(newValue)}
                  variant="fullWidth"
                >
                  <Tab
                    label="Messages"
                    icon={<MessageIcon />}
                    iconPosition="start"
                  />
                  <Tab
                    label="Activity"
                    icon={<FitnessCenterIcon />}
                    iconPosition="start"
                  />
                  <Tab
                    label="Consultations"
                    icon={<RecordVoiceOverIcon />}
                    iconPosition="start"
                  />
                  <Tab
                    label="Forms"
                    icon={<AssignmentIcon />}
                    iconPosition="start"
                  />
                </Tabs>

                <CardContent>
                  {tabValue === 0 && (
                    <ClientMessagesTab
                      trainerId={trainerId}
                      clientId={selectedClientId}
                      clientName={clientProfile.customerName}
                    />
                  )}
                  {tabValue === 1 && (
                    <ClientActivityTab
                      trainerId={trainerId}
                      clientId={selectedClientId}
                      clientName={clientProfile.customerName}
                    />
                  )}
                  {tabValue === 2 && (
                    <ConsultationTab
                      trainerId={trainerId}
                      clientId={selectedClientId}
                      clientName={clientProfile.customerName}
                    />
                  )}
                  {tabValue === 3 && (
                    <ClientSubmittedForms
                      trainerId={trainerId}
                      clientId={selectedClientId}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );
}
