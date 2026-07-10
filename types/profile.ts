export type ProfileTheme =
  | "light"
  | "dark"
  | "accent"
  | "sunset"
  | "ocean"
  | "forest"
  | "mono"
  | "neon"
  | "aurora"
  | "wave"
  | "ember";

export type ShareChannel =
  | "x"
  | "line"
  | "threads"
  | "facebook"
  | "kakao"
  | "instagram"
  | "linkedin";

/**
 * A channel + the owner's own URL on that channel. Used both server-side (persisted as JSON) and
 * client-side. Visitors clicking the X button land on {@link Social#url} — the owner's X account.
 */
export type Social = {
  channel: ShareChannel;
  url: string;
};

export type MyProfile = {
  username: string | null;
  bio: string | null;
  theme: ProfileTheme | null;
  publicUrl: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  socials: Social[];
  /** When true, the author's follower/following counts are hidden from everyone (follow still works). */
  hideFollowerCount: boolean;
};

export type PublicProfile = {
  username: string;
  bio: string | null;
  theme: ProfileTheme | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  socials: Social[];
  entries: PublicProfileEntry[];
  /** Count of the author's published blog posts — drives the "글 보기" entry-point into /p/<user>. */
  publishedPostCount: number;
  /** When true, this author hides their follower/following counts on every public surface. */
  hideFollowerCount: boolean;
};

export type PublicProfileEntry = {
  kind:
    | "LINK"
    | "TEXT"
    | "DIVIDER"
    | "IMAGE"
    | "EMBED"
    | "EMAIL_FORM"
    | "CONTACT_CARD"
    | "GALLERY"
    | "PRODUCT_CARD"
    | "BOOKING"
    | "EVENT"
    | "PLACE";
  id: number | null;
  shortCode: string | null;
  shortUrl: string | null;
  originalUrl: string | null;
  ogTitle: string | null;
  ogImage: string | null;
  clickCount: number | null;
  highlighted: boolean | null;
  /**
   * For LINK: null. For TEXT: header text. For IMAGE/EMBED: URL. For EMAIL_FORM / CONTACT_CARD /
   * GALLERY: JSON config — each renderer parses its own shape.
   */
  content: string | null;
};

export type ProfileBlock = {
  id: number;
  type:
    | "TEXT"
    | "DIVIDER"
    | "IMAGE"
    | "EMBED"
    | "EMAIL_FORM"
    | "CONTACT_CARD"
    | "GALLERY"
    | "PRODUCT_CARD"
    | "BOOKING"
    | "EVENT"
    | "PLACE";
  content: string | null;
  profileOrder: number;
};

/**
 * TEXT block visual hint — controls how {@code body} markdown is rendered on the public page.
 * - {@code inline}: bare markdown in the existing card surface (the v1 behavior).
 * - {@code card}: a tinted highlight box (Toss-style "notice / tip" treatment).
 * - {@code quote}: an accent-color left rail + indent for short callout-like text.
 */
export type TextLayout = "inline" | "card" | "quote";

/**
 * Accent palette ids shared by {@code card} + {@code quote} layouts. Each maps to a fixed Tailwind
 * shade on the renderer so the visual language is consistent across locales and themes.
 */
export type TextAccent = "blue" | "amber" | "green" | "red" | "violet";

/**
 * TEXT block JSON shape. Stored markdown body plus optional visual hints. Backward-compat: a
 * legacy plain-string {@code content} parses as {@code {body: content, layout: "inline"}}.
 */
export type TextBlockConfig = {
  body: string;
  layout: TextLayout;
  accent: TextAccent | null;
  /** Single emoji or short symbol — used as the visual hook on the {@code card} layout. */
  icon: string | null;
};

/**
 * PRODUCT_CARD JSON shape. Items rendered as a horizontal carousel; backend caps at 8 items, and
 * each item carries up to 5 images. Each image has a focal point (0..100% on each axis) that's
 * applied as CSS `object-position` on the public card so the seller can control which part of a
 * cropped image stays in view.
 */
export type ProductCardImage = {
  url: string;
  /** 0..100, horizontal focal point as a percentage of image width. Default 50 = center. */
  focalX: number;
  /** 0..100, vertical focal point as a percentage of image height. Default 50 = center. */
  focalY: number;
};

/**
 * Whitelisted badge ids — visual chip on the product image that signals "이번 주만" / "이게 잘
 * 나가요" / "곧 끝" / "다 팔림" without forcing the seller to write the same copy on every item.
 * Backend ({@code ProductCardCarousel#BADGE_IDS}) is the source of truth; the frontend renders a
 * fixed color (NEW → blue, BEST → amber, LIMITED → red, SOLD_OUT → gray + grayscale overlay).
 */
export type ProductBadge = "NEW" | "BEST" | "LIMITED" | "SOLD_OUT";

