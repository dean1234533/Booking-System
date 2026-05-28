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

    const platformName = "yr-bookd";
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

    // Recipients logic
    const recipients = [clientEmail];
    if (barberEmail && barberEmail !== clientEmail) {
      recipients.push(barberEmail);
    }

    const { data, error } = await resend.emails.send({
      from: `${displayBrand} <bookings@bookehtrim.co.uk>`,
      to: recipients,
      subject: `Confirmed: Your appointment with ${barberName} on ${finalDate}`,
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