"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";
import { cn, inert } from "@/lib/utils";
import {
  loadMapsJs,
  mapsJsFailed,
  onMapsJsFailure,
  type GoogleMap,
  type MapClick,
  type MapPin,
  type MapsApi,
} from "@/modules/events/lib/google-maps-js";
import {
  PLACE_ZOOM,
  clearPlace,
  editPlaceText,
  mapStart,
  pickPlace,
  placeIdFromUrl,
  savedPlace,
  type LatLng,
  type PickedPlace,
  type PlaceInput,
  type PlaceSuggestion,
} from "@/modules/events/lib/place";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const PLACES_API = "https://places.googleapis.com/v1";

const TEXT_BUTTON =
  "text-[12px] font-medium text-slate-500 underline-offset-2 transition-colors hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200";
const FIELD_LABEL = "text-[14px] font-medium text-slate-800 dark:text-slate-200";

type MapMode = "off" | "loading" | "ready";

type PlaceDetails = {
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
};

async function placeDetails(
  placeId: string,
  fields: string,
  language: string,
  sessionToken?: string,
): Promise<PlaceDetails | null> {
  const params = new URLSearchParams({ languageCode: language });
  if (sessionToken) params.set("sessionToken", sessionToken);
  try {
    const res = await fetch(`${PLACES_API}/places/${encodeURIComponent(placeId)}?${params}`, {
      headers: { "X-Goog-Api-Key": MAPS_KEY, "X-Goog-FieldMask": fields },
    });
    return res.ok ? ((await res.json()) as PlaceDetails) : null;
  } catch {
    return null;
  }
}

function toLatLng(location: PlaceDetails["location"]): LatLng | null {
  return location ? { lat: location.latitude, lng: location.longitude } : null;
}

function newSessionToken(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
}

