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
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tab,
  Tabs,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import HistoryIcon from "@mui/icons-material/History";
import {
  createAutomationSchedule,
  getAutomationSchedules,
  updateAutomationSchedule,
  deleteAutomationSchedule,
  getAutomationHistory,
  getClientsList,
  addMessage,
} from "../../../firebase/firestore";
import {
  AUTOMATION_TEMPLATES,
  FREQUENCY_OPTIONS,
  getTemplateById,
  interpolateMessage,
  getNextSendDate,
} from "../../../data/automationTemplates";

/**
 * Automation Tab - Schedule recurring messages for clients
 * PTs can set up automated check-ins, reminders, etc.
 */
export default function AutomationTab({ trainerId, barber }) {
  const [schedules, setSchedules] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedScheduleHistory, setSelectedScheduleHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [formData, setFormData] = useState({
    templateId: "",
    customMessage: "",
    frequency: "monthly",
    customDays: 30,
    recipients: [], // array of clientIds
    enabled: true,
  });

  useEffect(() => {
    loadData();
  }, [trainerId]);

  const loadData = async () => {
    if (!trainerId) return;
    setLoading(true);
    setError("");

    try {
      const [schedulesData, clientsData] = await Promise.all([
        getAutomationSchedules(trainerId),
        getClientsList(trainerId),
      ]);
      setSchedules(schedulesData || []);
      setClients(clientsData || []);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load automation data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (schedule = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        templateId: schedule.templateId || "",
        customMessage: schedule.customMessage || "",
        frequency: schedule.frequency || "monthly",
        customDays: schedule.customDays || 30,
        recipients: schedule.recipients || [],
        enabled: schedule.enabled !== false,
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        templateId: "",
        customMessage: "",
        frequency: "monthly",
        customDays: 30,
        recipients: [],
        enabled: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSchedule(null);
  };

  const handleSaveSchedule = async () => {
    if (!formData.recipients.length) {
      setError("Please select at least one client");
      return;
    }

    if (!formData.templateId && !formData.customMessage.trim()) {
      setError("Please select a template or write a custom message");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextSendDate = getNextSendDate(formData.frequency, formData.customDays);

      const scheduleData = {
        ...formData,
        nextSend: nextSendDate,
        trainerName: barber?.name || "Your Trainer",
      };

      if (editingSchedule) {
        await updateAutomationSchedule(trainerId, editingSchedule.id, scheduleData);
        setSchedules(
          schedules.map((s) =>
            s.id === editingSchedule.id ? { ...s, ...scheduleData } : s
          )
        );
      } else {
        const newSchedule = await createAutomationSchedule(trainerId, scheduleData);
        setSchedules([...schedules, newSchedule]);
      }

      handleCloseDialog();
    } catch (err) {
      console.error("Error saving schedule:", err);
      setError("Failed to save automation: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm("Are you sure you want to delete this automation?")) {
      return;
    }

    setLoading(true);
    try {
      await deleteAutomationSchedule(trainerId, scheduleId);
      setSchedules(schedules.filter((s) => s.id !== scheduleId));
    } catch (err) {
      setError("Failed to delete automation: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (schedule) => {
    try {
      await updateAutomationSchedule(trainerId, schedule.id, {
        enabled: !schedule.enabled,
      });
      setSchedules(
        schedules.map((s) =>
          s.id === schedule.id ? { ...s, enabled: !s.enabled } : s
        )
      );
    } catch (err) {
      setError("Failed to update automation: " + err.message);
    }
  };

  const handleSendNow = async (schedule) => {
    if (window.confirm("Send this message to all recipients now?")) {
      setLoading(true);
      try {
        const template = getTemplateById(schedule.templateId);
        const messageText =
          schedule.customMessage ||
          (template
            ? interpolateMessage(template.message, {
                clientName: "{clientName}",
                trainerName: schedule.trainerName,
              })
            : "");

        for (const clientId of schedule.recipients) {
          const client = clients.find((c) => c.id === clientId);
          if (client) {
            const personalizedMessage = interpolateMessage(messageText, {
              clientName: client.customerName,
              trainerName: schedule.trainerName,
            });

            await addMessage(trainerId, clientId, {
              message: personalizedMessage,
              sender: "pt",
              senderName: "Automated Message",
              fromAutomation: true,
            });
          }
        }

        alert("Messages sent successfully!");
      } catch (err) {
        setError("Failed to send messages: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleViewHistory = async (schedule) => {
    setHistoryLoading(true);
    try {
      const history = await getAutomationHistory(trainerId, schedule.id);
      setSelectedScheduleHistory({ schedule, history });
      setHistoryDialogOpen(true);
    } catch (err) {
      setError("Failed to load history: " + err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getRecipientNames = (recipientIds) => {
    return recipientIds
      .map((id) => clients.find((c) => c.id === id)?.customerName)
      .filter(Boolean)
      .join(", ");
  };

  const getMessagePreview = (schedule) => {
    const template = getTemplateById(schedule.templateId);
    const messageText = schedule.customMessage || template?.message || "";
    return messageText.substring(0, 100) + (messageText.length > 100 ? "..." : "");
  };

  if (loading && schedules.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

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
        <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AutoAwesomeIcon />
          Automation Schedules
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          New Automation
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label={`Active Automations (${schedules.filter((s) => s.enabled).length})`} />
          <Tab label={`Paused (${schedules.filter((s) => !s.enabled).length})`} />
        </Tabs>
      </Paper>

      {/* Schedules Table */}
      {schedules.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center" }}>
            <AutoAwesomeIcon sx={{ fontSize: 48, color: "grey.300", mb: 1 }} />
            <Typography color="textSecondary">
              No automations yet. Click "New Automation" to get started!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell>Template</TableCell>
                <TableCell>Frequency</TableCell>
                <TableCell>Recipients</TableCell>
                <TableCell>Next Send</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules
                .filter((s) =>
                  tabValue === 0 ? s.enabled : !s.enabled
                )
                .map((schedule) => (
                  <TableRow key={schedule.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {getTemplateById(schedule.templateId)?.name ||
                            "Custom Message"}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {getMessagePreview(schedule)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          FREQUENCY_OPTIONS.find((f) => f.value === schedule.frequency)
                            ?.label || "Custom"
                        }
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {schedule.recipients.length} client
                        {schedule.recipients.length !== 1 ? "s" : ""}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {getRecipientNames(schedule.recipients).substring(0, 30)}
                        {getRecipientNames(schedule.recipients).length > 30 ? "..." : ""}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {schedule.nextSend
                          ? new Date(schedule.nextSend).toLocaleDateString("en-GB")
                          : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={schedule.enabled !== false}
                            onChange={() => handleToggleEnabled(schedule)}
                            size="small"
                          />
                        }
                        label={schedule.enabled !== false ? "Active" : "Paused"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleSendNow(schedule)}
                        title="Send now"
                        color="success"
                      >
                        <SendIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleViewHistory(schedule)}
                        title="View history"
                      >
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(schedule)}
                        title="Edit"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        title="Delete"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSchedule ? "Edit Automation" : "Create New Automation"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {/* Template Selection */}
          <TextField
            select
            fullWidth
            label="Template"
            value={formData.templateId}
            onChange={(e) =>
              setFormData({ ...formData, templateId: e.target.value })
            }
            margin="normal"
          >
            <MenuItem value="">-- Custom Message --</MenuItem>
            {AUTOMATION_TEMPLATES.map((template) => (
              <MenuItem key={template.id} value={template.id}>
                {template.name} ({template.frequency})
              </MenuItem>
            ))}
          </TextField>

          {/* Custom Message */}
          {!formData.templateId && (
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Custom Message"
              value={formData.customMessage}
              onChange={(e) =>
                setFormData({ ...formData, customMessage: e.target.value })
              }
              margin="normal"
              placeholder="Write your message. Use {clientName} and {trainerName} for personalization."
              helperText="Use {clientName} and {trainerName} to personalize messages"
            />
          )}

          {/* Template Preview */}
          {formData.templateId && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: "grey.50", mt: 2 }}>
              <Typography variant="caption" color="textSecondary">
                Message Preview:
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
                {interpolateMessage(
                  getTemplateById(formData.templateId)?.message || "",
                  {
                    clientName: "John Smith",
                    trainerName: barber?.name || "Your Trainer",
                  }
                )}
              </Typography>
            </Paper>
          )}

          {/* Frequency Selection */}
          <TextField
            select
            fullWidth
            label="Send Frequency"
            value={formData.frequency}
            onChange={(e) =>
              setFormData({ ...formData, frequency: e.target.value })
            }
            margin="normal"
          >
            {FREQUENCY_OPTIONS.map((freq) => (
              <MenuItem key={freq.value} value={freq.value}>
                {freq.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Custom Days */}
          {formData.frequency === "custom" && (
            <TextField
              fullWidth
              type="number"
              label="Days Between Sends"
              value={formData.customDays}
              onChange={(e) =>
                setFormData({ ...formData, customDays: parseInt(e.target.value) })
              }
              margin="normal"
              inputProps={{ min: 1, max: 365 }}
            />
          )}

          {/* Client Selection */}
          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
            Send to Clients
          </Typography>
          <Paper sx={{ maxHeight: 200, overflow: "auto", border: "1px solid #ddd" }}>
            {clients.map((client) => (
              <Box
                key={client.id}
                sx={{
                  p: 1,
                  display: "flex",
                  alignItems: "center",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "grey.50" },
                }}
                onClick={() => {
                  const isSelected = formData.recipients.includes(client.id);
                  setFormData({
                    ...formData,
                    recipients: isSelected
                      ? formData.recipients.filter((id) => id !== client.id)
                      : [...formData.recipients, client.id],
                  });
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.recipients.includes(client.id)}
                  onChange={() => {}} // Handled by onClick
                  style={{ marginRight: 8 }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">{client.customerName}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {client.customerEmail}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Paper>

          {/* Select All / Deselect All */}
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Button
              size="small"
              onClick={() =>
                setFormData({ ...formData, recipients: clients.map((c) => c.id) })
              }
            >
              Select All
            </Button>
            <Button
              size="small"
              onClick={() => setFormData({ ...formData, recipients: [] })}
            >
              Deselect All
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveSchedule} variant="contained" color="primary">
            {editingSchedule ? "Update" : "Create"} Automation
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Send History —{" "}
          {selectedScheduleHistory?.schedule.templateId
            ? getTemplateById(selectedScheduleHistory.schedule.templateId)?.name
            : "Custom Message"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {historyLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress />
            </Box>
          ) : selectedScheduleHistory?.history.length === 0 ? (
            <Typography color="textSecondary">No send history yet.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sent At</TableCell>
                    <TableCell>Recipients</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedScheduleHistory?.history.map((record, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {new Date(record.sentAt).toLocaleString("en-GB")}
                      </TableCell>
                      <TableCell>{record.recipientCount || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
