import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, Divider, FormControlLabel, FormGroup, Checkbox, MenuItem, Paper, Stack, Switch, TextField, Typography,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../../firebase/config";
import {
  REMINDER_OFFSETS, REMINDER_OFFSET_IDS, DEFAULT_REMINDER_SETTINGS, SMS_ENABLED, resolveReminderSettings,
} from "../../../config/reminders";
import { zonedMonthKey, safeTimezone } from "../../../reminders/time";

export default function RemindersTab({ barber, profile = {}, brandColor = "#2563EB", onNavigate }) {
  const uid = barber?.uid || barber?.id;
  const plan = profile.plan || barber?.plan || "free";
  const saved = profile.reminderSettings || barber?.reminderSettings || {};
  const eff = resolveReminderSettings(plan, saved);
  const rules = eff.rules;
  const isFree = !rules.editableSchedule;
  const month = zonedMonthKey(Date.now(), safeTimezone(profile.timezone || barber?.timezone));

  const [enabled, setEnabled] = useState(eff.enabled);
  const [offsets, setOffsets] = useState({ ...DEFAULT_REMINDER_SETTINGS.offsets, ...(saved.offsets || {}) });
  const [morningTime, setMorningTime] = useState(saved.morningTime || DEFAULT_REMINDER_SETTINGS.morningTime);
  const [smsFallback, setSmsFallback] = useState(saved.smsFallback === true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [usage, setUsage] = useState({});
  const [logs, setLogs] = useState([]);
  const [testChannel, setTestChannel] = useState("push");
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!uid) return undefined;
    const u1 = onSnapshot(doc(db, "barbers", uid, "reminderUsage", month), s => setUsage(s.data() || {}), () => {});
    const u2 = onSnapshot(query(collection(db, "reminderLogs"), where("businessId", "==", uid), where("month", "==", month)),
      s => setLogs(s.docs.map(d => d.data())), () => {});
    return () => { u1(); u2(); };
  }, [uid, month]);

  const stats = useMemo(() => {
    const sent = logs.filter(l => l.status === "sent");
    const by = c => sent.filter(l => l.finalChannel === c).length;
    const total = sent.length || 0;
    const pct = n => (total ? Math.round((n / total) * 100) : 0);
    return {
      total, push: by("push"), email: by("email"), sms: by("sms"),
      pushPct: pct(by("push")), emailPct: pct(by("email")), smsPct: pct(by("sms")),
      notReminded: logs.filter(l => l.status !== "sent" && l.status !== "processing").length,
      noPushFree: logs.filter(l => l.reason === "no-push" && l.plan === "free").length,
    };
  }, [logs]);

  async function save(patch) {
    setSaving(true); setMsg(null);
    try {
      await updateDoc(doc(db, "barbers", uid), { reminderSettings: { ...saved, ...patch } });
      setMsg({ severity: "success", text: "Saved." });
    } catch { setMsg({ severity: "error", text: "Couldn't save — try again." }); }
    setSaving(false);
  }

  async function sendTest(channel, simulate) {
    setTesting(true); setTestResult(null);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch("/api/reminders/test", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channel, simulate }),
      });
      setTestResult(await res.json());
    } catch (e) { setTestResult({ ok: false, error: e.message }); }
    setTesting(false);
  }

  const upgrade = <Button size="small" variant="contained" onClick={() => onNavigate?.("finance")} sx={{ bgcolor: brandColor, fontWeight: 700 }}>Upgrade</Button>;
  const locked = label => (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ opacity: 0.75, py: 0.5 }}>
      <LockIcon fontSize="small" /><Typography variant="body2" sx={{ flex: 1 }}>{label}</Typography>{upgrade}
    </Stack>
  );
  const allowedChannels = ["push", ...(rules.email ? ["email"] : []), ...(rules.sms ? ["sms"] : [])];

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={800}>Client reminders</Typography>
        <Typography variant="body2" color="text.secondary" mb={1.5}>
          Clients are reminded by the cheapest channel that works: push notification first{rules.email ? ", then email" : ""}{rules.sms ? ", then SMS" : ""}. One reminder is only ever sent on one channel.
        </Typography>

        {isFree ? (
          <>
            <FormControlLabel
              control={<Switch checked={enabled} onChange={e => { setEnabled(e.target.checked); save({ enabled: e.target.checked }); }} />}
              label={`Push reminders: ${enabled ? "ON" : "OFF"}, 24 hours before`} />
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="overline" color="text.secondary">Included on paid plans</Typography>
            {locked("Extra reminder times (morning of, 2 hours, 1 hour)")}
            {locked("Email fallback (Basic and Full)")}
            {SMS_ENABLED && locked("SMS last-resort (Full)")}
            <Alert severity="info" sx={{ mt: 2 }} action={upgrade}>
              {stats.noPushFree} client{stats.noPushFree === 1 ? "" : "s"} this month had no reminder because they hadn't turned on notifications. Upgrade to email them automatically.
            </Alert>
          </>
        ) : (
          <>
            <FormControlLabel control={<Switch checked={enabled} onChange={e => setEnabled(e.target.checked)} />} label={`Reminders ${enabled ? "ON" : "OFF"}`} />
            <Typography variant="subtitle2" fontWeight={800} mt={1}>Reminder schedule</Typography>
            <FormGroup>
              {REMINDER_OFFSET_IDS.map(id => (
                <Box key={id} display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                  <FormControlLabel
                    control={<Checkbox checked={!!offsets[id]} onChange={e => setOffsets(o => ({ ...o, [id]: e.target.checked }))} />}
                    label={REMINDER_OFFSETS[id].label} />
                  {id === "morning" && offsets.morning && (
                    <TextField type="time" size="small" value={morningTime} onChange={e => setMorningTime(e.target.value)} sx={{ width: 130 }} />
                  )}
                </Box>
              ))}
            </FormGroup>
            {SMS_ENABLED && (
              <>
                <Divider sx={{ my: 1.5 }} />
                {rules.sms ? (
                  <FormControlLabel control={<Switch checked={smsFallback} onChange={e => setSmsFallback(e.target.checked)} />}
                    label="SMS last-resort (only if push and email both fail)" />
                ) : locked("SMS last-resort — Full plan only")}
              </>
            )}
            <Box mt={1.5}>
              <Button variant="contained" disabled={saving} onClick={() => save({ enabled, offsets, morningTime, smsFallback: rules.sms ? smsFallback : false })} sx={{ bgcolor: brandColor, fontWeight: 700 }}>
                {saving ? "Saving…" : "Save reminder settings"}
              </Button>
            </Box>
            {msg && <Alert severity={msg.severity} sx={{ mt: 1.5 }}>{msg.text}</Alert>}
          </>
        )}
      </Paper>

      {!isFree && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight={800}>Usage this month</Typography>
          <Typography variant="body2" color="text.secondary">
            Push: {usage.push || 0} · Email: {usage.email || 0} of {rules.emailLimit}{rules.sms ? ` · SMS: ${usage.sms || 0} of ${rules.smsLimit}` : ""}
          </Typography>
          <Typography variant="caption" color="text.secondary">Email and SMS counters reset on the 1st of each month.</Typography>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={800}>This month</Typography>
        {stats.total === 0
          ? <Typography variant="body2" color="text.secondary">No reminders sent yet this month.</Typography>
          : <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
              <Chip label={`Push ${stats.pushPct}% (${stats.push})`} />
              {!isFree && <Chip label={`Email ${stats.emailPct}% (${stats.email})`} />}
              {rules.sms && <Chip label={`SMS ${stats.smsPct}% (${stats.sms})`} />}
            </Stack>}
        <Typography variant="body2" color="text.secondary" mt={1}>Clients not reminded: {stats.notReminded}</Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={800} mb={1}>Send a test reminder to yourself</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
          <TextField select size="small" label="Channel" value={testChannel} onChange={e => setTestChannel(e.target.value)} sx={{ minWidth: 150 }}>
            {allowedChannels.map(c => <MenuItem key={c} value={c}>{c === "sms" ? "SMS" : c[0].toUpperCase() + c.slice(1)}</MenuItem>)}
          </TextField>
          <Button variant="outlined" disabled={testing} onClick={() => sendTest(testChannel)}>Send test</Button>
          {!isFree && <Button variant="text" disabled={testing} onClick={() => sendTest("chain", "push-fail")}>Simulate: push fails</Button>}
          {rules.sms && <Button variant="text" disabled={testing} onClick={() => sendTest("chain", "push-email-fail")}>Simulate: push + email fail</Button>}
        </Stack>
        {testResult && (
          <Alert severity={testResult.ok ? "success" : "warning"} sx={{ mt: 1.5 }}>
            {testResult.error || (testResult.result
              ? `Result: ${testResult.result.finalChannel} — ` + testResult.result.attempts.map(a => `${a.channel} ${a.status}${a.reason ? ` (${a.reason})` : ""}`).join(" → ")
              : "Sent.")}
          </Alert>
        )}
        <Typography variant="caption" color="text.secondary" display="block" mt={1}>Test sends go to you and don't count towards your monthly limits. Push tests need your own notifications switched on in Notifications.</Typography>
      </Paper>
    </Stack>
  );
}
