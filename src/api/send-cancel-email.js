import { Resend } from 'resend';

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Enforce POST method (Web Standard)
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Initialize Resend with Cloudflare env
  const resend = new Resend(env.RESEND_API_KEY);

  try {
    // 3. Parse request body
    const body = await request.json().catch(() => ({}));
    const {
      barberEmail, 
      barberName = "The Barber",
      businessName,
      brandColor,
      clientName,
      date,
      bookingDate,
      time,
      bookingTime,
      bookingId,
      depositAmount,
      bookingFee,
    } = body;

    // Standardize variables based on your Firestore logic
    const finalDate = date || bookingDate || "Not Specified";
    const finalTime = time || bookingTime || "Not Specified";
    const finalClient = clientName || "Customer";

    // Debugging: This will show in Cloudflare Real-time Logs
    console.log(`[Email Trigger] Recipient: ${barberEmail} | Date: ${finalDate} | Time: ${finalTime}`);

    if (!barberEmail || !bookingId) {
      return new Response(JSON.stringify({ error: "Missing barberEmail or bookingId" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const platformName = "Bookrightly";
    const displayBrand = businessName || platformName;
    const ref = bookingId.slice(-8).toUpperCase();

    const timestamp = new Date().toLocaleString("en-GB", {
      timeZone: "Europe/London",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const deposit = depositAmount ? Number(depositAmount) : 0;
    const fee = bookingFee ? Number(bookingFee) : 0;
    const totalPaid = (deposit + fee).toFixed(2);

    // 4. Send Email
    const { data, error } = await resend.emails.send({
      from: `${displayBrand} <bookings@bookehtrim.co.uk>`,
      to: [barberEmail],
      subject: `❌ Booking Cancelled — ${finalClient} on ${finalDate} @ ${finalTime}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #eee; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
          <div style="background: #c0392b; padding: 32px; text-align: center; color: #fff;">
            <h1 style="margin: 0; font-size: 22px; text-transform: uppercase;">${displayBrand}</h1>
            <p style="margin: 8px 0 0; font-size: 13px;">BOOKING CANCELLATION ALERT</p>
          </div>
          <div style="padding: 32px;">
            <div style="background: #fff0f0; border: 1px solid #f5c6c6; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
              <p style="margin: 0; color: #c0392b; font-weight: 800;">❌ A booking has been cancelled</p>
            </div>
            <p>Hi <strong>${barberName}</strong>,</p>
            <p>The following appointment has been cancelled by the client:</p>
            <div style="background: #fafafa; padding: 20px; border-radius: 12px; border-left: 6px solid #c0392b;">
               <p>📅 <strong>Date:</strong> ${finalDate}</p>
               <p>⏰ <strong>Time:</strong> ${finalTime}</p>
               <p>👤 <strong>Client:</strong> ${finalClient}</p>
               <p>🪪 <strong>Reference:</strong> ${ref}</p>
               <p>💰 <strong>Total Paid:</strong> £${totalPaid}</p>
            </div>
            <p style="margin-top: 20px; font-size: 11px; color: #bbb;">System Timestamp: ${timestamp}</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend Error:", error);
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
    console.error("Cancel email handler crash:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}