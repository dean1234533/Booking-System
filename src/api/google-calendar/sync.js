export async function onRequestPost(context) {
  const { request } = context;

  try {
    const body = await request.json();
    const { userId, days = 30 } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // TODO: In production:
    // 1. Fetch tokens from Firestore
    // 2. Create Google Calendar API client with tokens
    // 3. Fetch calendar events for next N days
    // 4. Return busy blocks for display mode filtering

    return new Response(
      JSON.stringify({
        success: true,
        eventsCount: 0,
        busyBlocks: [],
        lastSync: new Date().toISOString(),
        message: "Sync prepared (full implementation coming)",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[sync] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to sync calendar" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
