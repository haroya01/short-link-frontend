"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * 장소 입력 = 구글 지도 실연동. 장소명을 치면 Places API(New) 자동완성이 뜨고, 고르는 순간
 * 지도 링크(place_id 딥링크)가 채워지며 아래에 지도 미리보기(Maps Embed)가 박힌다.
 * `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 가 없으면 수동 입력 + 링크 생성 버튼으로 조용히 폴백.
 */
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

type Suggestion = { placeId: string; main: string; secondary: string };

export function LocationField({
  text,
  url,
  onTextChange,
  onUrlChange,
}: {
  text: string;
  url: string;
  onTextChange: (value: string) => void;
  onUrlChange: (value: string) => void;
}) {
  const t = useTranslations("events.form");
  const locale = useLocale();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [placeId, setPlaceId] = useState<string | null>(() => placeIdFromUrl(url));
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const search = (input: string) => {
    if (!MAPS_KEY) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (input.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": MAPS_KEY,
            "X-Goog-FieldMask":
              "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat",
          },
          body: JSON.stringify({ input, languageCode: locale }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          suggestions?: {
            placePrediction?: {
              placeId: string;
              structuredFormat?: {
                mainText?: { text?: string };
                secondaryText?: { text?: string };
              };
            };
          }[];
        };
        const items = (data.suggestions ?? [])
          .map((s) => s.placePrediction)
          .filter((p): p is NonNullable<typeof p> => p != null)
          .map((p) => ({
            placeId: p.placeId,
            main: p.structuredFormat?.mainText?.text ?? "",
            secondary: p.structuredFormat?.secondaryText?.text ?? "",
          }))
          .filter((s) => s.main)
          .slice(0, 5);
        setSuggestions(items);
        setOpen(items.length > 0);
      } catch {
        // 자동완성 실패는 조용히 — 수동 입력이 항상 살아 있다.
      }
    }, 250);
  };

  const pick = (suggestion: Suggestion) => {
    onTextChange(suggestion.main);
    onUrlChange(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(suggestion.main)}&query_place_id=${suggestion.placeId}`,
    );
    setPlaceId(suggestion.placeId);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex flex-col gap-1.5">
        <label htmlFor="ef-loc" className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
          {t("locationText")}
        </label>
        <Input
          id="ef-loc"
          value={text}
          onChange={(e) => {
            onTextChange(e.target.value);
            setPlaceId(null);
            search(e.target.value);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          maxLength={200}
          placeholder={t("locationPlaceholder")}
          autoComplete="off"
        />
        {open ? (
          <div className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.placeId}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(suggestion)}
                className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-slate-800 dark:text-slate-200">
                    {suggestion.main}
                  </span>
                  {suggestion.secondary ? (
                    <span className="block truncate text-[11px] text-slate-400 dark:text-slate-500">
                      {suggestion.secondary}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
            <p className="border-t border-slate-100 px-3.5 py-1.5 text-right text-[10px] text-slate-300 dark:border-slate-800 dark:text-slate-600">
              Powered by Google
            </p>
          </div>
        ) : null}
      </div>

      {MAPS_KEY && placeId ? (
        <iframe
          title="map"
          className="aspect-[2/1] w-full rounded-lg border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=place_id:${placeId}&language=${locale}`}
        />
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="ef-locurl"
          className="text-[12px] font-medium text-slate-600 dark:text-slate-400"
        >
          {t("locationUrl")}
        </label>
        <Input
          id="ef-locurl"
          type="url"
          value={url}
          onChange={(e) => {
            onUrlChange(e.target.value);
            setPlaceId(placeIdFromUrl(e.target.value));
          }}
          placeholder="https://maps.google.com/…"
        />
        {!MAPS_KEY && text.trim() && !url.trim() ? (
          <button
            type="button"
            onClick={() =>
              onUrlChange(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text.trim())}`,
              )
            }
            className="self-start text-[12px] font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-600 dark:text-emerald-400"
          >
            {t("useGoogleMaps", { place: text.trim() })}
          </button>
        ) : null}
        {url.trim() ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="self-start text-[12px] font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700 dark:text-slate-400"
          >
            {t("openMap")}
          </a>
        ) : null}
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{t("locationUrlHint")}</p>
      </div>
    </div>
  );
}

function placeIdFromUrl(url: string): string | null {
  const match = /[?&]query_place_id=([\w-]+)/.exec(url);
  return match ? match[1] : null;
}
