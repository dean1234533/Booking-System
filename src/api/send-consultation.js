import { Resend } from 'resend';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resend = new Resend(env.RESEND_API_KEY);

  try {
    const body = await request.json().catch(() => ({}));
    const {
      ownerEmail,
      businessName  = 'Your Business',
      brandColor    = '#dc2626',
      clientName,
      clientPhone,
      clientEmail,
      clientAge,
      clientAddress,
      slotDate,
      slotTime,
      goalText,
      goalTypes     = [],
      diet,
      availability,
      holdingBack,
      startDate,
    } = body;

    if (!ownerEmail) {
      return new Response(JSON.stringify({ error: 'Missing owner email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!clientName || !clientPhone || !clientEmail) {
      return new Response(JSON.stringify({ error: 'Missing required client details' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const submittedAt = new Date().toLocaleString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const slotDisplay = slotDate && slotTime
      ? (() => {
          try {
            const d = new Date(slotDate);
            return `${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at ${slotTime}`;
          } catch { return `${slotDate} at ${slotTime}`; }
        })()
      : 'Not specified';

    const goalsDisplay = goalTypes.length > 0 ? goalTypes.join(', ') : 'None selected';

    const row = (label, value) => `
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#78716c;width:42%;vertical-align:top;">${label}</td>
        <td style="padding:8px 0;font-size:13px;font-weight:700;color:#1c1917;vertical-align:top;">${value || '—'}</td>
      </tr>`;

    const block = (heading, text) => text ? `
      <div style="background:#faf8f5;border:1px solid #e8e0d5;border-radius:4px;padding:18px 20px;margin-bottom:16px;">
        <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#a8a29e;">${heading}</p>
        <p style="margin:0;font-size:14px;color:#44403c;line-height:1.75;">${text}</p>
      </div>` : '';

    const { data, error } = await resend.emails.send({
      from: `${businessName} <bookings@bookehtrim.co.uk>`,
      to: [ownerEmail],
      subject: `New Consultation Request — ${clientName} (${slotDisplay})`,
      html: `
        <div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e8e0d5;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <div style="background:${brandColor};padding:32px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.75);">
              Consultation Request
            </p>
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:0.04em;">
              ${businessName}
            </h1>
          </div>

          <div style="padding:36px;">

            <h2 style="margin:0 0 6px;font-size:20px;font-weight:800;color:#1c1917;">
              New consultation booked 📋
            </h2>
            <p style="margin:0 0 28px;font-size:14px;color:#78716c;line-height:1.6;">
              A client has requested a consultation. Their details and answers are below. Submitted ${submittedAt}.
            </p>

            <!-- Slot -->
            <div style="background:${brandColor}18;border:1px solid ${brandColor}44;border-left:4px solid ${brandColor};border-radius:4px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#a8a29e;">Consultation Slot</p>
              <p style="margin:0;font-size:17px;font-weight:800;color:#1c1917;">${slotDisplay}</p>
            </div>

            <!-- Client details -->
            <div style="background:#faf8f5;border:1px solid #e8e0d5;border-left:4px solid ${brandColor};border-radius:4px;padding:24px;margin-bottom:24px;">
              <p style="margin:0 0 16px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#a8a29e;">Client Details</p>
              <table style="width:100%;border-collapse:collapse;">
                ${row('👤 Name', clientName)}
                ${row('📞 Phone', `<a href="tel:${clientPhone}" style="color:${brandColor};text-decoration:none;">${clientPhone}</a>`)}
                ${row('✉️ Email', `<a href="mailto:${clientEmail}" style="color:${brandColor};text-decoration:none;">${clientEmail}</a>`)}
                ${row('🎂 Age', clientAge)}
                ${row('📍 Address', clientAddress)}
              </table>
            </div>

            <!-- Goals -->
            <div style="background:#faf8f5;border:1px solid #e8e0d5;border-radius:4px;padding:20px;margin-bottom:16px;">
              <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#a8a29e;">Goals</p>
              <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#1c1917;">Selected: ${goalsDisplay}</p>
              ${goalText ? `<p style="margin:0;font-size:14px;color:#44403c;line-height:1.75;">${goalText}</p>` : ''}
            </div>

            ${block('Diet / Nutrition', diet)}
            ${block('Available Days & Times', availability)}
            ${block("Biggest Thing Holding Them Back", holdingBack)}
            ${block('When Can They Start?', startDate)}

            <!-- CTAs -->
            <div style="display:flex;gap:12px;margin:32px 0 8px;flex-wrap:wrap;">
              <a href="tel:${clientPhone}" style="display:inline-block;background:${brandColor};color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:3px;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                Call ${clientName}
              </a>
              <a href="mailto:${clientEmail}" style="display:inline-block;background:#1c1917;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:3px;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                Email ${clientName}
              </a>
            </div>

            <!-- Footer -->
            <div style="margin-top:40px;padding-top:24px;border-top:1px solid #e8e0d5;text-align:center;font-size:11px;color:#c8c3bb;letter-spacing:0.05em;line-height:1.8;text-transform:uppercase;">
              Powered by <strong>Book-eh-Trim</strong><br/>
              © ${new Date().getFullYear()} ${businessName}
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return new Response(JSON.stringify({ error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('send-consultation crash:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
