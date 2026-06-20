import React, { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, Switch, FormControlLabel,
  Button, Alert, Divider, Stack, Chip,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon   from "@mui/icons-material/NotificationsOff";
import VolumeUpIcon            from "@mui/icons-material/VolumeUp";
import VolumeOffIcon           from "@mui/icons-material/VolumeOff";
import PhoneAndroidIcon        from "@mui/icons-material/PhoneAndroid";
import SendIcon                from "@mui/icons-material/Send";
import CheckCircleIcon         from "@mui/icons-material/CheckCircle";
import {
  requestAndSubscribe, getExistingSubscription,
  unsubscribeFromPush, notificationsSupported, currentPermission,
} from "../../../utils/pushNotifications";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";

const SERIF = "'Playfair Display', serif";
const SANS  = "'DM Sans', sans-serif";

export default function NotificationSettingsTab({ barber, brandColor = "#C9A84C" }) {
  const [enabled,    setEnabled]    = useState(false);
  const [sound,      setSound]      = useState(true);
  const [vibrate,    setVibrate]    = useState(true);
  const [loading,    setLoading]    = useState(true);
  const [testSent,   setTestSent]   = useState(false);
  const [error,      setError]      = useState("");
  const [permission, setPermission] = useState(currentPermission());
  const [supported]                 = useState(notificationsSupported());

  const uid = barber?.uid || barber?.id;

  // Load saved prefs from Firestore on mount
  useEffect(() => {
    if (!uid) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "barbers", uid));
        if (snap.exists()) {
          const d = snap.data();
          const prefs = d.notificationPrefs || {};
          setSound(prefs.sound   !== false);
          setVibrate(prefs.vibrate !== false);
        }
        const sub = await getExistingSubscription();
        setEnabled(!!sub && permission === 'granted');
      } catch (e) {
        console.error("Error loading notification prefs:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  // Save prefs to Firestore whenever sound/vibrate toggles change
  async function savePrefs(newSound, newVibrate) {
    if (!uid) return;
    try {
      await updateDoc(doc(db, "barbers", uid), {
        "notificationPrefs.sound":   newSound,
        "notificationPrefs.vibrate": newVibrate,
      });
    } catch (e) {
      console.error("Error saving notification prefs:", e);
    }
  }

  async function handleToggleEnabled() {
    setError("");
    if (enabled) {
      // Disable
      await unsubscribeFromPush();
      if (uid) await updateDoc(doc(db, "barbers", uid), { pushSubscription: null });
      setEnabled(false);
    } else {
      // Enable
      setLoading(true);
      const result = await requestAndSubscribe();
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      const subJson = result.subscription.toJSON();
      if (uid) {
        await updateDoc(doc(db, "barbers", uid), {
          pushSubscription: subJson,
          "notificationPrefs.sound":   sound,
          "notificationPrefs.vibrate": vibrate,
        });
      }
      setEnabled(true);
      setPermission('granted');
    }
  }

  async function handleSoundToggle(e) {
    const val = e.target.checked;
    setSound(val);
    await savePrefs(val, vibrate);
  }

  async function handleVibrateToggle(e) {
    const val = e.target.checked;
    setVibrate(val);
    await savePrefs(sound, val);
  }

  async function handleTestNotification() {
    if (!uid) return;
    setTestSent(false);
    setError("");
    try {
      const res = await fetch("/api/send-push", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: uid,
          payload: {
            title:   "Bookrty Test 🎉",
            body:    "Push notifications are working! You'll be notified of new bookings.",
            sound,
            vibrate,
            url: "/dashboard",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    } catch (e) {
      setError("Test failed: " + e.message);
    }
  }

  if (!supported) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ fontFamily: SANS }}>
          Push notifications are not supported in this browser. Install the Bookrty app or use Chrome/Safari for notifications.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 600, mx: "auto" }}>
      <Typography sx={{ fontFamily: SERIF, fontSize: "1.5rem", color: "#1a1a1a", mb: 0.5, fontWeight: 600 }}>
        Push Notifications
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: "0.85rem", color: "#666", mb: 3 }}>
        Get notified instantly when a new booking arrives, even when the dashboard is closed.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, fontFamily: SANS }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Main enable toggle */}
      <Card sx={{ mb: 3, border: `2px solid ${enabled ? brandColor : "#e0e0e0"}`, borderRadius: "14px", transition: "border-color 0.2s" }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{
                width: 48, height: 48, borderRadius: "12px",
                bgcolor: enabled ? `${brandColor}22` : "#f5f5f5",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s",
              }}>
                {enabled
                  ? <NotificationsActiveIcon sx={{ color: brandColor, fontSize: 24 }} />
                  : <NotificationsOffIcon    sx={{ color: "#999",      fontSize: 24 }} />
                }
              </Box>
              <Box>
                <Typography sx={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.95rem" }}>
                  Enable Push Notifications
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", color: "#888" }}>
                  {permission === 'denied'
                    ? "Blocked in browser — check site settings"
                    : enabled
                      ? "Active — you will receive notifications"
                      : "Tap to enable booking alerts"
                  }
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={enabled}
              onChange={handleToggleEnabled}
              disabled={loading || permission === 'denied'}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: brandColor },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: brandColor },
              }}
            />
          </Box>

          {enabled && (
            <Chip
              icon={<CheckCircleIcon />}
              label="Subscribed"
              size="small"
              sx={{ mt: 2, bgcolor: `${brandColor}15`, color: brandColor, border: `1px solid ${brandColor}44`, fontFamily: SANS, fontSize: "0.72rem" }}
            />
          )}
        </CardContent>
      </Card>

      {/* Sound & Vibration settings */}
      <Card sx={{ mb: 3, borderRadius: "14px", border: "1px solid #e8e8e8", opacity: enabled ? 1 : 0.5, transition: "opacity 0.2s" }}>
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.85rem", color: "#555", mb: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Alert Style
          </Typography>

          <Stack divider={<Divider />} spacing={0}>
            {/* Sound */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {sound
                  ? <VolumeUpIcon  sx={{ color: brandColor, fontSize: 22 }} />
                  : <VolumeOffIcon sx={{ color: "#ccc",    fontSize: 22 }} />
                }
                <Box>
                  <Typography sx={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.88rem" }}>Sound</Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.75rem", color: "#999" }}>
                    Play your device's notification sound
                  </Typography>
                </Box>
              </Box>
              <Switch
                checked={sound}
                onChange={handleSoundToggle}
                disabled={!enabled}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: brandColor },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: brandColor },
                }}
              />
            </Box>

            {/* Vibration */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <PhoneAndroidIcon sx={{ color: vibrate ? brandColor : "#ccc", fontSize: 22 }} />
                <Box>
                  <Typography sx={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.88rem" }}>Vibrate</Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.75rem", color: "#999" }}>
                    Vibrate when a notification arrives
                  </Typography>
                </Box>
              </Box>
              <Switch
                checked={vibrate}
                onChange={handleVibrateToggle}
                disabled={!enabled}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: brandColor },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: brandColor },
                }}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Test button */}
      {enabled && (
        <Button
          fullWidth
          variant="outlined"
          startIcon={testSent ? <CheckCircleIcon /> : <SendIcon />}
          onClick={handleTestNotification}
          sx={{
            borderColor: testSent ? "#22c55e" : brandColor,
            color:       testSent ? "#22c55e" : brandColor,
            fontFamily: SANS,
            fontWeight: 600,
            py: 1.25,
            borderRadius: "10px",
            textTransform: "none",
            fontSize: "0.88rem",
            "&:hover": { bgcolor: testSent ? "#22c55e11" : `${brandColor}11`, borderColor: testSent ? "#22c55e" : brandColor },
          }}
        >
          {testSent ? "Test notification sent!" : "Send a test notification"}
        </Button>
      )}

      <Typography sx={{ mt: 3, fontFamily: SANS, fontSize: "0.73rem", color: "#aaa", lineHeight: 1.6 }}>
        Notifications are delivered via your browser's push service. They work when the app is installed or when your browser is open in the background. Install the Bookrty app for the most reliable experience.
      </Typography>
    </Box>
  );
}
