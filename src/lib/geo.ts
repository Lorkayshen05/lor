export type LatLng = { lat: number; lng: number };

const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance (straight line, not driving distance). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Coordinates are approximate, so the label is rounded and prefixed. */
export function formatDistance(km: number): string {
  if (km < 1) return "< 1 km";
  if (km < 10) return `~${km.toFixed(1)} km`;
  return `~${Math.round(km)} km`;
}

export function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return typeof lat === "number" && typeof lng === "number" && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function directionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function mapSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
