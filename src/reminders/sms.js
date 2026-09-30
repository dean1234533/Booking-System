// SMS: UK number normalisation, sender ID, template, and the Twilio adapter.
// Everything provider-specific lives in sendSms() — swap providers by
// replacing that one function.

// "07700 900123" | "+44 7700 900123" | "0044 7700 900123" -> "+447700900123", else null.
export function normaliseUkMobile(input) {
  if (!input) return null;
  let d = String(input).replace(/[\s\-().]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("0044")) d = d.slice(4);
  else if (d.startsWith("44")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  else return null;
  return /^7\d{9}$/.test(d) ? `+44${d}` : null;
}

// Alphanumeric sender ID: business name, letters/numbers only, max 11 chars,
// must contain a letter; otherwise "Bookrightly".
export function smsSenderId(businessName) {
  const s = String(businessName || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 11);
  return /[A-Za-z]/.test(s) ? s : "Bookrightly";
}

// "Reminder: {service} at {business} {day} {time}. Manage: {shortLink}" — hard 160-char cap.
export function buildSmsText({ service, business, day, time, shortLink }) {
  const make = (svc, biz) => `Reminder: ${svc || "appointment"} at ${biz} ${day} ${time}. Manage: ${shortLink}`;
  let svc = String(service || "").trim(), biz = String(business || "your appointment").trim();
  // Trim whichever of service/business is longer until it fits (min 6 chars each).
  while (make(svc, biz).length > 160 && (svc.length > 6 || biz.length > 6)) {
    if (svc.length >= biz.length && svc.length > 6) svc = svc.slice(0, -1); else biz = biz.slice(0, -1);
  }
  const text = make(svc, biz);
  return text.length > 160 ? text.slice(0, 160) : text;
}

// Twilio Messages API. Returns { ok, sid } or { ok:false, reason }.
export async function sendSms({ to, from, body }, env, { signal } = {}) {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return { ok: false, reason: "sms-not-configured" };
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
      signal,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 201 || res.status === 200) return { ok: true, sid: data.sid };
    return { ok: false, reason: `twilio ${data.code || res.status}: ${data.message || "send failed"}` };
  } catch (err) {
    return { ok: false, reason: `twilio error: ${err.message}` };
  }
}
