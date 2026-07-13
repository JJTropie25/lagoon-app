// Geocoding via Photon (autocomplete) + Nominatim (fallback + reverse).
// Zero API keys required.

const USER_AGENT = "LagoonApp/1.0 (com.lagoon.app)";

function cleanLabel(raw: string): string {
  return raw.replace(/^\d{4,7}[\s,]+/, "").trim();
}

export type PlaceSuggestion = {
  label: string;
  latitude: number;
  longitude: number;
};

// ── Photon (komoot) ───────────────────────────────────────────────────────────
// Returns coordinates directly — no second "details" call needed.
// Italy bounding box: west, south, east, north
const ITALY_BBOX = "6.6273,36.6199,18.5205,47.0922";

async function photonAutocomplete(query: string, limit: number): Promise<PlaceSuggestion[]> {
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lang=it&limit=${limit}` +
    `&bbox=${ITALY_BBOX}&osm_tag=place`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return [];
  const payload = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: {
        name?: string;
        city?: string;
        state?: string;
        country?: string;
        street?: string;
        housenumber?: string;
      };
    }>;
  };
  if (!Array.isArray(payload.features)) return [];
  return payload.features
    .map((f) => {
      const [lon, lat] = f.geometry?.coordinates ?? [];
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const p = f.properties ?? {};
      // Build a readable label from the available fields
      const parts: string[] = [];
      if (p.name) parts.push(p.name);
      else if (p.street) parts.push(p.housenumber ? `${p.street} ${p.housenumber}` : p.street);
      if (p.city && p.city !== p.name) parts.push(p.city);
      if (p.state) parts.push(p.state);
      if (p.country) parts.push(p.country);
      const label = cleanLabel(parts.join(", "));
      if (!label) return null;
      return { label, latitude: lat, longitude: lon } satisfies PlaceSuggestion;
    })
    .filter((item): item is PlaceSuggestion => Boolean(item));
}

// ── Nominatim (OSM) fallback ──────────────────────────────────────────────────
async function nominatimSearch(query: string, limit: number): Promise<PlaceSuggestion[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
    `&format=json&limit=${limit}&accept-language=it&addressdetails=0&countrycodes=it`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return [];
  const payload = (await res.json()) as Array<{
    display_name?: string;
    lat?: string;
    lon?: string;
  }>;
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => {
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const label = cleanLabel(item.display_name?.trim() ?? "");
      if (!label) return null;
      return { label, latitude: lat, longitude: lon } satisfies PlaceSuggestion;
    })
    .filter((item): item is PlaceSuggestion => Boolean(item));
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function searchPlaceSuggestions(query: string, limit = 6): Promise<PlaceSuggestion[]> {
  const normalized = query.trim();
  if (normalized.length < 3) return [];
  try {
    const results = await photonAutocomplete(normalized, limit);
    if (results.length > 0) return results;
  } catch { /* ignore */ }
  try {
    const results = await nominatimSearch(normalized, limit);
    if (results.length > 0) return results;
  } catch { /* ignore */ }
  return [];
}

// ── Reverse geocoding ─────────────────────────────────────────────────────────
export async function reverseGeocodeLabel(latitude: number, longitude: number): Promise<string> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}` +
      `&format=json&accept-language=it`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok) {
      const payload = (await res.json()) as { display_name?: string };
      const label = payload.display_name?.trim();
      if (label) return cleanLabel(label);
    }
  } catch { /* ignore */ }
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}
