import { Resend } from 'resend';

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Enforce POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Initialize Resend with Cloudflare env
  const resend = new Resend(env.RESEND_API_KEY);

  try {
    const body = await request.json().catch(() => ({}));
    const {
      clientEmail,
      clientName = "Customer",
      barberName = "The Barber",
      barberEmail,
      businessName,
      brandColor,
      bookingId,
      barberId,
      haircutStyle,
      depositAmount,
      bookingFee,
      address,
      notes,
    } = body;

    // Standardize date/time
    const finalDate = body.date || body.slotDate || body.Date || "Date TBD";
    const finalTime = body.time || body.slotTime || body.Time || "Time TBD";

    if (!clientEmail || !bookingId) {
      return new Response(JSON.stringify({ error: "Missing required booking data" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const platformName = "Bookrightly";
    const displayBrand = businessName || platformName;
    const displayColor = brandColor || "#C9A84C";

    // Build URLs using Cloudflare request data
    const host = request.headers.get('host');
    const baseUrl = `https://${host}`;
    const cancelUrl = `${baseUrl}/cancel-booking/${bookingId}?barber=${barberId}`;

    // Safe payment calculation
    const deposit   = depositAmount != null ? Number(depositAmount) : null;
    const fee       = bookingFee    != null ? Number(bookingFee)    : null;
    const totalPaid = deposit != null
      ? (fee != null ? (deposit + fee).toFixed(2) : deposit.toFixed(2))
      : null;

    const ref = bookingId.slice(-8).toUpperCase();

    // Build ICS calendar event for client
    const parseDateTime = (dateStr, timeStr) => {
      try {
        const [y, m, d] = (dateStr || "").split(/[-/]/).map(Number);
        const timeParts = (timeStr || "09:00").replace(/[ap]m/i, "").trim().split(":");
        let h = Number(timeParts[0]);
        let min = Number(timeParts[1] || 0);
        if (/pm/i.test(timeStr) && h < 12) h += 12;
        if (/am/i.test(timeStr) && h === 12) h = 0;
        return new Date(y, (m || 1) - 1, d || 1, h, min);
      } catch { return new Date(); }
    };
    const dtStart = parseDateTime(finalDate, finalTime);
    const dtEnd   = new Date(dtStart.getTime() + 60 * 60_000);
    const fmtICS  = d => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Bookrightly//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `UID:${bookingId}@bookrightly.co.uk`,
      `DTSTAMP:${fmtICS(new Date())}`,
      `DTSTART:${fmtICS(dtStart)}`,
      `DTEND:${fmtICS(dtEnd)}`,
      `SUMMARY:${haircutStyle || "Appointment"} with ${barberName}`,
      `DESCRIPTION:Booking ref: ${ref}\\nService: ${haircutStyle || "Appointment"}\\nDeposit paid: ${totalPaid ? "£" + totalPaid : "N/A"}`,
      address ? `LOCATION:${address}` : "",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");

    // Recipients logic
    const recipients = [clientEmail];
    if (barberEmail && barberEmail !== clientEmail) {
      recipients.push(barberEmail);
    }

    const { data, error } = await resend.emails.send({
      from: `${displayBrand} <bookings@bookehtrim.co.uk>`,
      to: recipients,
      subject: `Confirmed: Your appointment with ${barberName} on ${finalDate}`,
      attachments: [
        {
          filename: "appointment.ics",
          content: Buffer.from(icsContent).toString("base64"),
          contentType: "text/calendar; charset=utf-8; method=REQUEST",
        },
      ],
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #eee; border-radius: 16px; overflow: hidden; background-color: #ffffff;">

          <div style="background: ${displayColor}; padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 900;">
              ${displayBrand}
            </h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 13px; letter-spacing: 0.05em;">BOOKING CONFIRMATION</p>
          </div>

          <div style="padding: 32px;">

            <h2 style="margin-top: 0; color: #1a1a1a; font-size: 22px; font-weight: 800;">You're booked in! ✅</h2>
            <p style="color: #444; line-height: 1.6; margin-top: 0;">Hi <strong>${clientName}</strong>, your appointment at <strong>${displayBrand}</strong> is confirmed. See you soon!</p>

            <div style="background: #fafafa; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #eee; border-left: 6px solid ${displayColor};">
              <p style="margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; font-weight: 700;">Appointment Details</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
                <tr>
                  <td style="padding: 6px 0; color: #666; font-size: 14px; width: 40%;">📅 Date</td>
                  <td style="padding: 6px 0; font-weight: 800; font-size: 14px; color: #1a1a1a;">${finalDate}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #666; font-size: 14px;">⏰ Time</td>
                  <td style="padding: 6px 0; font-weight: 800; font-size: 14px; color: #1a1a1a;">${finalTime}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #666; font-size: 14px;">✂️ Barber</td>
                  <td style="padding: 6px 0; font-weight: 800; font-size: 14px; color: #1a1a1a;">${barberName}</td>
                </tr>
                ${haircutStyle ? `
                <tr>
                  <td style="padding: 6px 0; color: #666; font-size: 14px;">💈 Service</td>
                  <td style="padding: 6px 0; font-weight: 800; font-size: 14px; color: #1a1a1a;">${haircutStyle}</td>
                </tr>` : ''}
                ${address ? `
                <tr>
                  <td style="padding: 6px 0; color: #666; font-size: 14px;">📍 Address</td>
                  <td style="padding: 6px 0; font-weight: 800; font-size: 14px; color: #1a1a1a;">${address}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 6px 0; color: #666; font-size: 14px;">🪪 Reference</td>
                  <td style="padding: 6px 0; font-weight: 800; font-size: 14px; color: #1a1a1a;">${ref}</td>
                </tr>
              </table>
            </div>

            <div style="background: #fafafa; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #eee;">
              <p style="margin: 0 0 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; font-weight: 700;">Payment Summary</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; color: #666; font-size: 14px;">Deposit</td>
                  <td style="padding: 5px 0; font-size: 14px; text-align: right;">
                    ${deposit != null ? `£${deposit.toFixed(2)}` : '—'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666; font-size: 14px;">Booking Fee</td>
                  <td style="padding: 5px 0; font-size: 14px; text-align: right;">
                    ${fee != null ? `£${fee.toFixed(2)}` : '—'}
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 10px; border-top: 1px solid #eee;"></td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: 900; font-size: 15px; color: #1a1a1a;">Total Paid Today</td>
                  <td style="padding: 4px 0; font-weight: 900; font-size: 15px; color: ${displayColor}; text-align: right;">
                    ${totalPaid ? `£${totalPaid}` : '—'}
                  </td>
                </tr>
              </table>
              <p style="margin: 12px 0 0; font-size: 12px; color: #999;">The remaining balance is payable at the shop on the day.</p>
            </div>

            ${notes ? `
            <div style="background: #fffbf0; padding: 16px 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #f5e9c4;">
              <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; font-weight: 700;">📝 Notes</p>
              <p style="margin: 0; font-size: 14px; color: #444; line-height: 1.6;">${notes}</p>
            </div>` : ''}

            <div style="border: 1px solid #f5c6cb; border-radius: 12px; padding: 20px; text-align: left; margin-bottom: 32px; background-color: rgba(201,168,76,0.04);">
              <p style="margin: 0 0 8px; font-size: 14px; font-weight: 800; color: #856404;">⚠️ IMPORTANT INFORMATION</p>
              <ul style="margin: 0; padding: 0 0 0 16px; font-size: 12px; color: #666; line-height: 1.6;">
                <li>Please arrive <strong>5 minutes early</strong>.</li>
                <li>To receive a full refund of your deposit, cancellations must be made at least <strong>24 hours in advance</strong>.</li>
                <li>Late cancellations and no-shows are <strong>non-refundable</strong>.</li>
              </ul>
            </div>

            <!-- Add to Calendar buttons -->
            <div style="background: #f9fafb; border: 1px solid #eee; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
              <p style="margin: 0 0 14px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; font-weight: 700;">Add to your calendar</p>
              <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent((haircutStyle || "Appointment") + " with " + barberName)}&dates=${fmtICS(dtStart)}/${fmtICS(dtEnd)}&details=${encodeURIComponent("Booking ref: " + ref)}&location=${encodeURIComponent(address || "")}" target="_blank" style="display:inline-block;background:#4285F4;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;">
                  Google Calendar
                </a>
                <a href="https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent((haircutStyle || "Appointment") + " with " + barberName)}&startdt=${dtStart.toISOString()}&enddt=${dtEnd.toISOString()}&body=${encodeURIComponent("Booking ref: " + ref)}&location=${encodeURIComponent(address || "")}" target="_blank" style="display:inline-block;background:#0078D4;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;">
                  Outlook
                </a>
              </div>
              <p style="margin: 12px 0 0; font-size: 11px; color: #bbb;">Or open the .ics attachment to add to Apple Calendar or any other app.</p>
            </div>

            <div style="text-align: center; margin-top: 32px;">
              <a href="${cancelUrl}" style="display: inline-block; background: ${displayColor}; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                Cancel Booking
              </a>
            </div>

            <footer style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #eee; font-size: 11px; color: #bbb; text-align: center; line-height: 1.8; text-transform: uppercase; letter-spacing: 0.05em;">
              Powered by <strong>${platformName}</strong><br />
              © 2026 ${displayBrand}
            </footer>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API Error:", error);
      return new Response(JSON.stringify({ error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Email Handler Crash:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}