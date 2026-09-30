import React, { useEffect, useState } from "react";
import { Alert, Button } from "@mui/material";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { USAGE_WARN_THRESHOLD, resolveReminderSettings } from "../../config/reminders";
import { zonedMonthKey, safeTimezone } from "../../reminders/time";

// Warns at 80% and again at 100% of the monthly email / SMS reminder caps.
export default function ReminderUsageBanner({ barberId, profile = {}, onNavigate }) {
  const [usage, setUsage] = useState({});
  const eff = resolveReminderSettings(profile.plan, profile.reminderSettings);
  const month = zonedMonthKey(Date.now(), safeTimezone(profile.timezone));

  useEffect(() => {
    if (!barberId) return undefined;
    return onSnapshot(doc(db, "barbers", barberId, "reminderUsage", month), s => setUsage(s.data() || {}), () => {});
  }, [barberId, month]);

  const items = [];
  if (eff.enabled && eff.rules.email) items.push({ name: "email", used: usage.email || 0, limit: eff.rules.emailLimit });
  if (eff.enabled && eff.rules.sms && eff.smsFallback) items.push({ name: "SMS", used: usage.sms || 0, limit: eff.rules.smsLimit });

  return items.filter(i => i.limit > 0 && i.used >= i.limit * USAGE_WARN_THRESHOLD).map(i => {
    const full = i.used >= i.limit;
    return (
      <Alert key={i.name} severity={full ? "error" : "warning"} sx={{ mb: 2 }}
        action={<Button color="inherit" size="small" onClick={() => onNavigate?.("reminders")} sx={{ fontWeight: 750 }}>View</Button>}>
        {full
          ? `You've used all ${i.limit} ${i.name} reminders this month. Clients without push notifications won't get ${i.name} reminders until the 1st.`
          : `You've used ${i.used} of ${i.limit} ${i.name} reminders this month (${Math.round((i.used / i.limit) * 100)}%).`}
      </Alert>
    );
  });
}