/**
 * Block-level layout — controls how the PRODUCT_CARD block renders. {@code carousel} is the v1
 * horizontal swipe; {@code grid} is a 2-column vertical list (denser, better when you have 5+
 * items and want all of them visible without swiping). Unknown values fall back to carousel.
 */
export type ProductCardLayout = "carousel" | "grid";

export type ProductCardConfig = {
  title: string | null;
  layout: ProductCardLayout;
  items: Array<{
    name: string;
    images: ProductCardImage[];
    price: string | null;
    /**
     * Pre-discount price for strikethrough display. Free-form string like {@code price} — when
     * both are parseable as the same currency we also render a "-N%" chip; otherwise just the
     * strikethrough survives.
     */
    originalPrice: string | null;
    /** One of {@link ProductBadge}, or null. Unknown values are dropped to null at parse time. */
    badge: ProductBadge | null;
    description: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
  }>;
};

/**
 * EMAIL_FORM block config — stored as JSON in {@link ProfileBlock.content}. Title required;
 * other fields fall back to sensible defaults on the public form.
 */
/**
 * PLACE block JSON shape — single business / venue / 매장 promo card. Mirrors the backend
 * {@code Place.java} record. {@code coverUrl} = uploaded storefront photo (preferred visual);
 * absent → frontend falls back to a Static Maps PNG.
 */
export type PlaceConfig = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string | null;
  phone: string | null;
  coverUrl: string | null;
  category: PlaceCategory | null;
  hoursText: string | null;
};

export type PlaceCategory =
  | "cafe"
  | "bakery"
  | "restaurant"
  | "retail"
  | "studio"
  | "gallery"
  | "popup"
  | "space";

export type EmailFormConfig = {
  title: string;
  /**
   * Short value-prop paragraph that sits between the title and the input — "왜 이메일을 남겨야
   * 할지" 안내. Null when the seller didn't write one; renderer skips the slot.
   */
  subtitle: string | null;
  placeholder: string | null;
  successMessage: string | null;
};

export type EmailLead = {
  id: number;
  blockId: number;
  email: string;
  submittedAt: string;
  optedOut: boolean;
};

export type EmailLeadPage = {
  items: EmailLead[];
  total: number;
};

/** CONTACT_CARD JSON shape. {@link name} required, rest optional. */
export type ContactCardConfig = {
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  /** Public URL of the company / personal logo uploaded via profile-images. */
  logoUrl: string | null;
  /**
   * Focal point (0..100 on each axis) used as `object-position` when the logo is rendered inside
   * a square crop. The uploaded file keeps its native aspect — the focal point lets the user
   * pick which part stays visible after the square center-crop done at display time.
   */
  logoFocalX: number;
  logoFocalY: number;
  /**
   * Holographic foil preset id. Null = use default (amethyst). Mapped to a 6-color HSL palette
   * on the public profile renderer. Backend whitelists the value so only known ids reach here.
   */
  palette: ContactCardPalette | null;
};

export type ContactCardPalette =
  | "amethyst"
  | "rose-gold"
  | "emerald"
  | "sapphire"
  | "sunset"
  | "midnight"
  | "champagne"
  | "aurora";

/** GALLERY JSON shape. Backend caps at 6 image URLs. */
export type GalleryConfig = {
  images: string[];
};

/**
 * BOOKING JSON shape — external scheduling/reservation link. Backend whitelists the host
 * (Calendly / Cal.com / 네이버예약 / 카카오 톡채널 / MS Bookings / Google Calendar appointment /
 * TidyCal / Acuity / 캐치테이블).
 */
export type BookingConfig = {
  url: string;
  title: string | null;
  description: string | null;
  ctaLabel: string | null;
};

/**
 * EVENT JSON shape — a user-authored calendar event. Times are ISO 8601 strings with offset
 * (e.g. {@code 2026-06-15T14:00:00+09:00}). ICS / Google Calendar URLs are generated on the
 * client; backend just stores + validates the fields.
 */
export type EventConfig = {
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  description: string | null;
  url: string | null;
};

/**
 * Provider id values mirror {@code Booking.Provider.id()} on the backend — used to pick the right
 * icon / label without re-parsing the URL on the client.
 */
export type BookingProvider =
  | "calendly"
  | "cal_com"
  | "google_calendar"
  | "naver_booking"
  | "kakao_channel"
  | "microsoft_bookings"
  | "tidycal"
  | "acuity"
  | "catchtable";

/**
 * Trimmed oembed response from the backend proxy. Fields mirror the provider's payload but only
 * the bits the public-profile UI actually renders. {@code html} is provider-authored iframe markup
 * — safe to render because the backend only proxies whitelisted providers.
 */
export type Oembed = {
  provider: string;
  type: string | null;
  title: string | null;
  authorName: string | null;
  thumbnailUrl: string | null;
  html: string | null;
  width: number | null;
  height: number | null;
};

export type ProfileReorderItem = {
  kind: "LINK" | "BLOCK";
  /** shortCode for LINK, block id (as string) for BLOCK */
  id: string;
};
