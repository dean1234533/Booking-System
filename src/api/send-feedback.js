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

  // 2. Initialize Resend
  const resend = new Resend(env.RESEND_API_KEY);

  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Send email to admin
    const { data, error } = await resend.emails.send({
      from: "Bookrty Feedback <feedback@bookehtrim.co.uk>",
      to: "deanburt1308@gmail.com",
      replyTo: email,
      subject: `New Feedback from ${name} — Bookrty`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #C9A84C; padding: 24px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 20px; font-weight: 700;">
              New Feedback Submission
            </h1>
          </div>

          <div style="padding: 32px; background: #f9f9f9; border: 1px solid #e0e0e0;">
            <p style="margin: 0 0 20px; color: #333; font-size: 15px;"><strong>From:</strong> ${name} (${email})</p>

            <div style="background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #C9A84C; margin: 20px 0;">
              <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.8; white-space: pre-wrap;">
                ${escapeHtml(message)}
              </p>
            </div>

            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999;">
              <p style="margin: 0;">Reply to: ${email}</p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API Error:", error);
      return new Response(JSON.stringify({ error: "Failed to send feedback" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Feedback Handler Crash:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
