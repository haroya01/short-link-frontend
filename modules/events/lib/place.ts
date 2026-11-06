export type PlaceSuggestion = { placeId: string; main: string; secondary: string };

export type PickedPlace = { placeId: string; name: string; address: string | null };

export type PlaceInput = { text: string; url: string; picked: PickedPlace | null };

export type LatLng = { lat: number; lng: number };

const CITY: Record<string, LatLng> = {
  seoul: { lat: 37.5665, lng: 126.978 },
  tokyo: { lat: 35.6812, lng: 139.7671 },
  osaka: { lat: 34.6937, lng: 135.5023 },
  taipei: { lat: 25.033, lng: 121.5654 },
  shanghai: { lat: 31.2304, lng: 121.4737 },
  hongKong: { lat: 22.3193, lng: 114.1694 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  bangkok: { lat: 13.7563, lng: 100.5018 },
  hanoi: { lat: 21.0278, lng: 105.8342 },
  hoChiMinh: { lat: 10.8231, lng: 106.6297 },
  delhi: { lat: 28.6139, lng: 77.209 },
  london: { lat: 51.5072, lng: -0.1276 },
  paris: { lat: 48.8566, lng: 2.3522 },
  berlin: { lat: 52.52, lng: 13.405 },
  newYork: { lat: 40.7128, lng: -74.006 },
  losAngeles: { lat: 34.0522, lng: -118.2437 },
  sydney: { lat: -33.8688, lng: 151.2093 },
};

const ZONE_CITY: Record<string, LatLng> = {
  "Asia/Seoul": CITY.seoul,
  "Asia/Tokyo": CITY.tokyo,
  "Asia/Taipei": CITY.taipei,
  "Asia/Shanghai": CITY.shanghai,
  "Asia/Hong_Kong": CITY.hongKong,
  "Asia/Singapore": CITY.singapore,
  "Asia/Bangkok": CITY.bangkok,
  "Asia/Ho_Chi_Minh": CITY.hoChiMinh,
  "Asia/Saigon": CITY.hoChiMinh,
  "Asia/Kolkata": CITY.delhi,
  "Asia/Calcutta": CITY.delhi,
  "Europe/London": CITY.london,
  "Europe/Paris": CITY.paris,
  "Europe/Berlin": CITY.berlin,
  "America/New_York": CITY.newYork,
  "America/Los_Angeles": CITY.losAngeles,
  "Australia/Sydney": CITY.sydney,
};

const LOCALE_CITY: Record<string, LatLng> = {
  ko: CITY.seoul,
  ja: CITY.tokyo,
  vi: CITY.hanoi,
  hi: CITY.delhi,
};

const CITY_ZOOM = 12;
export const PLACE_ZOOM = 16;

export function mapStart(timezone: string, locale: string): { center: LatLng; zoom: number } {
  const city = ZONE_CITY[timezone] ?? LOCALE_CITY[locale];
  return city ? { center: city, zoom: CITY_ZOOM } : { center: { lat: 20, lng: 0 }, zoom: 2 };
}

export function placeIdFromUrl(url: string): string | null {
  const match = /[?&]query_place_id=([\w-]+)/.exec(url);
  return match ? match[1] : null;
}

function placeQueryFromUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get("query");
  } catch {
    return null;
  }
}

export function savedPlace(text: string, url: string): PlaceInput {
  const placeId = placeIdFromUrl(url);
  if (!placeId) return { text, url, picked: null };
  const query = placeQueryFromUrl(url);
  const name = query && text.startsWith(query) ? query : text;
  return { text, url, picked: name ? { placeId, name, address: null } : null };
}

export function pickPlace(suggestion: PlaceSuggestion): PlaceInput {
  return {
    text: suggestion.main,
    url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(suggestion.main)}&query_place_id=${suggestion.placeId}`,
    picked: { placeId: suggestion.placeId, name: suggestion.main, address: suggestion.secondary || null },
  };
}

export function editPlaceText(current: PlaceInput, text: string): PlaceInput {
  if (!current.picked) return { ...current, text };
  if (text.startsWith(current.picked.name)) return { ...current, text };
  return { text, url: "", picked: null };
}

export function clearPlace(): PlaceInput {
  return { text: "", url: "", picked: null };
}
