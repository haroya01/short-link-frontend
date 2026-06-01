"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  autocompletePlaces,
  getPlaceDetails,
  newSessionToken,
  type PlaceSuggestion,
} from "@/modules/profile/lib/google-places";

export interface PickedPlace {
  name: string;
  lat: number;
  lng: number;
}

/**
 * Place picker for the blog editor's "map" slash command. Reuses the profile's Google Places
 * autocomplete + details (same key/session-token contract). On pick it resolves coordinates and
 * hands them up; the editor turns them into a Google Maps place URL that the reader renders as a
 * static-map card. Anonymous-safe — Places runs client-side.
 */
export function PlaceSearchDialog({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (place: PickedPlace) => void;
}) {
  const t = useTranslations("postEditor.placeDialog");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const token = useRef("");

  useEffect(() => {
    if (!open) return;
    setQ("");
    setResults([]);
    token.current = newSessionToken();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !q.trim()) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      setLoading(true);
      autocompletePlaces(q, token.current, ctrl.signal)
        .then(setResults)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q, open]);

  async function pick(s: PlaceSuggestion) {
    try {
      const d = await getPlaceDetails(s.placeId, token.current);
      onPick({ name: d.name, lat: d.lat, lng: d.lng });
      onClose();
    } catch {
      // ignore — keep the dialog open so the user can retry
    }
  }

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={t("placeTitle")} className="fixed inset-0 z-50">
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-slate-900/30"
      />
      <div className="absolute left-1/2 top-24 w-[min(92vw,32rem)] -translate-x-1/2 animate-fade-in rounded-2xl bg-white p-4 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.4)] dark:bg-slate-900">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <MapPin className="h-4 w-4 text-accent-600" />
            {t("placeTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("placeClose")}
            className="focus-ring grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <input
          autoFocus
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("placePlaceholder")}
          className="focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-accent-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <p className="mt-1.5 text-[12px] text-slate-400">{t("placeHint")}</p>
        <ul className="mt-3 max-h-72 overflow-y-auto">
          {q.trim() && !loading && results.length === 0 && (
            <li className="px-1 py-6 text-center text-[13px] text-slate-400">{t("placeEmpty")}</li>
          )}
          {results.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="focus-ring flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {s.primary}
                  </span>
                  {s.secondary && (
                    <span className="block truncate text-[12px] text-slate-500">{s.secondary}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Build the canonical Google Maps place URL the reader parses back into a static-map card. */
export function mapsPlaceUrl({ name, lat, lng }: PickedPlace): string {
  return `https://www.google.com/maps/place/${encodeURIComponent(name)}/@${lat},${lng},16z`;
}
