export type CreateLinkRequest = {
  url: string;
  customCode?: string;
  expiresAt?: string;
};

export type CreateLinkResponse = {
  shortCode: string;
  shortUrl: string;
  claimToken: string | null;
};

export type ClaimResult = {
  claimed: number;
  skipped: number;
};

export type BulkImportSummary = {
  ok: number;
  failed: number;
  resultCsv: string;
};

export type MyLink = {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
  clickCount: number;
  tags: string[];
  clicksLast7d: number[];
};

export type TagSummary = {
  id: number;
  name: string;
  color: string | null;
  linkCount: number;
  createdAt: string;
};

export type MyLinksPage = {
  items: MyLink[];
  /** Opaque cursor for the next page; null when no more results. */
  nextCursor: string | null;
  hasMore: boolean;
};

export type UpdateLinkRequest = {
  originalUrl?: string;
  expiresAt?: string | null;
  note?: string;
  expiredMessage?: string;
};

export type LinkDetail = {
  shortCode: string;
  originalUrl: string;
  expiresAt: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogTitleOverride: string | null;
  ogDescriptionOverride: string | null;
  ogImageOverride: string | null;
  passwordProtected: boolean;
  maxViews: number | null;
  viewCount: number;
  statsPublic: boolean;
  tags: string[];
  note: string | null;
  expiredMessage: string | null;
};

export type OgOverrideRequest = {
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
};

export type OgOverrideResponse = {
  shortCode: string;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
};

export type LinkProtectionRequest = {
  password?: string | null;
  maxViews?: number | null;
};

export type LinkProtectionResponse = {
  shortCode: string;
  passwordProtected: boolean;
  maxViews: number | null;
  viewCount: number;
};

export type DailyClick = { date: string; count: number };
export type HourClick = { hour: number; count: number };
export type DayOfWeekClick = { dayOfWeek: string; count: number };
export type HeatmapCell = { dayOfWeek: string; hour: number; count: number };
export type ReferrerClick = { referrer: string; count: number };
export type ReferrerHostClick = { host: string; count: number };
export type ChannelClick = { channel: string; count: number };
export type DeviceClick = { device: string; count: number };
export type OsClick = { os: string; count: number };
export type BrowserClick = { browser: string; count: number };
export type BotClick = { bot: string; count: number };
export type UtmCampaignClick = { campaign: string; count: number };
export type UtmSourceClick = { source: string; count: number };
export type UtmMediumClick = { medium: string; count: number };
export type UtmContentClick = { content: string; count: number };
export type SourceChannelClick = { source: string; count: number };

export type WebhookFormat = "GENERIC" | "DISCORD" | "SLACK";

export type WebhookSummary = {
  id: number;
  url: string;
  name: string | null;
  enabled: boolean;
  createdAt: string;
  lastCalledAt: string | null;
  lastStatusCode: number | null;
  lastError: string | null;
  includeBots: boolean;
  sampleRate: number;
  batchEnabled: boolean;
  dailyQuota: number | null;
  consecutiveFailures: number;
  autoDisabledReason: string | null;
  referrerHostFilter: string | null;
  utmSourceFilter: string | null;
  format: WebhookFormat;
};

export type WebhookConfigPatch = {
  includeBots?: boolean;
  sampleRate?: number;
  batchEnabled?: boolean;
  dailyQuota?: number | null;
  referrerHostFilter?: string | null;
  utmSourceFilter?: string | null;
};

export type IssuedWebhook = {
  id: number;
  url: string;
  secret: string;
  name: string | null;
  createdAt: string;
  format: WebhookFormat;
};

export type DestinationSummary = {
  id: number;
  url: string;
  weight: number;
  label: string | null;
  enabled: boolean;
  countryCode: string | null;
  createdAt: string;
};

export type DestinationClick = {
  destinationId: number | null;
  url: string;
  label: string | null;
  weight: number;
  enabled: boolean;
  count: number;
};

export type CountryClick = { country: string; count: number };
export type RegionClick = { region: string; count: number };
export type CityClick = { city: string; count: number };
export type LanguageClick = { language: string; count: number };
export type AsnClick = { asn: number | null; organization: string; count: number };

export type Velocity = {
  currentHour: number;
  baselinePerHour: number;
  ratio: number;
};

