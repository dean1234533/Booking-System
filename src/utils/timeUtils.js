/**
 * Time utilities for session prep countdown and formatting
 */

export const getTimeUntilSession = (date, time) => {
  if (!date || !time) return { status: "invalid", text: "Invalid time" };

  const [h, m] = time.split(':');
  const sessionTime = new Date(date);
  sessionTime.setHours(parseInt(h), parseInt(m), 0, 0);

  const now = new Date();
  const diff = sessionTime - now;

  if (diff < 0) {
    return { status: "past", text: "Session ended", minutes: 0 };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) {
    if (minutes === 0) {
      return { status: "now", text: "Starting now", minutes: 0 };
    }
    if (minutes <= 5) {
      return { status: "urgent", text: `In ${minutes}m`, minutes };
    }
    return { status: "soon", text: `In ${minutes}m`, minutes };
  }

  if (hours === 1) {
    return { status: "soon", text: `In ${hours}h ${minutes}m`, minutes: hours * 60 + minutes };
  }

  return { status: "upcoming", text: `In ${hours}h ${minutes}m`, minutes: hours * 60 + minutes };
};

export const formatSessionTime = (date, time) => {
  if (!date || !time) return "";
  const sessionTime = new Date(date);
  const [h, m] = time.split(':');
  sessionTime.setHours(parseInt(h), parseInt(m), 0, 0);
  return sessionTime.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatSessionDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const getGoogleMapsUrl = (address) => {
  if (!address) return "";
  return `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
};
