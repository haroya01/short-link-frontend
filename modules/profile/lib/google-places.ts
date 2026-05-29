"use client";

/**
 * Thin client for the Google Places API (New) — Autocomplete + Place Details. Called directly
 * from the browser using {@code NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}, which is locked to our domain
 * via HTTP-referrer restriction in Google Cloud Console (the key is publishable, like Stripe
 * pk_live_*). No backend proxy needed for these endpoints.
 *
 * <p>Field masks keep the response trim and the per-request cost low — Place Details bills by the
 * fields requested, so we only ask for the ones the PLACE card actually persists (id, name,
 * formattedAddress, location, internationalPhoneNumber).
 */

const PLACES_API_BASE = "https://places.googleapis.com/v1";

function apiKey(): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured. Set it in the deployment env (Vercel) and restart the dev server.",
    );
  }
  return key;
}

export type PlaceSuggestion = {
  placeId: string;
  /** Primary line — usually the place name (e.g. "누데이크 하우스 도산"). */
  primary: string;
  /** Secondary line — usually the locality / region (e.g. "압구정로46길 50, 강남구, 서울"). */
  secondary: string;
};

export type PlaceDetails = {
  placeId: string;
  /** Display name as Google has it. */
  name: string;
  /** Formatted address — e.g. "서울 강남구 압구정로46길 50". */
  address: string;
  lat: number;
  lng: number;
  /** International phone number ({@code +82 2-1234-5678}); null if Google doesn't have one. */
  phone: string | null;
};

/**
 * Searches places by text. Returns up to 5 suggestions. {@code sessionToken} should be the same
 * UUID across an entire autocomplete session (typing → selection) — Google bills the selection at
 * the autocomplete rate when the token matches a recent query, instead of double-charging.
 */
export async function autocompletePlaces(
  query: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  if (!query.trim()) return [];
  const res = await fetch(`${PLACES_API_BASE}/places:autocomplete`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({
      input: query,
      sessionToken,
      // Korean-language UI shows Korean place names; bias to KR but don't restrict (sellers might
      // promote overseas locations occasionally — they'll just see English results).
      languageCode: "ko",
      regionCode: "KR",
    }),
  });
  if (!res.ok) {
    throw new Error(`places autocomplete failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId?: string;
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
  };
  return (data.suggestions ?? [])
    .map((s): PlaceSuggestion | null => {
      const pred = s.placePrediction;
      if (!pred?.placeId) return null;
      return {
        placeId: pred.placeId,
        primary: pred.structuredFormat?.mainText?.text ?? "",
        secondary: pred.structuredFormat?.secondaryText?.text ?? "",
      };
    })
    .filter((s): s is PlaceSuggestion => s !== null);
}

/**
 * Resolves a placeId to the fields we actually persist. Use the same {@code sessionToken} the
 * autocomplete used so the lookup billing wraps into the session price.
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<PlaceDetails> {
  const url = `${PLACES_API_BASE}/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}&languageCode=ko&regionCode=KR`;
  const res = await fetch(url, {
    method: "GET",
    signal,
    headers: {
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location,internationalPhoneNumber",
    },
  });
  if (!res.ok) {
    throw new Error(`place details failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    internationalPhoneNumber?: string;
  };
  if (
    !data.id ||
    !data.displayName?.text ||
    !data.formattedAddress ||
    typeof data.location?.latitude !== "number" ||
    typeof data.location?.longitude !== "number"
  ) {
    throw new Error("place details response missing required fields");
  }
  return {
    placeId: data.id,
    name: data.displayName.text,
    address: data.formattedAddress,
    lat: data.location.latitude,
    lng: data.location.longitude,
    phone: data.internationalPhoneNumber ?? null,
  };
}

/** UUID v4 for session tokens — Google docs recommend per-session token to bill at session rate. */
export function newSessionToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
