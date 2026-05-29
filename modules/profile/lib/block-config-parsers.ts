import type {
  BookingConfig,
  ContactCardConfig,
  EmailFormConfig,
  EventConfig,
  GalleryConfig,
  PlaceCategory,
  PlaceConfig,
  ProductBadge,
  ProductCardConfig,
  ProductCardImage,
  ProductCardLayout,
  TextAccent,
  TextBlockConfig,
  TextLayout,
} from "@/types";

const PRODUCT_BADGES: readonly ProductBadge[] = ["NEW", "BEST", "LIMITED", "SOLD_OUT"];
const PRODUCT_LAYOUTS: readonly ProductCardLayout[] = ["carousel", "grid"];
const TEXT_LAYOUTS: readonly TextLayout[] = ["inline", "card", "quote"];
const TEXT_ACCENTS: readonly TextAccent[] = ["blue", "amber", "green", "red", "violet"];

/**
 * Shared parsers for the JSON payload each ProfileBlock kind persists in {@code
 * profile_block.content}. Each entry component used to inline its own {@code parseConfig} —
 * functionally similar but inconsistently typed (some returned null on invalid, others returned
 * sentinel defaults), with the same "typeof X === 'string' ? X : null" pattern repeated 60+ times
 * in 7 files.
 *
 * <p>Centralizing here:
 * <ul>
 *   <li>One consistent failure mode per block type — {@code parseXConfig} returns a typed result
 *       or {@code null} (preferred for new code) / a default-shaped object (legacy compat).</li>
 *   <li>Unit-testable from {@code lib/} without bringing up React. Previously each parser was a
 *       private function inside a "use client" component, so testing required component render
 *       which the project's vitest setup intentionally skips.</li>
 *   <li>Backend-frontend shape contracts live next to each parser as JSDoc — when the backend
 *       record changes (e.g. PRODUCT_CARD image → images migration), the contract change has
 *       exactly one place to update.</li>
 * </ul>
 */

/**
 * Coerces an unknown JSON value to a string when it's a string, otherwise {@code null}. Most
 * profile-block fields are optional strings ({@code title}, {@code description}, {@code url}), so
 * this helper carries 80% of the parser bodies.
 */
function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/** Same as {@link asString} but returns the empty string instead of null — for required fields. */
function asStringOr(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

/**
 * Safely parses a JSON string; returns {@code null} on malformed input so callers can early-exit
 * with a single null check instead of try/catch each call site.
 */
function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── TEXT ──────────────────────────────────────────────────────────────────────

/**
 * Parses a TEXT block payload. Accepts the new JSON shape {@code {body, layout, accent, icon}}
 * or a legacy plain markdown string (pre-{@code TextBlockBody} migration). On legacy input or
 * any parsing failure, returns a config with the raw input as the body and {@code inline}
 * layout — so old blocks always render exactly as before.
 *
 * <p>Unknown {@code layout} → {@code inline}, unknown {@code accent} → {@code null}, matching
 * the backend's {@link com.example.short_link.profile.contact.TextBlockBody} normalization.
 */
export function parseTextBlockConfig(raw: string): TextBlockConfig {
  const fallback: TextBlockConfig = { body: raw, layout: "inline", accent: null, icon: null };
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ...fallback, body: "" };
  }
  if (!raw.trim().startsWith("{")) return fallback;
  const parsed = safeJsonParse(raw) as Record<string, unknown> | null;
  if (!parsed || typeof parsed.body !== "string") return fallback;
  return {
    body: parsed.body,
    layout:
      typeof parsed.layout === "string" &&
      (TEXT_LAYOUTS as readonly string[]).includes(parsed.layout)
        ? (parsed.layout as TextLayout)
        : "inline",
    accent:
      typeof parsed.accent === "string" &&
      (TEXT_ACCENTS as readonly string[]).includes(parsed.accent)
        ? (parsed.accent as TextAccent)
        : null,
    icon: typeof parsed.icon === "string" && parsed.icon.trim().length > 0 ? parsed.icon : null,
  };
}

// ── BOOKING ───────────────────────────────────────────────────────────────────

export function parseBookingConfig(raw: string): BookingConfig {
  const parsed = safeJsonParse(raw) as Record<string, unknown> | null;
  if (!parsed) return { url: "", title: null, description: null, ctaLabel: null };
  return {
    url: asStringOr(parsed.url, ""),
    title: asString(parsed.title),
    description: asString(parsed.description),
    ctaLabel: asString(parsed.ctaLabel),
  };
}

// ── EVENT ─────────────────────────────────────────────────────────────────────

/** Returns null for unparseable / missing required fields (title + startsAt). */
export function parseEventConfig(raw: string): EventConfig | null {
  const parsed = safeJsonParse(raw) as Record<string, unknown> | null;
  if (!parsed) return null;
  if (typeof parsed.title !== "string" || typeof parsed.startsAt !== "string") return null;
  return {
    title: parsed.title,
    startsAt: parsed.startsAt,
    endsAt: asString(parsed.endsAt),
    location: asString(parsed.location),
    description: asString(parsed.description),
    url: asString(parsed.url),
  };
}

// ── EMAIL FORM ────────────────────────────────────────────────────────────────

/**
 * Email form intentionally falls back to {@code {title: raw}} on malformed JSON — the very first
 * version of the EMAIL_FORM block stored a plain title string rather than JSON, and we still
 * tolerate that legacy shape so old blocks don't render as empty cards.
 */
