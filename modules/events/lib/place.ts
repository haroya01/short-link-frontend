export type PlaceSuggestion = { placeId: string; main: string; secondary: string };

export type PickedPlace = { placeId: string; name: string; address: string | null };

export type PlaceInput = { text: string; url: string; picked: PickedPlace | null };

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
