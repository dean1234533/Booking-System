import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Chip, Stack, CircularProgress, Alert, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, useMediaQuery, useTheme,
} from "@mui/material";
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon,
  InfoOutlined as InfoIcon,
} from "@mui/icons-material";
import { getUpcomingBookings, getClientWorkout, getClientParQ, getClientCheckIn } from "../../../firebase/firestore";
import { getTimeUntilSession, formatSessionTime, formatSessionDate, getGoogleMapsUrl } from "../../../utils/timeUtils";

export default function SessionPrepTab({ barber, brandColor, profile }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Load sessions and auto-refresh every 30 seconds
  useEffect(() => {
    loadSessions();
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
      loadSessions();
    }, 30000);
    return () => clearInterval(interval);
  }, [barber?.uid]);

  const loadSessions = async () => {
    if (!barber?.uid) return;
    setLoading(true);
    try {
      const upcoming = await getUpcomingBookings(barber.uid, 2);
      setSessions(upcoming);
    } catch (err) {
      console.error("Error loading sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async (session) => {
    setSelectedSession(session);
    try {
      // Load comprehensive client info
      const [workout, parq, checkin] = await Promise.all([
        getClientWorkout(barber.uid, session.customerName),
        getClientParQ(barber.uid, session.customerName),
        getClientCheckIn(barber.uid, session.customerName),
      ]);

      setSessionDetails({
        session,
        workout,
        parq,
        checkin,
      });
    } catch (err) {
      console.error("Error loading session details:", err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress sx={{ color: brandColor }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
          Session Prep
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upcoming sessions in the next 2 hours. Real-time countdown and client information.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Auto-refreshes every 30 seconds
        </Typography>
      </Box>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", bgcolor: "#f5f5f5" }}>
          <Typography color="text.secondary">No sessions in the next 2 hours</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {sessions.map((session) => {
            const timeInfo = getTimeUntilSession(session.date, session.time);
            const isUrgent = timeInfo.status === "urgent" || timeInfo.status === "now";

            return (
              <Paper
                key={session.id}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: isUrgent ? `2px solid #ff9800` : "1px solid #e0e0e0",
                  bgcolor: isUrgent ? "#fff3e0" : "#fff",
                  transition: "all 0.2s",
                  cursor: "pointer",
                  "&:hover": {
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  },
                }}
                onClick={() => handleOpenSession(session)}
              >
                <Stack spacing={2}>
                  {/* Header row: Name, Time, Status */}
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
                    <Box>
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                        {session.customerName || "Client"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatSessionDate(session.date)} at {formatSessionTime(session.date, session.time)}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexShrink: 0 }}>
                      <Chip
                        icon={<TimerIcon />}
                        label={timeInfo.text}
                        sx={{
                          bgcolor: isUrgent ? "#ff6f00" : brandColor,
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: "0.75rem",
                        }}
                      />
                      {isUrgent && (
                        <Typography variant="caption" sx={{ color: "#f57c00", fontWeight: 700 }}>
                          ⚠️ URGENT
                        </Typography>
                      )}
                    </Box>
                  </Stack>

                  {/* Contact info grid */}
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ flexWrap: "wrap" }}>
                    {session.customerPhone && (
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flex: 1, minWidth: 200 }}>
                        <PhoneIcon fontSize="small" sx={{ color: brandColor }} />
                        <Typography variant="body2">{session.customerPhone}</Typography>
                      </Stack>
                    )}
                    {session.customerEmail && (
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flex: 1, minWidth: 200 }}>
                        <EmailIcon fontSize="small" sx={{ color: brandColor }} />
                        <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                          {session.customerEmail}
                        </Typography>
                      </Stack>
                    )}
                    {session.address && (
                      <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ flex: 1, minWidth: 200 }}>
                        <LocationIcon fontSize="small" sx={{ color: brandColor, mt: 0.5 }} />
                        <Box>
                          <Typography variant="body2">{session.address}</Typography>
                          <Button
                            size="small"
                            href={getGoogleMapsUrl(session.address)}
                            target="_blank"
                            sx={{ p: 0, mt: 0.5, textDecoration: "underline", fontSize: "0.75rem" }}
                          >
                            View on Maps
                          </Button>
                        </Box>
                      </Stack>
                    )}
                  </Stack>

                  {/* Action */}
                  <Box sx={{ textAlign: "right", pt: 1, borderTop: "1px solid #e0e0e0" }}>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: brandColor,
                        color: brandColor,
                        "&:hover": { bgcolor: `${brandColor}10` },
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSession(session);
                      }}
                    >
                      View Details
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Session Details Modal */}
      <Dialog
        open={!!selectedSession && !!sessionDetails}
        onClose={() => {
          setSelectedSession(null);
          setSessionDetails(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        {sessionDetails && (
          <>
            <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
              {sessionDetails.session.customerName || "Client"}
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Stack spacing={3}>
                {/* Session Info */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: brandColor }}>
                    Session Details
                  </Typography>
                  <Typography variant="body2">
                    📅 {formatSessionDate(sessionDetails.session.date)} at {formatSessionTime(sessionDetails.session.date, sessionDetails.session.time)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    ⏱️ {getTimeUntilSession(sessionDetails.session.date, sessionDetails.session.time).text}
                  </Typography>
                </Box>

                {/* Contact Info */}
                {(sessionDetails.session.customerPhone || sessionDetails.session.customerEmail || sessionDetails.session.address) && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: brandColor }}>
                      Client Information
                    </Typography>
                    {sessionDetails.session.customerPhone && (
                      <Typography variant="body2">
                        📞 {sessionDetails.session.customerPhone}
                      </Typography>
                    )}
                    {sessionDetails.session.customerEmail && (
                      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                        ✉️ {sessionDetails.session.customerEmail}
                      </Typography>
                    )}
                    {sessionDetails.session.address && (
                      <Box>
                        <Typography variant="body2">📍 {sessionDetails.session.address}</Typography>
                        <Button
                          size="small"
                          href={getGoogleMapsUrl(sessionDetails.session.address)}
                          target="_blank"
                          sx={{ p: 0, mt: 0.5, fontSize: "0.75rem" }}
                        >
                          View on Maps →
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}

                {/* PAR-Q Status */}
                {sessionDetails.parq && (
                  <Box sx={{ p: 1.5, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <CheckCircleIcon fontSize="small" sx={{ color: "#4caf50" }} />
                      <Typography variant="subtitle2" fontWeight={700}>
                        PAR-Q Submitted
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Completed: {new Date(sessionDetails.parq.submittedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}
                {!sessionDetails.parq && (
                  <Alert severity="warning" icon={<InfoIcon />}>
                    <Typography variant="body2" fontWeight={600}>
                      PAR-Q not yet submitted
                    </Typography>
                  </Alert>
                )}

                {/* Session Notes */}
                {sessionDetails.session.notes && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: brandColor }}>
                      Session Notes
                    </Typography>
                    <Typography variant="body2" sx={{ p: 1, bgcolor: "#f9f9f9", borderRadius: 1, whiteSpace: "pre-wrap" }}>
                      {sessionDetails.session.notes}
                    </Typography>
                  </Box>
                )}

                {/* Check-in */}
                {sessionDetails.checkin && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: brandColor }}>
                      Health Check-in (Today)
                    </Typography>
                    <Typography variant="body2" sx={{ p: 1, bgcolor: "#e8f5e9", borderRadius: 1 }}>
                      ✅ Check-in completed at {new Date(sessionDetails.checkin.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                  </Box>
                )}

                {/* Assigned Workout */}
                {sessionDetails.workout && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: brandColor }}>
                      Assigned Workout
                    </Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                      {sessionDetails.workout.name}
                    </Typography>
                    {sessionDetails.workout.exercises && sessionDetails.workout.exercises.length > 0 && (
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          First 3 exercises:
                        </Typography>
                        {sessionDetails.workout.exercises.slice(0, 3).map((ex, i) => (
                          <Typography key={i} variant="caption" sx={{ pl: 1 }}>
                            • {ex.name} — {ex.reps || "×"} reps
                          </Typography>
                        ))}
                        {sessionDetails.workout.exercises.length > 3 && (
                          <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
                            +{sessionDetails.workout.exercises.length - 3} more
                          </Typography>
                        )}
                      </Stack>
                    )}
                  </Box>
                )}
                {!sessionDetails.workout && (
                  <Alert severity="info" icon={<InfoIcon />}>
                    <Typography variant="body2">
                      No workout assigned for this client
                    </Typography>
                  </Alert>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setSelectedSession(null);
                  setSessionDetails(null);
                }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
