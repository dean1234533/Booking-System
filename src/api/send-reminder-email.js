/**
 * /functions/api/send-reminder-email.js
 *
 * Sends a reminder email to the barber listing all upcoming sessions
 * in a consecutive block of bookings via Brevo.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Parse request body
  const body = await request.json().catch(() => ({}));
  const {
    barberEmail,
    barberName,
    businessName,
    brandColor,
    date,
    reminderTime,
    block, // Array of { time, clientName, service, phone, notes }
  } = body;

  // 2. Validate required fields
  if (!barberEmail || !block?.length) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ─── Format date for display ──────────────────────────────────────────────
  const displayDate = new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const isBlock = block.length > 1;
  const firstTime = block[0].time;
  const lastTime = block[block.length - 1].time;

  // ─── Build email HTML ─────────────────────────────────────────────────────
  const appointmentRows = block
    .map(
      (appt) => `
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #f0f0f0;">
          <strong style="font-size:16px; color:#1A1A1A;">${appt.time}</strong>
        </td>
        <td style="padding:12px 16px; border-bottom:1px solid #f0f0f0; color:#444;">
          ${appt.clientName}
        </td>
        <td style="padding:12px 16px; border-bottom:1px solid #f0f0f0; color:#666;">
          ${appt.service}
        </td>
        <td style="padding:12px 16px; border-bottom:1px solid #f0f0f0; color:#888; font-size:13px;">
          ${appt.phone || "—"}
        </td>
      </tr>
      ${
        appt.notes
          ? `<tr>
               <td colspan="4" style="padding:4px 16px 12px; font-size:12px; color:#999; border-bottom:1px solid #f0f0f0;">
                 📝 ${appt.notes}
               </td>
             </tr>`
          : ""
      }
    `
    )
    .join("");

  const subject = isBlock
    ? `🔔 Reminder: ${block.length} appointments starting at ${firstTime} — ${displayDate}`
    : `🔔 Reminder: Appointment at ${firstTime} — ${displayDate}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#f8f9fa; font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa; padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:white; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <tr>
            <td style="background:${brandColor}; padding:28px 32px; text-align:center;">
              <p style="margin:0; color:rgba(255,255,255,0.8); font-size:13px; letter-spacing:2px; text-transform:uppercase;">
                ${businessName}
              </p>
              <h1 style="margin:8px 0 0; color:white; font-size:24px; font-weight:800;">
                ${isBlock ? "Block Session Reminder" : "Appointment Reminder"}
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px; color:#666; font-size:15px;">Hi <strong>${barberName}</strong>,</p>
              <p style="margin:0 0 24px; color:#666; font-size:15px; line-height:1.6;">
                ${
                  isBlock
                    ? `You have <strong>${block.length} back-to-back appointments</strong> running from <strong>${firstTime}</strong> to <strong>${lastTime}</strong> on <strong>${displayDate}</strong>.`
                    : `You have an appointment at <strong>${firstTime}</strong> on <strong>${displayDate}</strong>.`
                }
              </p>

              <div style="background:#f8f9fa; border-radius:12px; padding:16px 20px; margin-bottom:24px; border-left:4px solid ${brandColor};">
                <p style="margin:0; font-size:13px; color:#888; text-transform:uppercase; letter-spacing:1px;">Date</p>
                <p style="margin:4px 0 0; font-size:18px; font-weight:800; color:#1A1A1A;">${displayDate}</p>
                ${
                  isBlock
                    ? `<p style="margin:4px 0 0; font-size:14px; color:#666;">${firstTime} → ${lastTime}</p>`
                    : `<p style="margin:4px 0 0; font-size:14px; color:#666;">${firstTime}</p>`
                }
              </div>

              <p style="margin:0 0 12px; font-size:13px; font-weight:700; color:#1A1A1A; text-transform:uppercase; letter-spacing:1px;">
                ${isBlock ? "All Sessions in This Block" : "Session Details"}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px; overflow:hidden; border:1px solid #f0f0f0;">
                <thead>
                  <tr style="background:#1A1A1A;">
                    <th style="padding:10px 16px; text-align:left; color:white; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:1px;">Time</th>
                    <th style="padding:10px 16px; text-align:left; color:white; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:1px;">Client</th>
                    <th style="padding:10px 16px; text-align:left; color:white; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:1px;">Service</th>
                    <th style="padding:10px 16px; text-align:left; color:white; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:1px;">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  ${appointmentRows}
                </tbody>
              </table>

              <p style="margin:32px 0 0; font-size:14px; color:#888; text-align:center;">
                This reminder was sent 1 hour before your ${isBlock ? "first" : ""} appointment.<br>
                <em>${businessName}</em>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f8f9fa; padding:20px 32px; text-align:center; border-top:1px solid #eee;">
              <p style="margin:0; font-size:12px; color:#bbb;">
                Powered by yr-bookd
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  // ─── Send via Brevo ─────────────────────────────────────────────────────
  try {
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": env.BREVO_API_KEY, 
      },
      body: JSON.stringify({
        sender: {
          email: env.EMAIL_FROM || "bookings@bookehtrim.co.uk",
          name: businessName,
        },
        to: [{ email: barberEmail, name: barberName }],
        subject: subject,
        htmlContent: htmlBody,
      }),
    });

    if (!brevoResponse.ok) {
      const errText = await brevoResponse.text();
      console.error("[send-reminder-email] Brevo error:", errText);
      return new Response(JSON.stringify({ error: "Email send failed", detail: errText }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, subject, to: barberEmail }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-reminder-email] Unexpected error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}