export function LocationField({
  labelledBy,
  timezone,
  text,
  url,
  onTextChange,
  onUrlChange,
}: {
  labelledBy: string;
  timezone: string;
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
  const [mode, setMode] = useState<MapMode>(() => (MAPS_KEY && !mapsJsFailed() ? "loading" : "off"));
  const [query, setQuery] = useState("");
  const [missed, setMissed] = useState(false);
  const [instant, setInstant] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapElement = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const keepView = useRef<number | null>(null);
  const live = useRef<{ api: MapsApi; map: GoogleMap; pin: MapPin } | null>(null);
  const session = useRef(newSessionToken());
  const pickSeq = useRef(0);
  const start = useRef(mapStart(timezone, locale));
  const language = useRef(locale);
  const handlers = useRef({ click: (_event: MapClick) => {}, ready: () => {}, recenter: () => {} });
  const mapOpen = mode === "ready";

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

  useEffect(() => {
    if (!MAPS_KEY || mapsJsFailed()) return;
    let alive = true;
    const stopListening = onMapsJsFailure(() => {
      if (alive) setMode("off");
    });
    loadMapsJs(MAPS_KEY, language.current)
      .then((api) => {
        if (!alive || !mapElement.current) return;
        const map = new api.Map(mapElement.current, {
          center: start.current.center,
          zoom: start.current.zoom,
          gestureHandling: "cooperative",
          clickableIcons: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        live.current = { api, map, pin: new api.Marker({ map: null }) };
        const loaded = map.addListener("tilesloaded", () => {
          loaded.remove();
          if (!alive) return;
          const above = (revealRef.current?.getBoundingClientRect().top ?? 0) < 0;
          keepView.current = above ? (rootRef.current?.getBoundingClientRect().bottom ?? null) : null;
          setInstant(above || prefersReducedMotion());
          setMode("ready");
          handlers.current.ready();
        });
        map.addListener("click", (event) => handlers.current.click(event));
      })
      .catch(() => {
        if (alive) setMode("off");
      });
    return () => {
      alive = false;
      stopListening();
    };
  }, []);

  useLayoutEffect(() => {
    const before = keepView.current;
    if (!mapOpen || before == null || !rootRef.current) return;
    keepView.current = null;
    const page = document.documentElement;
    const anchoring = page.style.overflowAnchor;
    page.style.overflowAnchor = "none";
    window.scrollBy(0, rootRef.current.getBoundingClientRect().bottom - before);
    requestAnimationFrame(() => {
      page.style.overflowAnchor = anchoring;
    });
  }, [mapOpen]);

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
        const res = await fetch(`${PLACES_API}/places:autocomplete`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": MAPS_KEY,
            "X-Goog-FieldMask":
              "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat",
          },
          body: JSON.stringify({ input, languageCode: locale, sessionToken: session.current }),
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

  const applyPicked = (next: PlaceInput) => {
    onTextChange(next.text);
    onUrlChange(next.url);
    setPicked(next.picked);
    session.current = newSessionToken();
  };

  const showOnMap = (position: LatLng, animate = true) => {
    const current = live.current;
    if (!current) return;
    current.pin.setPosition(position);
    current.pin.setMap(current.map);
    if (animate && !prefersReducedMotion()) current.map.panTo(position);
    else current.map.setCenter(position);
    if ((current.map.getZoom() ?? 0) < PLACE_ZOOM) current.map.setZoom(PLACE_ZOOM);
  };

  const hidePin = () => live.current?.pin.setMap(null);

  const changeText = (value: string) => {
    const next = editPlaceText({ text, url, picked }, value);
    apply(next);
    if (!next.picked) search(value);
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    search(value);
  };

  const pick = async (suggestion: PlaceSuggestion) => {
    cancelSearch();
    setSuggestions([]);
    setOpen(false);
    setLinkOpen(false);
    if (!mapOpen) {
      apply(pickPlace(suggestion));
      return;
    }
    setQuery("");
    setMissed(false);
    const seq = ++pickSeq.current;
    const token = session.current;
    applyPicked(pickPlace(suggestion));
    const position = toLatLng((await placeDetails(suggestion.placeId, "location", locale, token))?.location);
    if (seq === pickSeq.current && position) showOnMap(position);
  };

  const pickAt = async (event: MapClick) => {
    const current = live.current;
    if (!event.latLng || !current) return;
    const position = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    const seq = ++pickSeq.current;
    setMissed(false);
    setOpen(false);
    showOnMap(position);
    let next: PlaceInput | null = null;
    if (event.placeId) {
      event.stop?.();
      const details = await placeDetails(event.placeId, "displayName,formattedAddress", locale, session.current);
      const name = details?.displayName?.text;
      const address = details?.formattedAddress ?? "";
      if (name || address) next = pickPlace({ placeId: event.placeId, main: name || address, secondary: name ? address : "" });
    } else {
      const found = await new current.api.Geocoder()
        .geocode({ location: position, language: locale })
        .then((response) => response.results[0])
        .catch(() => undefined);
      if (found) next = pickPlace({ placeId: found.place_id, main: found.formatted_address, secondary: "" });
    }
    if (seq !== pickSeq.current) return;
    if (!next) {
      hidePin();
      setMissed(true);
      return;
    }
    applyPicked(next);
  };

  useEffect(() => {
    handlers.current = {
      click: (event) => void pickAt(event),
      ready: () => {
        if (!picked) {
          const next = mapStart(timezone, locale);
          live.current?.map.setCenter(next.center);
          live.current?.map.setZoom(next.zoom);
          return;
        }
        const restoring = picked;
        void placeDetails(restoring.placeId, "location,formattedAddress", locale).then((details) => {
          const position = toLatLng(details?.location);
          if (position) showOnMap(position, false);
          const address = details?.formattedAddress;
          if (address && !restoring.address) {
            setPicked((current) => (current?.placeId === restoring.placeId ? { ...current, address } : current));
          }
        });
      },
      recenter: () => {
        const current = live.current;
        if (!mapOpen || !current || picked) return;
        const next = mapStart(timezone, locale);
        current.map.setCenter(next.center);
        current.map.setZoom(next.zoom);
      },
    };
  });

  useEffect(() => {
    handlers.current.recenter();
  }, [timezone]);

  const clear = () => {
    cancelSearch();
    pickSeq.current += 1;
    apply(clearPlace());
    setSuggestions([]);
    setOpen(false);
    setQuery("");
    setMissed(false);
    hidePin();
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
      void pick(suggestions[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const offerGoogleLink = !MAPS_KEY && text.trim() !== "" && url.trim() === "";
  const manualLink = url.trim() !== "" && placeIdFromUrl(url) == null;
  const showLinkField = mapOpen ? manualLink : !picked && linkOpen;

  return (
    <div ref={rootRef} className="flex flex-col">
      <div key="search" className="flex flex-col gap-1.5">
        <div className="relative">
          <Input
            ref={inputRef}
            id="ef-loc"
            aria-labelledby={labelledBy}
            value={mapOpen ? query : text}
            onChange={(e) => (mapOpen ? changeQuery(e.target.value) : changeText(e.target.value))}
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
            className={!mapOpen && picked ? "pr-11" : undefined}
          />
          {!mapOpen && picked ? (
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
                    onClick={() => void pick(suggestion)}
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

        {!mapOpen && picked && (picked.address || MAPS_KEY) ? (
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

        {!mapOpen && !picked && (offerGoogleLink || !linkOpen) ? (
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

      {mode !== "off" ? (
        <div
          key="map"
          ref={revealRef}
          data-testid="location-map-reveal"
          aria-hidden={mapOpen ? undefined : true}
          {...inert(!mapOpen)}
          className={cn(
            "grid",
            !instant &&
              "transition-[grid-template-rows,opacity,margin-top] duration-300 ease-[var(--ease)] motion-reduce:transition-none",
            mapOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              ref={mapElement}
              data-testid="location-map"
              className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>
      ) : null}

      {mapOpen && missed ? (
        <p key="missed" className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
          {t("mapMissed")}
        </p>
      ) : null}

      {mapOpen && (picked || text) ? (
        <div key="picked" className="mt-4 flex flex-col gap-1.5 motion-safe:animate-fade-in">
          <label htmlFor="ef-loc-name" className={FIELD_LABEL}>
            {t("placeName")}
          </label>
          <div className="relative">
            <Input
              id="ef-loc-name"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              maxLength={200}
              className="pr-11"
            />
            <button
              type="button"
              onClick={clear}
              aria-label={t("clearPlace")}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {picked?.address ? (
            <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">{picked.address}</p>
          ) : null}
        </div>
      ) : null}

      {showLinkField ? (
        <div key="link" className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="ef-locurl" className={FIELD_LABEL}>
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
