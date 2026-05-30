export async function onRequestPost(context) {
  const { request } = context;

  try {
    const body = await request.json();
    const { userId, bookingId, googleEventId } = body;

    if (!userId || !googleEventId) {
      return new Response(JSON.stringify({ error: "Missing userId or googleEventId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // TODO: In production, fetch tokens from Firestore and delete from Google Calendar
    // For now, just return success

    return new Response(
      JSON.stringify({
        success: true,
        message: "Event deletion prepared",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[delete-event] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to delete calendar event" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
