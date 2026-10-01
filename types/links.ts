export type CreateLinkRequest = {
  url: string;
  customCode?: string;
  expiresAt?: string;
  password?: string;
};

export type CreateLinkResponse = {
  shortCode: string;
  shortUrl: string;
  claimToken: string | null;
  passwordProtected?: boolean;
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
  note?: string | null;
  timezone?: string;
  humanClickCount?: number;
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
  clearExpiresAt?: boolean;
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
  openInBrowser?: boolean;
  splash?: LinkSplash;
  opensAt?: string | null;
  destinationHealth?: DestinationHealth | null;
  /** Present while an operator or the safety rescan has switched the link off; visitors get a 410 page. */
  moderation?: LinkModeration | null;
};

export type LinkDisableReason = "ABUSE_REPORT" | "ADMIN" | "SAFE_BROWSING";

export type LinkModeration = {
  reason: LinkDisableReason;
  disabledAt: string;
};

export type DestinationHealth = {
  broken: boolean;
  failure: "NOT_FOUND" | "GONE" | "NO_HOST" | null;
  httpStatus: number | null;
  brokenSince: string | null;
  checkedAt: string;
};

export type LinkSplash = {
  enabled: boolean;
  message: string | null;
  seconds: number;
  ctaId: number | null;
};

export type LinkVisitOptions = {
  openInBrowser?: boolean;
  splash?: LinkSplash;
  opensAt?: string;
  clearOpensAt?: boolean;
};

export type LinkVisitOptionsResponse = {
  shortCode: string;
  openInBrowser: boolean;
  splash?: LinkSplash;
  opensAt?: string | null;
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

export type DestinationSummary = {
  id: number;
  url: string;
  weight: number;
  label: string | null;
  enabled: boolean;
  countryCode: string | null;
  deviceClass: string | null;
  os: string | null;
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