export type LinkStats = {
  shortCode: string;
  timezone: string;
  totalClicks: number;
  humanClicks: number;
  botClicks: number;
  uniqueClicks: number;
  previewClicks: number;
  profileClicks: number;
  firstClickAt: string | null;
  lastClickAt: string | null;
  timeToFirstClickMinutes: number | null;
  peakHour: number | null;
  velocity: Velocity;
  returnRate?: { newVisitors: number; returningVisitors: number; ratio: number };
  dailyClicks: DailyClick[];
  hourClicks: HourClick[];
  dayOfWeekClicks: DayOfWeekClick[];
  heatmap: HeatmapCell[];
  referrerClicks: ReferrerClick[];
  referrerHostClicks: ReferrerHostClick[];
  channelClicks: ChannelClick[];
  deviceClicks: DeviceClick[];
  osClicks: OsClick[];
  browserClicks: BrowserClick[];
  botClicks2: BotClick[];
  utmCampaignClicks: UtmCampaignClick[];
  utmSourceClicks: UtmSourceClick[];
  utmMediumClicks: UtmMediumClick[];
  utmContentClicks: UtmContentClick[];
  sourceChannelClicks: SourceChannelClick[];
  destinationClicks: DestinationClick[];
  countryClicks: CountryClick[];
  regionClicks: RegionClick[];
  cityClicks: CityClick[];
  languageClicks: LanguageClick[];
  asnClicks: AsnClick[];
  datacenterClicks: number;
};

/**
 * Aggregated visit stats for one profile owner — backend {@code ProfileStats} 의 JSON shape.
 * LinkStats 와 비슷한 차트용 sub-records 를 공유하지만 link-only 필드 (destinations / preview /
 * lifecycle / return rate / insights) 는 제외.
 */
export type ProfileStats = {
  timezone: string;
  totalVisits: number;
  humanVisits: number;
  botVisits: number;
  uniqueVisits: number;
  firstVisitAt: string | null;
  lastVisitAt: string | null;
  peakHour: number | null;
  dailyVisits: DailyClick[];
  hourVisits: HourClick[];
  heatmap: HeatmapCell[];
  countryVisits: CountryClick[];
  deviceVisits: DeviceClick[];
  browserVisits: BrowserClick[];
  referrerHostVisits: ReferrerHostClick[];
  sourceChannelVisits: SourceChannelClick[];
  utmCampaignVisits: UtmCampaignClick[];
  utmSourceVisits: UtmSourceClick[];
};

export type ProfileVisitSummary = {
  today: number;
  week: number;
  month: number;
  allTime: number;
};

export type Me = {
  id: number;
  email: string;
  provider?: string;
  oauthProvider?: string;
  role: "USER" | "ADMIN";
  timezone?: string;
  createdAt: string;
  tier?: "FREE" | "PRO";
  subscriptionCurrentPeriodEnd?: string | null;
  username?: string | null;
};

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
};

