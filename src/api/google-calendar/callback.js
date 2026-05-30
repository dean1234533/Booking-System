import { google } from "googleapis";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { code, userId } = body;

    if (!code || !userId) {
      return new Response(JSON.stringify({ error: "Missing code or userId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clientId = env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    const redirectUri = env.VITE_GOOGLE_REDIRECT_URI || "http://localhost:5173/dashboard?tab=calendar";

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "Google credentials not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Get user's primary calendar email
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    let primaryEmail = tokens.email || "primary@gmail.com";
    try {
      const settings = await calendar.settings.get({ setting: "timeZone" });
      primaryEmail = tokens.email || primaryEmail;
    } catch (e) {
      console.warn("Could not fetch timezone:", e.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        email: tokens.email || primaryEmail,
        calendarId: "primary",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expiry_date || null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[callback] Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to exchange authorization code",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
