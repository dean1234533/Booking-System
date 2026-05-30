import { google } from "googleapis";
import crypto from "crypto";

export async function onRequestGet(context) {
  try {
    const clientId = context.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = context.env.VITE_GOOGLE_REDIRECT_URI || "http://localhost:5173/dashboard?tab=calendar";

    if (!clientId) {
      return new Response(JSON.stringify({ error: "Google Client ID not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const state = crypto.randomBytes(32).toString("hex");

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      context.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      state: state,
    });

    return new Response(JSON.stringify({ authUrl, state }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[auth-url] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