export function parseEmailFormConfig(raw: string): EmailFormConfig {
  const parsed = safeJsonParse(raw) as Record<string, unknown> | null;
  if (!parsed) return { title: raw, subtitle: null, placeholder: null, successMessage: null };
  return {
    title: asStringOr(parsed.title, ""),
    subtitle: asString(parsed.subtitle),
    placeholder: asString(parsed.placeholder),
    successMessage: asString(parsed.successMessage),
  };
}

// ── GALLERY ───────────────────────────────────────────────────────────────────

export function parseGalleryConfig(raw: string): GalleryConfig {
  const parsed = safeJsonParse(raw) as Record<string, unknown> | null;
  if (!parsed) return { images: [] };
  const images = Array.isArray(parsed.images)
    ? parsed.images.filter((v): v is string => typeof v === "string" && v.length > 0)
    : [];
  return { images };
}

// ── PRODUCT CARD ──────────────────────────────────────────────────────────────

function clampFocal(v: number): number {
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

/**
 * Per-item image parser. Accepts the new {@code images: [{url, focalX, focalY}]} shape or the
 * legacy {@code image: string} (single-image, no focal point) — the backend's {@code
 * ProductCardCarousel.normalize} runs the same backward-compat fallback, so what the editor sees
 * and what the server stores stay aligned.
 */
function parseProductCardImages(item: Record<string, unknown>): ProductCardImage[] {
  if (Array.isArray(item.images)) {
    return item.images
      .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
      .map((v) => ({
        url: asStringOr(v.url, ""),
        focalX: typeof v.focalX === "number" ? clampFocal(v.focalX) : 50,
        focalY: typeof v.focalY === "number" ? clampFocal(v.focalY) : 50,
      }))
      .filter((img) => img.url.length > 0);
  }
  if (typeof item.image === "string" && item.image.length > 0) {
    return [{ url: item.image, focalX: 50, focalY: 50 }];
  }
  return [];
}

export function parseProductCardConfig(raw: string): ProductCardConfig {
  const parsed = safeJsonParse(raw) as Record<string, unknown> | null;
  if (!parsed) return { title: null, layout: "carousel", items: [] };
  const items = Array.isArray(parsed.items)
    ? parsed.items
        .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
        .map((v) => ({
          name: asStringOr(v.name, ""),
          images: parseProductCardImages(v),
          price: asString(v.price),
          originalPrice: asString(v.originalPrice),
          badge:
            typeof v.badge === "string" && (PRODUCT_BADGES as readonly string[]).includes(v.badge)
              ? (v.badge as ProductBadge)
              : null,
          description: asString(v.description),
          ctaLabel: asString(v.ctaLabel),
          ctaUrl: asString(v.ctaUrl),
        }))
        .filter((it) => it.name.length > 0)
    : [];
  return {
    title: asString(parsed.title),
    layout:
      typeof parsed.layout === "string" &&
      (PRODUCT_LAYOUTS as readonly string[]).includes(parsed.layout)
        ? (parsed.layout as ProductCardLayout)
        : "carousel",
    items,
  };
}

// ── CONTACT CARD ──────────────────────────────────────────────────────────────

/**
 * Contact card returns a default-shaped object (not null) on parse failure — the public profile
 * tolerates an empty card rather than dropping it from the feed entirely, since visitors at
 * least see "name : empty" feedback that something's broken rather than the block vanishing.
 */
export function parseContactCardConfig(raw: string): ContactCardConfig {
  const parsed = safeJsonParse(raw) as Record<string, unknown> | null;
  if (!parsed) return EMPTY_CONTACT_CARD;
  return {
    name: asStringOr(parsed.name, ""),
    title: asString(parsed.title),
    company: asString(parsed.company),
    email: asString(parsed.email),
    phone: asString(parsed.phone),
    address: asString(parsed.address),
    website: asString(parsed.website),
    logoUrl: asString(parsed.logoUrl),
    logoFocalX:
      typeof parsed.logoFocalX === "number" ? clampFocal(parsed.logoFocalX) : 50,
    logoFocalY:
      typeof parsed.logoFocalY === "number" ? clampFocal(parsed.logoFocalY) : 50,
    palette:
      typeof parsed.palette === "string"
        ? (parsed.palette as ContactCardConfig["palette"])
        : null,
  };
}

const EMPTY_CONTACT_CARD: ContactCardConfig = {
  name: "",
  title: null,
  company: null,
  email: null,
  phone: null,
  address: null,
  website: null,
  logoUrl: null,
  logoFocalX: 50,
  logoFocalY: 50,
  palette: null,
};

// ── PLACE ─────────────────────────────────────────────────────────────────────

const PLACE_CATEGORIES: readonly PlaceCategory[] = [
  "cafe",
  "bakery",
  "restaurant",
  "retail",
  "studio",
  "gallery",
  "popup",
  "space",
];

function asPlaceCategory(v: unknown): PlaceCategory | null {
  return typeof v === "string" && (PLACE_CATEGORIES as readonly string[]).includes(v)
    ? (v as PlaceCategory)
    : null;
}

/** Returns null when required fields (name / address / lat / lng) are missing or malformed. */
export function parsePlaceConfig(raw: string): PlaceConfig | null {
  const parsed = safeJsonParse(raw) as Record<string, unknown> | null;
  if (!parsed) return null;
  if (
    typeof parsed.name !== "string" ||
    typeof parsed.address !== "string" ||
    typeof parsed.lat !== "number" ||
    typeof parsed.lng !== "number"
  ) {
    return null;
  }
  return {
    name: parsed.name,
    address: parsed.address,
    lat: parsed.lat,
    lng: parsed.lng,
    placeId: asString(parsed.placeId),
    phone: asString(parsed.phone),
    coverUrl: asString(parsed.coverUrl),
    category: asPlaceCategory(parsed.category),
    hoursText: asString(parsed.hoursText),
  };
}
