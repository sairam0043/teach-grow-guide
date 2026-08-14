import type { Tutor } from "@/data/mockTutors";

export const CITY_COORDINATES: Record<string, [number, number]> = {
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  mumbai: [19.0760, 72.8777],
  delhi: [28.6139, 77.2090],
  "new delhi": [28.6139, 77.2090],
  chennai: [13.0827, 80.2707],
  hyderabad: [17.3850, 78.4867],
  pune: [18.5204, 73.8567],
  kolkata: [22.5726, 88.3639],
  noida: [28.5355, 77.3910],
  gurgaon: [28.4595, 77.0266],
  nuzvid: [16.7850, 80.8488],
  eluru: [16.7104, 81.1035],
  vijayawada: [16.5062, 80.6480],
  visakhapatnam: [17.6868, 83.2185],
  guntur: [16.3067, 80.4365],
};

const normalizeCity = (city?: string): string => {
  return (city || "").trim().toLowerCase();
};

/**
 * Extracts coordinate [latitude, longitude] from a Google Maps link if possible.
 * Handles formats like:
 * - https://www.google.com/maps/place/16.7885,80.8492
 * - https://www.google.com/maps/@16.7850,80.8488,15z
 * - https://maps.google.com/?q=16.7850,80.8488
 */
export const parseGoogleMapsCoords = (url?: string): [number, number] | null => {
  if (!url) return null;
  try {
    // 1. Matches patterns like: @16.7850,80.8488 or @16.7850,80.8488,15z
    const matchAt = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (matchAt) {
      const lat = parseFloat(matchAt[1]);
      const lng = parseFloat(matchAt[2]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }

    // 2. Matches query patterns: q=16.7850,80.8488 or cbll=16.7850,80.8488
    const matchQuery = url.match(/[?&](q|query|cbll|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (matchQuery) {
      const lat = parseFloat(matchQuery[2]);
      const lng = parseFloat(matchQuery[3]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }

    // 3. Matches place URL patterns: /place/16.7850,80.8488 or /place/16.7850+80.8488
    const matchPlace = url.match(/\/place\/(-?\d+\.\d+)[+,](-?\d+\.\d+)/);
    if (matchPlace) {
      const lat = parseFloat(matchPlace[1]);
      const lng = parseFloat(matchPlace[2]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
  } catch (e) {
    console.error("Failed to parse Google Maps URL coords:", e);
  }
  return null;
};

/**
 * Gets base coordinates for a city name, defaulting to Bangalore.
 */
export const getCityCoordinates = (city?: string): [number, number] => {
  const norm = normalizeCity(city);
  return CITY_COORDINATES[norm] || CITY_COORDINATES.bangalore;
};

/**
 * Calculates a deterministic coordinate [latitude, longitude] for a tutor.
 * 1. Tries to extract coordinates from `googleMapsUrl` first.
 * 2. Falls back to city coordinates with deterministic jitter.
 */
export const getTutorCoordinates = (tutor: Tutor): [number, number] => {
  // 1. Try to extract directly from googleMapsUrl first
  const parsedCoords = parseGoogleMapsCoords((tutor as any).googleMapsUrl);
  if (parsedCoords) {
    return parsedCoords;
  }

  // 2. Otherwise fallback to city coordinates with deterministic offset
  const base = getCityCoordinates(tutor.city);
  
  // Use tutor's ID or name to generate a deterministic hash
  const key = tutor.id || tutor.name || "";
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate distinct offsets (roughly within a 3-5 km radius)
  // 0.001 degrees is ~110 meters. We generate offsets between -0.025 and +0.025.
  const latOffset = ((Math.abs(hash) % 500) / 10000) - 0.025;
  const lngOffset = ((Math.abs(hash >> 8) % 500) / 10000) - 0.025;
  
  return [base[0] + latOffset, base[1] + lngOffset];
};
