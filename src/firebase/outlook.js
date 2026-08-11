import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./config";

const SCOPES = "Calendars.ReadWrite offline_access";
const REDIRECT_URI = () => `${window.location.origin}/auth/outlook/callback`;

export function initiateOutlookConnect(uid) {
  const state = `${uid}:${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem("outlook_state", state);
  const url = new URL("https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize");
  url.searchParams.set("client_id", import.meta.env.VITE_MICROSOFT_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", REDIRECT_URI());
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("response_mode", "query");
  window.location.href = url.toString();
}

export async function exchangeOutlookCode(code) {
  const res = await fetch("/api/outlook/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: REDIRECT_URI() }),
  });
  if (!res.ok) throw new Error("Token exchange failed");
  return res.json();
}

export async function refreshOutlookToken(refreshToken) {
  const res = await fetch("/api/outlook/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error("Token refresh failed");
  return res.json();
}

export async function saveOutlookTokens(uid, tokens) {
  const expiry = Date.now() + tokens.expires_in * 1000;
  await setDoc(doc(db, "barbers", uid, "integrations", "outlook"), {
    accessToken:  tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiry,
    connectedAt:  Date.now(),
  });
}

export async function getOutlookTokens(uid) {
  const snap = await getDoc(doc(db, "barbers", uid, "integrations", "outlook"));
  if (!snap.exists()) return null;
  return snap.data();
}

export async function getValidAccessToken(uid) {
  let tokens = await getOutlookTokens(uid);
  if (!tokens) return null;

  if (Date.now() > tokens.expiry - 60_000) {
    const refreshed = await refreshOutlookToken(tokens.refreshToken);
    await saveOutlookTokens(uid, refreshed);
    tokens = await getOutlookTokens(uid);
  }
  return tokens.accessToken;
}

export async function createOutlookCalendarEvent(accessToken, booking) {
  const [year, month, day] = (booking.date || "").split("-").map(Number);
  const [hour, minute]     = (booking.time || "00:00").split(":").map(Number);
  const start = new Date(year, month - 1, day, hour, minute);
  const durationMins = Number(booking.duration) || 60;
  const end = new Date(start.getTime() + durationMins * 60_000);

  const toISO = d => d.toISOString().slice(0, 19);

  const event = {
    subject: `${booking.service || "Appointment"} — ${booking.name || booking.clientName || "Client"}`,
    body: {
      contentType: "text",
      content: [
        `Client: ${booking.name || booking.clientName || "N/A"}`,
        `Service: ${booking.service || "Appointment"}`,
        `Phone: ${booking.phone || "N/A"}`,
        `Email: ${booking.email || "N/A"}`,
        `Notes: ${booking.notes || "—"}`,
      ].join("\n"),
    },
    start: { dateTime: toISO(start), timeZone: "Europe/London" },
    end:   { dateTime: toISO(end),   timeZone: "Europe/London" },
  };

  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to create calendar event");
  }
  return res.json();
}

export async function disconnectOutlook(uid) {
  await setDoc(doc(db, "barbers", uid, "integrations", "outlook"), {});
}

export async function checkOutlookAvailability(uid, date, time, durationMins = 60) {
  const accessToken = await getValidAccessToken(uid);
  if (!accessToken) return { available: true, conflict: null };

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute]     = time.split(":").map(Number);
  const start = new Date(year, month - 1, day, hour, minute);
  const end   = new Date(start.getTime() + durationMins * 60_000);

  const params = new URLSearchParams({
    startDateTime: start.toISOString(),
    endDateTime:   end.toISOString(),
    $select:       "subject,start,end,showAs",
    $filter:       "showAs ne 'free'",
  });

  const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return { available: true, conflict: null };

  const data = await res.json();
  const events = data.value || [];
  if (events.length === 0) return { available: true, conflict: null };

  return {
    available: false,
    conflict: events[0].subject || "Existing appointment",
  };
}
