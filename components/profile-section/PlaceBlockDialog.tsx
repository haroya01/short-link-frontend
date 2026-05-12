"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Coffee,
  Croissant,
  UtensilsCrossed,
  ShoppingBag,
  Camera,
  Image as GalleryIcon,
  PartyPopper,
  Building2,
  MapPin,
  Loader2,
} from "lucide-react";
import type { useTranslations } from "next-intl";
import type { PlaceCategory } from "@/types";
import {
  autocompletePlaces,
  getPlaceDetails,
  newSessionToken,
  type PlaceSuggestion,
} from "@/lib/google-places";
import { ConfirmDialog } from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { FormField } from "./FormField";
import { ImageUploader } from "./ImageUploader";

const NAME_MAX = 80;
const ADDRESS_MAX = 200;
const PHONE_MAX = 30;
const HOURS_MAX = 200;
const DEBOUNCE_MS = 200;

const CATEGORIES: ReadonlyArray<{ slug: PlaceCategory; icon: typeof Coffee }> = [
  { slug: "cafe", icon: Coffee },
  { slug: "bakery", icon: Croissant },
  { slug: "restaurant", icon: UtensilsCrossed },
  { slug: "retail", icon: ShoppingBag },
  { slug: "studio", icon: Camera },
  { slug: "gallery", icon: GalleryIcon },
  { slug: "popup", icon: PartyPopper },
  { slug: "space", icon: Building2 },
];

type Config = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
  phone: string;
  coverUrl: string | null;
  category: PlaceCategory | null;
  hoursText: string;
};

const EMPTY: Config = {
  name: "",
  address: "",
  lat: null,
  lng: null,
  placeId: null,
  phone: "",
  coverUrl: null,
  category: null,
  hoursText: "",
};

