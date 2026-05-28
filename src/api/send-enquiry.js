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
      ownerName   = "Business Owner",
      businessName = "Your Business",
      brandColor   = "#b5924c",
      clientName,
      clientPhone,
      projectDetails,
    } = body;

    if (!ownerEmail) {
      return new Response(JSON.stringify({ error: 'Missing owner email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!clientName || !clientPhone) {
      return new Response(JSON.stringify({ error: 'Missing client details' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const submittedAt = new Date().toLocaleString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const { data, error } = await resend.emails.send({
      from: `${businessName} Enquiries <bookings@bookehtrim.co.uk>`,
      to: [ownerEmail],
      subject: `New Enquiry from ${clientName} — ${businessName}`,
      html: `
        <div style="font-family:'DM Sans',sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #e8e0d5;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <div style="background:${brandColor};padding:32px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.75);">
              New Project Enquiry
            </p>
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:0.04em;">
              ${businessName}
            </h1>
          </div>

          <!-- Body -->
          <div style="padding:36px;">

            <h2 style="margin:0 0 6px;font-size:20px;font-weight:800;color:#1c1917;">
              You have a new enquiry 📩
            </h2>
            <p style="margin:0 0 28px;font-size:14px;color:#78716c;line-height:1.6;">
              A potential client has submitted a project enquiry through your website. Their details are below — reach out within 24 hours to secure the job.
            </p>

            <!-- Client details card -->
            <div style="background:#faf8f5;border:1px solid #e8e0d5;border-left:4px solid ${brandColor};border-radius:4px;padding:24px;margin-bottom:24px;">
              <p style="margin:0 0 16px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#a8a29e;">
                Client Details
              </p>
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:7px 0;font-size:13px;color:#78716c;width:38%;">👤 Name</td>
                  <td style="padding:7px 0;font-size:13px;font-weight:700;color:#1c1917;">${clientName}</td>
                </tr>
                <tr>
                  <td style="padding:7px 0;font-size:13px;color:#78716c;">📞 Phone</td>
                  <td style="padding:7px 0;font-size:13px;font-weight:700;color:#1c1917;">
                    <a href="tel:${clientPhone}" style="color:${brandColor};text-decoration:none;">${clientPhone}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:7px 0;font-size:13px;color:#78716c;">🕐 Submitted</td>
                  <td style="padding:7px 0;font-size:13px;color:#44403c;">${submittedAt}</td>
                </tr>
              </table>
            </div>

            ${projectDetails ? `
            <!-- Project description -->
            <div style="background:#faf8f5;border:1px solid #e8e0d5;border-radius:4px;padding:20px;margin-bottom:28px;">
              <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#a8a29e;">
                Project Description
              </p>
              <p style="margin:0;font-size:14px;color:#44403c;line-height:1.75;font-style:italic;">
                "${projectDetails}"
              </p>
            </div>` : ''}

            <!-- CTA -->
            <div style="text-align:center;margin:32px 0 8px;">
              <a href="tel:${clientPhone}"
                style="display:inline-block;background:${brandColor};color:#ffffff;padding:15px 40px;text-decoration:none;border-radius:3px;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                Call ${clientName}
              </a>
            </div>

            <!-- Footer -->
            <div style="margin-top:40px;padding-top:24px;border-top:1px solid #e8e0d5;text-align:center;font-size:11px;color:#c8c3bb;letter-spacing:0.05em;line-height:1.8;text-transform:uppercase;">
              Powered by <strong>yr-bookd</strong><br/>
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
    console.error('send-enquiry crash:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
