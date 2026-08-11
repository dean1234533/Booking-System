import React, { useEffect, useState } from "react";
import {
  Box, Typography, Button, Chip, Divider, CircularProgress, Alert,
} from "@mui/material";
import CheckCircleIcon   from "@mui/icons-material/CheckCircle";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import LinkOffIcon        from "@mui/icons-material/LinkOff";
import SyncIcon           from "@mui/icons-material/Sync";
import {
  initiateOutlookConnect,
  getOutlookTokens,
  getValidAccessToken,
  createOutlookCalendarEvent,
  disconnectOutlook,
} from "../../../firebase/outlook";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from "../../../firebase/config";

export default function IntegrationsTab({ barber, brandColor = "#C9A84C" }) {
  const uid = barber?.uid;
  const [outlook,    setOutlook]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [syncing,    setSyncing]    = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error,      setError]      = useState(null);

  useEffect(() => { load(); }, [uid]);

  async function load() {
    if (!uid) return;
    try {
      const tokens = await getOutlookTokens(uid);
      setOutlook(tokens?.accessToken ? tokens : null);
    } catch { setOutlook(null); }
    setLoading(false);
  }

  async function handleConnect() {
    if (!uid) return;
    initiateOutlookConnect(uid);
  }

  async function handleDisconnect() {
    if (!window.confirm("Disconnect Outlook Calendar?")) return;
    await disconnectOutlook(uid);
    setOutlook(null);
    setSyncResult(null);
  }

  async function handleSync() {
    if (!uid) return;
    setSyncing(true);
    setError(null);
    setSyncResult(null);
    try {
      const accessToken = await getValidAccessToken(uid);
      if (!accessToken) throw new Error("No valid Outlook token — please reconnect.");

      const snap = await getDocs(
        query(collection(db, "bookings"), where("barberId", "==", uid))
      );
      const bookings = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(b => b.status !== "cancelled" && !b.outlookSynced);

      let synced = 0;
      for (const booking of bookings) {
        try {
          const event = await createOutlookCalendarEvent(accessToken, booking);
          await updateDoc(doc(db, "bookings", booking.id), {
            outlookSynced: true,
            outlookEventId: event.id,
          });
          synced++;
        } catch (e) {
          console.warn("Failed to sync booking", booking.id, e.message);
        }
      }

      setSyncResult({ synced, total: bookings.length });
    } catch (e) {
      setError(e.message || "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <Box display="flex" justifyContent="center" pt={4}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={0.5}>Integrations</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Connect third-party tools to your Bookrightly account.
      </Typography>

      {/* Outlook Calendar */}
      <Box sx={{
        border: "1px solid #ededf1", borderRadius: "14px", p: 3,
        display: "flex", flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "center" }, gap: 2,
      }}>
        <Box sx={{
          width: 48, height: 48, borderRadius: "12px", flexShrink: 0,
          bgcolor: "#0078D4", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <CalendarMonthIcon sx={{ color: "#fff", fontSize: 26 }} />
        </Box>

        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={1} mb={0.25}>
            <Typography fontWeight={700}>Outlook Calendar</Typography>
            {outlook ? (
              <Chip label="Connected" size="small" color="success" icon={<CheckCircleIcon />} />
            ) : (
              <Chip label="Not connected" size="small" variant="outlined" />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {outlook
              ? "New bookings are synced to your Outlook calendar automatically."
              : "Auto-add bookings to your Microsoft Outlook or Office 365 calendar."}
          </Typography>

          {syncResult && (
            <Alert severity="success" sx={{ mt: 1.5, py: 0.5 }}>
              Synced {syncResult.synced} of {syncResult.total} booking{syncResult.total !== 1 ? "s" : ""}.
              {syncResult.total === 0 && " All bookings are already synced."}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 1.5, py: 0.5 }}>{error}</Alert>
          )}
        </Box>

        <Box display="flex" gap={1} flexShrink={0}>
          {outlook ? (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={syncing ? <CircularProgress size={14} /> : <SyncIcon />}
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? "Syncing..." : "Sync now"}
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<LinkOffIcon />}
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={handleConnect}
              sx={{ bgcolor: "#0078D4", "&:hover": { bgcolor: "#006CC1" } }}
            >
              Connect Outlook
            </Button>
          )}
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="body2" color="text.secondary">
        More integrations coming soon — Google Calendar, iCal, Zapier.
      </Typography>
    </Box>
  );
}
