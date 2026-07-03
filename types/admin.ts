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
  topUsersByLinksTotal: number;
  topUsersByClicks: { userId: number; email: string; count: number }[];
  topUsersByClicksTotal: number;
  topLinksByClicks: { shortCode: string; clickCount: number; ownerEmail: string | null }[];
  topLinksByClicksTotal: number;
};

export type AdminTopUserStat = { userId: number; email: string; count: number };
export type AdminTopLinkStat = {
  shortCode: string;
  clickCount: number;
  ownerEmail: string | null;
};
export type AdminTopUsersPage = { items: AdminTopUserStat[]; total: number };
export type AdminTopLinksPage = { items: AdminTopLinkStat[]; total: number };

export type AdminUserRole = "USER" | "ADMIN";

export type AdminUserRow = {
  id: number;
  email: string;
  username: string | null;
  role: AdminUserRole;
  tier: "FREE" | "PRO";
  deleted: boolean;
  createdAt: string;
  linkCount: number;
};

export type AdminLinkStatus = "ACTIVE" | "EXPIRED" | "LIMIT_REACHED";

export type AdminLinkRow = {
  shortCode: string;
  originalUrl: string;
  ownerId: number | null;
  ownerEmail: string | null;
  clickCount: number;
  passwordProtected: boolean;
  maxViews: number | null;
  viewCount: number;
  createdAt: string;
  expiresAt: string | null;
  status: AdminLinkStatus;
};

export type AdminUsersPage = { items: AdminUserRow[]; total: number };
export type AdminLinksPage = { items: AdminLinkRow[]; total: number };
