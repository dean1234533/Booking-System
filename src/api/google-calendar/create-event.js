import { google } from "googleapis";

// Helper to generate iCalendar format
function generateICS({ clientName, barberName, date, time, service, clientEmail }) {
  const [hours, minutes] = time.split(":").map(Number);
  const startDate = new Date(date);
  startDate.setHours(hours, minutes, 0, 0);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const formatDate = (d) => {
    return d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Booking System//EN
BEGIN:VEVENT
UID:${Date.now()}@yourbookingapp.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${clientName} - ${service || "Appointment"}
DESCRIPTION:Service Provider: ${barberName}\\nService: ${service || "N/A"}
ATTENDEE:${clientEmail}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { userId, bookingId, clientEmail, clientName, date, time, service, barberName } = body;

    if (!userId || !bookingId || !clientEmail || !date || !time) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // TODO: Fetch tokens from Firestore REST API or use passed tokens
    // For now, we'll return a success response and the frontend can handle it
    // In production, you would:
    // 1. Fetch tokens from Firestore using the REST API
    // 2. Create the event using googleapis
    // 3. Send the iCalendar email

    const icsContent = generateICS({
      clientName,
      barberName: barberName || "Service Provider",
      date,
      time,
      service,
      clientEmail,
    });

    // Generate a placeholder event ID (in production, this would come from Google Calendar)
    const googleEventId = `placeholder-${Date.now()}`;

    // Return success (emails should be sent by frontend or a separate service)
    return new Response(
      JSON.stringify({
        success: true,
        googleEventId,
        message: "Calendar event prepared (email should be sent separately)",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[create-event] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to create calendar event" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
