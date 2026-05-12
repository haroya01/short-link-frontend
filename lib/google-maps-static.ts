/**
 * URL builders for Google Maps Static API + Maps URLs (directions). No HTTP calls — these just
 * produce URLs the browser loads (Static = {@code <img src>}, Directions = {@code <a href>} that
 * deep-links into Google Maps app on mobile or web on desktop).
 *
 * <p>API key is the same publishable {@code NEXT_PUBLIC_GOOGLE_MAPS_API_KEY} the Places client
 * uses — HTTP-referrer-restricted in Google Cloud Console.
 */

type StaticMapParams = {
  lat: number;
  lng: number;
  /** 13 = neighborhood, 16 = building-level. Default 16 for the in-card thumbnail. */
  zoom?: number;
  /** {@code 600x360} = 5:3 ratio used by the PLACE card hero. Caller picks. */
  size?: string;
  /** {@code 2} for retina. */
  scale?: 1 | 2;
};

/**
 * Builds a Static Maps API image URL with a pink marker. Style strips POI clutter (other shops,
 * generic icons) so the marker is the visual focus.
 */
export function staticMapUrl({
  lat,
  lng,
  zoom = 16,
  size = "600x360",
  scale = 2,
}: StaticMapParams): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    // Fail open — return an empty string so the caller's `<img>` shows broken-image rather than
    // the whole card crashing. The PLACE card already has a "use cover photo" branch as the
    // primary visual; static map is the fallback.
    return "";
  }
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size,
    scale: String(scale),
    markers: `color:0xEC4899|${lat},${lng}`,
    key,
  });
  // Cleaner map style — drop generic POI icons + road labels so the marker is the focal point.
  // Multiple `style=` params need separate appends since URLSearchParams collapses duplicates.
  const styleParams = [
    "feature:poi|visibility:off",
    "feature:road|element:labels|visibility:simplified",
    "feature:transit|visibility:off",
  ];
  let qs = params.toString();
  for (const style of styleParams) {
    qs += `&style=${encodeURIComponent(style)}`;
  }
  return `https://maps.googleapis.com/maps/api/staticmap?${qs}`;
}

/**
 * Directions URL — opens Google Maps app on mobile (iOS Apple Maps will offer to open Google
 * Maps; Android Chrome opens the Google Maps app directly), or maps.google.com on desktop. We
 * include {@code destination_place_id} when available so Google picks the exact business (not a
 * nearby business with a similar name).
 */
export function directionsUrl({
  lat,
  lng,
  placeId,
  name,
}: {
  lat: number;
  lng: number;
  placeId?: string | null;
  name?: string | null;
}): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${lat},${lng}`,
  });
  if (placeId) params.set("destination_place_id", placeId);
  if (name) params.set("destination_name", name);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