type Props = {
  open: boolean;
  initialJson: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (configJson: string) => void | Promise<void>;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * Editor for the PLACE block — single business / venue card. Place name + address are filled by
 * picking a Google Places autocomplete suggestion (no manual lat/lng input — the seller types
 * "누데이크 도산" and we resolve coords from the Place Details endpoint). Once a place is locked
 * in, the seller can optionally upload a storefront cover photo, set a category icon, and write
 * a freeform hours line (e.g. "매일 11-22, 화 휴무").
 *
 * <p>The Google Places API key is read from {@code NEXT_PUBLIC_GOOGLE_MAPS_API_KEY} (publishable,
 * HTTP-referrer-restricted). If it's missing in this environment, the autocomplete throws and we
 * surface a small inline error — the rest of the form keeps working, just without lookup.
 */
export function PlaceBlockDialog({ open, initialJson, onOpenChange, onSubmit, t }: Props) {
  const [config, setConfig] = useState<Config>(EMPTY);
  // Session token is regenerated on every dialog open — Google bills the autocomplete + details
  // pair at the autocomplete rate when both share a token. New session = new place lookup.
  const [sessionToken, setSessionToken] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setSessionToken(newSessionToken());
    if (initialJson) {
      try {
        const parsed = JSON.parse(initialJson);
        setConfig({
          name: parsed.name ?? "",
          address: parsed.address ?? "",
          lat: typeof parsed.lat === "number" ? parsed.lat : null,
          lng: typeof parsed.lng === "number" ? parsed.lng : null,
          placeId: parsed.placeId ?? null,
          phone: parsed.phone ?? "",
          coverUrl: parsed.coverUrl ?? null,
          category: isPlaceCategory(parsed.category) ? parsed.category : null,
          hoursText: parsed.hoursText ?? "",
        });
        return;
      } catch {
        /* fall through */
      }
    }
    setConfig(EMPTY);
  }, [open, initialJson]);

  const canSave =
    config.name.trim().length > 0 &&
    config.address.trim().length > 0 &&
    typeof config.lat === "number" &&
    typeof config.lng === "number";

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialJson ? t("editPlaceTitle") : t("addPlaceTitle")}
      description={t("addPlaceDescription")}
      confirmLabel={t("save")}
      confirmDisabled={!canSave}
      cancelLabel={t("cancel")}
      maxWidthClass="max-w-lg"
      onConfirm={async () => {
        await onSubmit(
          JSON.stringify({
            name: config.name.trim(),
            address: config.address.trim(),
            lat: config.lat,
            lng: config.lng,
            placeId: config.placeId,
            phone: config.phone.trim() || null,
            coverUrl: config.coverUrl,
            category: config.category,
            hoursText: config.hoursText.trim() || null,
          }),
        );
      }}
    >
      <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        <FormField label={t("placeFieldSearch")} required>
          <PlaceAutocompleteInput
            sessionToken={sessionToken}
            initialValue={config.name}
            placeholder={t("placeFieldSearchPlaceholder")}
            onSelect={(details) => {
              setConfig((c) => ({
                ...c,
                name: details.name,
                address: details.address,
                lat: details.lat,
                lng: details.lng,
                placeId: details.placeId,
                phone: details.phone ?? c.phone,
              }));
            }}
          />
          {config.lat != null && config.lng != null && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
              <MapPin className="h-3 w-3" />
              {config.address}
            </p>
          )}
        </FormField>

        <FormField label={t("placeFieldName")}>
          <Input
            value={config.name}
            maxLength={NAME_MAX}
            onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value }))}
            placeholder={t("placeFieldNamePlaceholder")}
          />
        </FormField>

        <FormField label={t("placeFieldAddress")}>
          <Input
            value={config.address}
            maxLength={ADDRESS_MAX}
            onChange={(e) => setConfig((c) => ({ ...c, address: e.target.value }))}
            placeholder={t("placeFieldAddressPlaceholder")}
          />
        </FormField>

        <FormField label={t("placeFieldCategory")}>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {CATEGORIES.map(({ slug, icon: Icon }) => {
              const active = config.category === slug;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() =>
                    setConfig((c) => ({ ...c, category: active ? null : slug }))
                  }
                  aria-pressed={active}
                  className={
                    "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md border text-[10px] font-medium transition " +
                    (active
                      ? "border-accent-500 bg-accent-50 text-accent-700"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700")
                  }
                >
                  <Icon className="h-4 w-4" />
                  {t(`placeCategory_${slug}`)}
                </button>
              );
            })}
          </div>
        </FormField>

        <FormField label={t("placeFieldCover")}>
          <div className="w-48">
            <ImageUploader
              value={config.coverUrl}
              onChange={(url) => setConfig((c) => ({ ...c, coverUrl: url }))}
              aspectClass="aspect-[5/3]"
              emptyHint={t("placeCoverHint")}
            />
          </div>
        </FormField>

        <FormField label={t("placeFieldPhone")}>
          <Input
            type="tel"
            value={config.phone}
            maxLength={PHONE_MAX}
            placeholder="02-1234-5678"
            onChange={(e) => setConfig((c) => ({ ...c, phone: e.target.value }))}
          />
        </FormField>

        <FormField label={t("placeFieldHours")}>
          <Textarea
            value={config.hoursText}
            maxLength={HOURS_MAX}
            rows={2}
            placeholder={t("placeFieldHoursPlaceholder")}
            onChange={(e) => setConfig((c) => ({ ...c, hoursText: e.target.value }))}
          />
        </FormField>
      </div>
    </ConfirmDialog>
  );
}

/**
 * Search input + suggestion dropdown. Debounces the autocomplete call by 200 ms so a fast typer
 * doesn't burn through requests. On suggestion click, fetches Place Details and forwards the
 * resolved fields up to the parent.
 */
function PlaceAutocompleteInput({
  sessionToken,
  initialValue,
  placeholder,
  onSelect,
}: {
  sessionToken: string;
  initialValue: string;
  placeholder: string;
  onSelect: (details: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    placeId: string;
    phone: string | null;
  }) => void;
}) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (!query.trim() || query === initialValue) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await autocompletePlaces(query, sessionToken, controller.signal);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, sessionToken, initialValue]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function handleSelect(suggestion: PlaceSuggestion) {
    setOpen(false);
    setLoading(true);
    setError(null);
    try {
      const details = await getPlaceDetails(suggestion.placeId, sessionToken);
      onSelect(details);
      setQuery(details.name);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
      )}
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
        >
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="block w-full px-3 py-2 text-left transition hover:bg-slate-50"
              >
                <span className="block truncate text-sm font-medium text-slate-900">
                  {s.primary}
                </span>
                <span className="block truncate text-[11px] text-slate-500">{s.secondary}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function isPlaceCategory(v: unknown): v is PlaceCategory {
  return (
    typeof v === "string" &&
    (CATEGORIES.find((c) => c.slug === v) !== undefined)
  );
}

