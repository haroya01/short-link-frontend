"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  clearPlace,
  editPlaceText,
  pickPlace,
  savedPlace,
  type PickedPlace,
  type PlaceInput,
  type PlaceSuggestion,
} from "@/modules/events/lib/place";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const TEXT_BUTTON =
  "text-[12px] font-medium text-slate-500 underline-offset-2 transition-colors hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200";

export function LocationField({
  labelledBy,
  text,
  url,
  onTextChange,
  onUrlChange,
}: {
  labelledBy: string;
  text: string;
  url: string;
  onTextChange: (value: string) => void;
  onUrlChange: (value: string) => void;
}) {
  const t = useTranslations("events.form");
  const locale = useLocale();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [saved] = useState(() => savedPlace(text, url));
  const [picked, setPicked] = useState<PickedPlace | null>(saved.picked);
  const [linkOpen, setLinkOpen] = useState(saved.picked == null && url.trim() !== "");
  const [linkFocus, setLinkFocus] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
  };

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  const search = (input: string) => {
    if (!MAPS_KEY) return;
    cancelSearch();
    if (input.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
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
        setActive(0);
        setOpen(items.length > 0);
      } catch {
        if (!controller.signal.aborted) setOpen(false);
      }
    }, 250);
  };

  const apply = (next: PlaceInput) => {
    if (next.text !== text) onTextChange(next.text);
    if (next.url !== url) onUrlChange(next.url);
    setPicked(next.picked);
  };

  const changeText = (value: string) => {
    const next = editPlaceText({ text, url, picked }, value);
    apply(next);
    if (!next.picked) search(value);
  };

  const pick = (suggestion: PlaceSuggestion) => {
    cancelSearch();
    apply(pickPlace(suggestion));
    setSuggestions([]);
    setOpen(false);
    setLinkOpen(false);
  };

  const clear = () => {
    cancelSearch();
    apply(clearPlace());
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (!open) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        e.preventDefault();
        setActive(0);
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(suggestions[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const offerGoogleLink = !MAPS_KEY && text.trim() !== "" && url.trim() === "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="relative">
          <Input
            ref={inputRef}
            id="ef-loc"
            aria-labelledby={labelledBy}
            value={text}
            onChange={(e) => changeText(e.target.value)}
            onKeyDown={MAPS_KEY ? onKeyDown : undefined}
            onBlur={() => setOpen(false)}
            maxLength={200}
            placeholder={t("locationPlaceholder")}
            autoComplete="off"
            role={MAPS_KEY ? "combobox" : undefined}
            aria-autocomplete={MAPS_KEY ? "list" : undefined}
            aria-expanded={MAPS_KEY ? open : undefined}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={open ? `${listId}-${active}` : undefined}
            className={picked ? "pr-11" : undefined}
          />
          {picked ? (
            <button
              type="button"
              onClick={clear}
              aria-label={t("clearPlace")}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          {open ? (
            <div className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-float motion-safe:animate-dropdown-in dark:border-slate-700 dark:bg-slate-850">
              <ul id={listId} role="listbox" aria-labelledby={labelledBy}>
                {suggestions.map((suggestion, i) => (
                  <li
                    key={suggestion.placeId}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(suggestion)}
                    className={cn(
                      "cursor-pointer px-3.5 py-2.5",
                      i === active && "bg-slate-100 dark:bg-slate-800",
                    )}
                  >
                    <span className="block truncate text-[13px] font-medium text-slate-800 dark:text-slate-200">
                      {suggestion.main}
                    </span>
                    {suggestion.secondary ? (
                      <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {suggestion.secondary}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="border-t border-slate-100 px-3.5 py-1.5 text-right text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
                Powered by Google
              </p>
            </div>
          ) : null}
        </div>

        {picked && (picked.address || MAPS_KEY) ? (
          <div key={picked.placeId} className="flex flex-col gap-3 motion-safe:animate-fade-in">
            {picked.address ? (
              <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">{picked.address}</p>
            ) : null}
            {MAPS_KEY ? (
              <iframe
                title={picked.name}
                className="aspect-[2/1] w-full rounded-lg border-0 bg-slate-100 dark:bg-slate-800"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=place_id:${picked.placeId}&language=${locale}`}
              />
            ) : null}
          </div>
        ) : null}

        {!picked && (offerGoogleLink || !linkOpen) ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {offerGoogleLink ? (
              <button
                type="button"
                onClick={() => {
                  onUrlChange(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text.trim())}`,
                  );
                  setLinkOpen(true);
                }}
                className={TEXT_BUTTON}
              >
                {t("useGoogleMaps", { place: text.trim() })}
              </button>
            ) : null}
            {!linkOpen ? (
              <button
                type="button"
                onClick={() => {
                  setLinkFocus(true);
                  setLinkOpen(true);
                }}
                className={TEXT_BUTTON}
              >
                {t("addMapLink")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {!picked && linkOpen ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ef-locurl" className="text-[14px] font-medium text-slate-800 dark:text-slate-200">
            {t("locationUrl")}
          </label>
          <Input
            id="ef-locurl"
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://"
            autoFocus={linkFocus}
          />
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
        </div>
      ) : null}
    </div>
  );
}
