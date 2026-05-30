import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Button,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Chip,
  Grid,
} from "@mui/material";
import {
  Link as LinkIcon,
  Sync as SyncIcon,
  Logout as LogoutIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { getCalendarSettings, updateCalendarSettings, disconnectCalendar } from "../../../firebase/firestore";

export default function CalendarSyncTab({ barber, brandColor, profile }) {
  const [calendarSettings, setCalendarSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setsyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState(null);
  const [displayMode, setDisplayMode] = useState("all-times");

  useEffect(() => {
    loadSettings();
  }, [barber?.uid]);

  const loadSettings = async () => {
    if (!barber?.uid) return;
    setLoading(true);
    try {
      const settings = await getCalendarSettings(barber.uid);
      if (settings) {
        setCalendarSettings(settings);
        setDisplayMode(settings.displayMode || "all-times");
      }
    } catch (err) {
      console.error("Error loading calendar settings:", err);
      setMessage({ type: "error", text: "Failed to load calendar settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    setConnecting(true);
    try {
      const response = await fetch("/api/google-calendar/auth-url");
      const data = await response.json();

      if (data.authUrl) {
        // Store state and userId in sessionStorage for CSRF protection
        sessionStorage.setItem("google_oauth_state", data.state);
        sessionStorage.setItem("google_oauth_userId", barber.uid);
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.error || "Failed to get auth URL");
      }
    } catch (err) {
      console.error("Error connecting Google Calendar:", err);
      setMessage({ type: "error", text: err.message });
      setConnecting(false);
    }
  };

  // Handle OAuth callback (called on page load if URL has code param)
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");

      if (!code) return;

      const storedState = sessionStorage.getItem("google_oauth_state");
      const userId = sessionStorage.getItem("google_oauth_userId");

      if (!storedState || storedState !== state || !userId) {
        setMessage({ type: "error", text: "OAuth state mismatch - possible CSRF attack" });
        return;
      }

      setConnecting(true);
      try {
        // Exchange code for tokens via API
        const response = await fetch("/api/google-calendar/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, userId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "OAuth callback failed");
        }

        // Store tokens in Firestore
        await updateCalendarSettings(barber.uid, {
          googleAccessToken: data.accessToken,
          googleRefreshToken: data.refreshToken,
          tokenExpiresAt: data.expiresAt,
          googleCalendarId: "primary",
          linkedEmail: data.email,
          syncEnabled: true,
          lastSyncedAt: new Date().toISOString(),
          displayMode: "all-times",
        });

        setCalendarSettings({
          googleAccessToken: data.accessToken,
          linkedEmail: data.email,
          syncEnabled: true,
          lastSyncedAt: new Date().toISOString(),
          displayMode: "all-times",
        });

        setMessage({ type: "success", text: `Connected to Google Calendar as ${data.email}` });

        // Clean up and redirect
        sessionStorage.removeItem("google_oauth_state");
        sessionStorage.removeItem("google_oauth_userId");
        window.history.replaceState({}, "", "/dashboard?tab=calendar");
      } catch (err) {
        console.error("OAuth callback error:", err);
        setMessage({ type: "error", text: err.message });
      } finally {
        setConnecting(false);
      }
    };

    handleOAuthCallback();
  }, [barber?.uid]);

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect Google Calendar? Bookings will no longer sync to your calendar."))
      return;

    try {
      await disconnectCalendar(barber.uid);
      setCalendarSettings(null);
      setDisplayMode("all-times");
      setMessage({ type: "success", text: "Calendar disconnected" });
    } catch (err) {
      console.error("Error disconnecting:", err);
      setMessage({ type: "error", text: "Failed to disconnect calendar" });
    }
  };

  const handleSyncNow = async () => {
    if (!barber?.uid) return;
    setsyncing(true);
    try {
      const response = await fetch("/api/google-calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: barber.uid, days: 30 }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage({
          type: "success",
          text: `Synced! Found ${data.eventsCount} calendar events`,
        });
        await loadSettings();
      } else {
        throw new Error(data.error || "Sync failed");
      }
    } catch (err) {
      console.error("Sync error:", err);
      setMessage({ type: "error", text: err.message });
    } finally {
      setsyncing(false);
    }
  };

  const handleDisplayModeChange = async (mode) => {
    setDisplayMode(mode);
    try {
      await updateCalendarSettings(barber.uid, {
        displayMode: mode,
      });
      setMessage({ type: "success", text: "Display mode updated" });
    } catch (err) {
      console.error("Error updating display mode:", err);
      setMessage({ type: "error", text: "Failed to save settings" });
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
          📅 Calendar Sync
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Connect your Google Calendar to sync bookings automatically. When a client books an appointment, it will
          appear on your calendar and an invite will be sent to them.
        </Typography>

        {message && (
          <Alert
            severity={message.type}
            onClose={() => setMessage(null)}
            sx={{ mb: 2 }}
          >
            {message.text}
          </Alert>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Left: Connection Status */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
              Connection Status
            </Typography>

            {calendarSettings?.syncEnabled ? (
              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleIcon sx={{ color: "#4caf50", fontSize: 24 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Connected
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {calendarSettings.linkedEmail}
                    </Typography>
                  </Box>
                </Box>

                {calendarSettings.lastSyncedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Last synced:{" "}
                    {new Date(calendarSettings.lastSyncedAt).toLocaleString()}
                  </Typography>
                )}

                <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                  <Button
                    fullWidth
                    size="small"
                    startIcon={<SyncIcon />}
                    variant="outlined"
                    onClick={handleSyncNow}
                    disabled={syncing}
                    sx={{ color: brandColor, borderColor: brandColor }}
                  >
                    {syncing ? "Syncing..." : "Sync Now"}
                  </Button>
                  <Button
                    fullWidth
                    size="small"
                    startIcon={<LogoutIcon />}
                    variant="outlined"
                    color="error"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Not connected
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<LinkIcon />}
                  onClick={handleConnectGoogle}
                  disabled={connecting}
                  sx={{
                    bgcolor: brandColor,
                    "&:hover": { bgcolor: brandColor, opacity: 0.9 },
                  }}
                >
                  {connecting ? "Connecting..." : "Connect Google Calendar"}
                </Button>
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Right: Display Mode Settings */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 3 }}>
              Booking Slot Display Mode
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose how clients see available times:
            </Typography>

            <RadioGroup
              value={displayMode}
              onChange={(e) => handleDisplayModeChange(e.target.value)}
            >
              {/* Option 1: Free Slots */}
              <Box sx={{ mb: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                <FormControlLabel
                  value="free-slots"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Show only free slots
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Hide any slot where you have a calendar event
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              {/* Option 2: Availability Blocks */}
              <Box sx={{ mb: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                <FormControlLabel
                  value="availability-blocks"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Show your availability blocks only
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Only show slots within your marked availability windows
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              {/* Option 3: All Times */}
              <Box sx={{ mb: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                <FormControlLabel
                  value="all-times"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Show all times
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ignore calendar, show all slots (current behavior)
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </RadioGroup>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ p: 2, bgcolor: "#e3f2fd", borderRadius: 1 }}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <InfoIcon sx={{ color: "#1976d2", mt: 0.5, flexShrink: 0 }} />
                <Box>
                  <Typography variant="caption" fontWeight={600} sx={{ display: "block", mb: 0.5 }}>
                    How it works:
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    When a client books an appointment, it will automatically be added to your Google Calendar
                    and they'll receive a calendar invite by email.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Info Section */}
      {calendarSettings?.syncEnabled && (
        <Paper sx={{ p: 3, mt: 3, borderRadius: 2, bgcolor: "#f9f9f9" }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
            ✨ What happens when someone books:
          </Typography>
          <Stack component="ol" spacing={1} sx={{ pl: 2 }}>
            <li>
              <Typography variant="body2">
                ✅ Event created in your Google Calendar
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                ✅ Calendar invite emailed to the client
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                ✅ Client can add to their calendar with one click
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                ✅ If booking cancelled, event removed from your calendar
              </Typography>
            </li>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
