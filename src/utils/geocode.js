// Free, no API key required, but rate-limited to ~1 request/second under
// Nominatim's usage policy — fine for occasional profile saves and one-off
// search queries, not for bulk/high-frequency geocoding.
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

export async function geocodeAddress(query) {
  if (!query?.trim()) return null;
  try {
    const res = await fetch(
      `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=gb`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return null;
    const results = await res.json();
    const first = results?.[0];
    if (!first) return null;
    return { latitude: parseFloat(first.lat), longitude: parseFloat(first.lon) };
  } catch {
    return null;
  }
}

// Haversine formula — great-circle distance in miles between two coordinates.
export function distanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth's radius in miles
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(miles) {
  if (miles < 0.1) return "Nearby";
  if (miles < 10) return `${miles.toFixed(1)} mi away`;
  return `${Math.round(miles)} mi away`;
}
