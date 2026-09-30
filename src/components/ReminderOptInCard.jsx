import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import IosShareIcon from "@mui/icons-material/IosShare";
import {
  notificationsSupported, currentPermission, needsIosInstall, subscribeForBookingReminders,
} from "../utils/pushNotifications";
import { reminderRulesFor } from "../config/reminders";

// "Get a free reminder on your phone" — shown on the booking confirmation and
// manage-booking pages, for every plan (push is the ONLY reminder channel on
// Free). Hidden silently when push is unsupported or permission is denied.
export default function ReminderOptInCard({ bookingId, barber, brandColor = "#2563EB", autoPrompt = false }) {
  const [state, setState] = useState("idle"); // idle | working | on | error
  const [alreadyOn, setAlreadyOn] = useState(false);

  const remindersOn = barber?.reminderSettings?.enabled !== false;
  const isFree = !reminderRulesFor(barber?.plan).email;

  // Returning clients are matched by email/phone on the server — no second opt-in.
  useEffect(() => {
    let live = true;
    fetch(`/api/client-push-status?bookingId=${encodeURIComponent(bookingId)}`)
      .then(r => r.json()).then(d => { if (live && d.subscribed) setAlreadyOn(true); }).catch(() => {});
    return () => { live = false; };
  }, [bookingId]);

  async function enable() {
    setState("working");
    const r = await subscribeForBookingReminders(bookingId);
    setState(r.ok ? "on" : "error");
  }

  useEffect(() => {
    if (autoPrompt && !alreadyOn && state === "idle" && !needsIosInstall() && notificationsSupported() && currentPermission() === "default") enable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrompt, alreadyOn]);

  if (!remindersOn) return null;
  if (alreadyOn || state === "on") {
    return <Alert severity="success" sx={{ mt: 2, textAlign: "left" }}>Reminders are on for this phone. You'll be reminded before your appointment.</Alert>;
  }

  // iOS Safari that isn't the installed PWA: never touch the push APIs.
  if (needsIosInstall()) {
    return (
      <Paper variant="outlined" sx={{ mt: 2, p: 2.5, borderRadius: 3, textAlign: "left", borderColor: isFree ? brandColor : undefined, borderWidth: isFree ? 2 : 1 }}>
        <Typography fontWeight={800} sx={{ display: "flex", alignItems: "center", gap: 1 }}><IosShareIcon fontSize="small" /> Get a free reminder on your phone</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Tap Share → Add to Home Screen, then open it to turn on reminders.</Typography>
        {isFree && <Typography variant="body2" fontWeight={700} mt={1}>This is the only way you'll get a reminder for this booking.</Typography>}
      </Paper>
    );
  }

  // Unsupported or permission denied: hide silently.
  if (!notificationsSupported() || currentPermission() === "denied") return null;

  return (
    <Paper variant="outlined" sx={{ mt: 2, p: 2.5, borderRadius: 3, textAlign: "left", borderColor: isFree ? brandColor : undefined, borderWidth: isFree ? 2 : 1, bgcolor: isFree ? "rgba(37,99,235,0.04)" : undefined }}>
      <Typography fontWeight={800} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <NotificationsActiveIcon fontSize="small" sx={{ color: brandColor }} /> Get a free reminder on your phone
      </Typography>
      {isFree
        ? <Typography variant="body2" fontWeight={700} mt={0.75}>This is the only way you'll get a reminder for this booking.</Typography>
        : <Typography variant="body2" color="text.secondary" mt={0.75}>Otherwise we'll email you.</Typography>}
      <Box mt={1.5}>
        <Button onClick={enable} disabled={state === "working"} variant={isFree ? "contained" : "outlined"} fullWidth
          sx={{ py: 1.25, borderRadius: 2, fontWeight: 700, ...(isFree ? { bgcolor: brandColor, "&:hover": { bgcolor: brandColor, filter: "brightness(0.92)" } } : { borderColor: brandColor, color: brandColor }) }}>
          {state === "working" ? "Enabling…" : "Enable reminders"}
        </Button>
      </Box>
      {state === "error" && <Typography variant="caption" color="text.secondary" display="block" mt={1}>Couldn't turn on notifications on this device.</Typography>}
    </Paper>
  );
}