export type PublicProfile = {
  username: string;
  bio: string | null;
  theme: ProfileTheme | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  socials: Social[];
  entries: PublicProfileEntry[];
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

export type WeeklyInsights = {
  from: string;
  to: string;
  totalClicks: number;
  humanClicks: number;
  previousHumanClicks: number;
  deltaPercent: number | null;
  humanRatio: number | null;
  topLink: {
    shortCode: string;
    originalUrl: string;
    clicks: number;
    topUtmSource: string | null;
  } | null;
  peak: {
    dayOfWeek: number;
    hour: number;
    clicks: number;
  } | null;
};

export type CustomDomain = {
  id: number;
  domain: string;
  verificationToken: string;
  verificationHost: string;
  verified: boolean;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  autoVerifyUntil: string | null;
};

export type TwoFactorStatus = {
  enabled: boolean;
  lastUsedAt: string | null;
};

export type TwoFactorSetup = {
  secret: string;
  provisioningUri: string;
};

export type TwoFactorRecoveryCodes = {
  recoveryCodes: string[];
};

export type AdminActiveUsers = {
  period: string;
  buckets: { bucket: string; active: number }[];
};

export type AdminCohort = {
  weeks: number;
  rows: {
    cohortWeek: string;
    size: number;
    cells: { weekOffset: number; active: number; ratio: number }[];
  }[];
};

export type AdminLifecycle = {
  maxDay: number;
  days: { day: number; clicks: number; contributingLinks: number }[];
};

export type AdminRecentError = {
  // Renamed from occurredAt → timestamp to match the backend record field. Old field kept
  // optional for backwards-compat during a rolling deploy where the API may briefly emit
  // either shape.
  timestamp: string;
  occurredAt?: string;
  level: string;
  logger: string;
  thread: string | null;
  message: string;
  exceptionClass: string | null;
  exceptionMessage: string | null;
  causeChain: string[] | null;
  stackTrace: string | null;
  requestId: string | null;
  requestUri: string | null;
  requestMethod: string | null;
  userId: string | null;
  clientIp: string | null;
  taskName: string | null;
};

export type AdminHealthMetrics = {
  httpLatency: { p50Millis: number; p95Millis: number; p99Millis: number; sampleCount: number };
  httpStatusCounts: { count2xx: number; count4xx: number; count5xx: number };
  rateLimitExceeded: number;
  safeBrowsingMalicious: number;
  authFailures: number;
  dbPool: { active: number; idle: number; waiting: number; max: number };
  cache: { gets: number; hits: number; misses: number; hitRatio: number };
  redirect: {
    p50Millis: number;
    p95Millis: number;
    p99Millis: number;
    total: number;
    redirects: number;
    previews: number;
    notFound: number;
    expired: number;
    viewLimit: number;
    passwordRequired: number;
    errors: number;
  };
};

export type AdminRouteMetric = {
  uri: string;
  method: string;
  count: number;
  p50Millis: number;
  p95Millis: number;
  p99Millis: number;
  errorRate: number;
  error5xxCount: number;
  statusDistribution: Record<string, number>;
};

export type AdminRouteMetricsWindow = "all" | "1h" | "24h" | "7d";

/**
 * Per-short_code redirect performance. Backed by an in-memory rolling sample ring on the
 * backend — `windowedRedirects` and the latency / outcome fields reflect only the requested
 * window, while `totalRedirects` is the lifetime count from the DB. `outcomeCounts` carries
 * one of: `redirect`, `preview`, `not_found`, `expired`, `view_limit`, `blocked`,
 * `password_required`, `error`, `other`. The recorder is bounded LRU (top N hot codes) so
 * cold links may be missing entirely.
 */
export type AdminLinkMetric = {
  shortCode: string;
  originalUrl: string | null;
  userId: number | null;
  ownerEmail: string | null;
  totalRedirects: number;
  windowedRedirects: number;
  p50Millis: number;
  p95Millis: number;
  p99Millis: number;
  errorRate: number;
  outcomeCounts: Record<string, number>;
  lastRedirectAt: string | null;
};

export type AdminLinkMetricsWindow = "1h" | "24h" | "7d" | "all";
export type AdminLinkMetricsSort = "count" | "latency" | "error";

/**
 * Backed by the {@code request_metrics} table (every finished HTTP request, persisted async
 * via {@code RequestMetricsFilter}). Same per-route aggregate shape as
 * {@link AdminRouteMetric} but with an outcome distribution column ({@code redirect /
 * not_found / expired / blocked / ...}) the timer-backed source can't surface.
 */
export type AdminRouteAggregate = {
  method: string;
  route: string;
  count: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  statusDistribution: Record<string, number>;
  outcomeDistribution: Record<string, number>;
};

export type AdminOutcomeDistribution = {
  shortCode: string;
  total: number;
  outcomes: Record<string, number>;
};

export type AdminRequestMetricsWindow = "1h" | "24h" | "7d";

export type AdminRequestRawRow = {
  occurredAt: string;
  route: string;
  method: string;
  status: number;
  outcome: string;
  latencyMs: number;
  shortCode: string | null;
  userId: number | null;
  traceId: string | null;
};

export type AdminRequestRawQuery = {
  from?: string;
  to?: string;
  route?: string;
  outcome?: string;
  shortCode?: string;
  userId?: number;
  limit?: number;
};

export type AdminOverview = {
  totals: { users: number; links: number; clicks: number };
  newUsers7d: number;
  newLinks7d: number;
  clicks7d: number;
  anonymousLinkRatio: number;
  expiredLinkRatio: number;
  clicklessLinkRatio: number;
  dailySignups: { date: string; count: number }[];
  dailyLinks: { date: string; count: number }[];
  dailyClicks: { date: string; count: number }[];
  topUsersByLinks: { userId: number; email: string; count: number }[];
  topUsersByClicks: { userId: number; email: string; count: number }[];
  topLinksByClicks: { shortCode: string; clickCount: number; ownerEmail: string | null }[];
};

export type ApiKeySummary = {
  id: number;
  prefix: string;
  name: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export type IssuedApiKey = {
  id: number;
  rawKey: string;
  prefix: string;
  name: string | null;
  createdAt: string;
};

export type ProblemDetail = {
  status: number;
  title?: string;
  detail?: string;
  code?: string;
  errors?: { field: string; message: string }[];
};
