import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // 1. Prevent non-POST requests from crashing the logic
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Destructure with extreme safety
    const {
      clientEmail,
      clientName = "Customer",
      barberName = "The Barber",
      barberEmail,
      slotDate = "Scheduled Date",
      slotTime = "Scheduled Time",
      bookingId = "N/A",
      barberId = "",
      haircutStyle = "Standard Cut",
      depositAmount = 10
    } = req.body || {}; // Fallback to empty object if body is missing

    // 3. If clientEmail is missing, exit gracefully with a 400, NOT a 500
    if (!clientEmail) {
      return res.status(400).json({ error: "Missing clientEmail in request body" });
    }

    const host = req.headers.host || 'localhost:3000';
    const cancelUrl = `https://${host}/cancel-booking?id=${bookingId}&barber=${barberId}`;

    // 4. Attempt the send
    // IMPORTANT: Resend Free Tier MUST use 'onboarding@resend.dev' as the "from"
    const data = await resend.emails.send({
      from: 'The Cutting Edge <onboarding@resend.dev>',
      to: [clientEmail],
      subject: `Confirmed: Your appointment with ${barberName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
          <div style="background: #1a1a1a; padding: 24px; text-align: center;">
            <h1 style="color: #C9A84C; margin: 0; font-size: 22px; letter-spacing: 0.05em;">✂ THE CUTTING EDGE</h1>
          </div>
          <div style="padding: 28px;">
            <h2>You're booked in!</h2>
            <p>Hi ${clientName}, your appointment is confirmed.</p>
            <div style="background: #f7f5f2; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C9A84C;">
              <p><strong>Barber:</strong> ${barberName}</p>
              <p><strong>Date:</strong> ${slotDate}</p>
              <p><strong>Time:</strong> ${slotTime}</p>
            </div>
            <a href="${cancelUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700;">
              Cancel Appointment
            </a>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true, id: data.id });
  } catch (error) {
    // This logs to your Vercel "Logs" tab so you can see the real error
    console.error("Internal Server Error:", error);
    return res.status(500).json({ error: error.message });
  }
}