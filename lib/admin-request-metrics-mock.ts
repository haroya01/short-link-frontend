import type {
  AdminOutcomeDistribution,
  AdminRequestRawRow,
  AdminRouteAggregate,
} from "@/types";

/**
 * Sample data for the new {@code request_metrics} admin section. Used when the table is empty —
 * either pre-launch (the deploy already happened but no traffic has flowed yet) or during local
 * dev against a fresh DB. Lets the operator see the section shape before real data lands without
 * having to seed rows by hand.
 *
 * Values mimic a realistic kurl footprint at 100k req/day:
 * - redirect-heavy route distribution (one hot {@code /r/{shortCode}}, a few API endpoints)
 * - small but visible error rate on the redirect path (404 missing-code / 410 expired / 5xx)
 * - p50 well under 10ms because most redirects hit the link cache
 */

const now = Date.now();
const isoMinutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const isoSecondsAgo = (s: number) => new Date(now - s * 1000).toISOString();

export const MOCK_ROUTE_AGGREGATES: AdminRouteAggregate[] = [
  {
    method: "GET",
    route: "/r/{shortCode}",
    count: 1247,
    p50: 3.2,
    p95: 11.8,
    p99: 28.4,
    errorRate: 0.012,
    statusDistribution: { "302": 1198, "404": 32, "410": 12, "500": 5 },
    outcomeDistribution: { redirect: 1198, not_found: 32, expired: 12, error: 5 },
  },
  {
    method: "GET",
    route: "/api/v1/users/me",
    count: 894,
    p50: 4.5,
    p95: 14.3,
    p99: 32.1,
    errorRate: 0.0,
    statusDistribution: { "200": 894 },
    outcomeDistribution: { ok: 894 },
  },
  {
    method: "POST",
    route: "/api/v1/links",
    count: 342,
    p50: 12.1,
    p95: 45.7,
    p99: 87.2,
    errorRate: 0.0088,
    statusDistribution: { "201": 339, "400": 3 },
    outcomeDistribution: { ok: 339, client_error: 3 },
  },
  {
    method: "GET",
    route: "/api/v1/links/{shortCode}/stats",
    count: 187,
    p50: 24.5,
    p95: 92.4,
    p99: 156.8,
    errorRate: 0.0,
    statusDistribution: { "200": 187 },
    outcomeDistribution: { ok: 187 },
  },
  {
    method: "GET",
    route: "/api/v1/admin/overview",
    count: 24,
    p50: 18.2,
    p95: 41.3,
    p99: 67.9,
    errorRate: 0.0,
    statusDistribution: { "200": 24 },
    outcomeDistribution: { ok: 24 },
  },
];

export const MOCK_OUTCOME_DISTRIBUTION: AdminOutcomeDistribution = {
  shortCode: "abc1234",
  total: 247,
  outcomes: { redirect: 220, not_found: 18, expired: 6, blocked: 3 },
};

export const MOCK_RAW_ROWS: AdminRequestRawRow[] = [
  {
    occurredAt: isoSecondsAgo(8),
    route: "/r/{shortCode}",
    method: "GET",
    status: 302,
    outcome: "redirect",
    latencyMs: 4,
    shortCode: "abc1234",
    userId: null,
    traceId: "trace-7f3a9c",
  },
  {
    occurredAt: isoSecondsAgo(23),
    route: "/r/{shortCode}",
    method: "GET",
    status: 302,
    outcome: "redirect",
    latencyMs: 6,
    shortCode: "promo-q3",
    userId: null,
    traceId: "trace-2b14ee",
  },
  {
    occurredAt: isoSecondsAgo(41),
    route: "/r/{shortCode}",
    method: "GET",
    status: 404,
    outcome: "not_found",
    latencyMs: 9,
    shortCode: "missing",
    userId: null,
    traceId: "trace-8d2c5a",
  },
  {
    occurredAt: isoMinutesAgo(2),
    route: "/api/v1/links",
    method: "POST",
    status: 201,
    outcome: "ok",
    latencyMs: 18,
    shortCode: null,
    userId: 42,
    traceId: "trace-1a9b3f",
  },
  {
    occurredAt: isoMinutesAgo(3),
    route: "/r/{shortCode}",
    method: "GET",
    status: 410,
    outcome: "expired",
    latencyMs: 5,
    shortCode: "old-code",
    userId: null,
    traceId: "trace-6e0d4c",
  },
  {
    occurredAt: isoMinutesAgo(5),
    route: "/api/v1/users/me",
    method: "GET",
    status: 200,
    outcome: "ok",
    latencyMs: 7,
    shortCode: null,
    userId: 42,
    traceId: "trace-3c8a2d",
  },
  {
    occurredAt: isoMinutesAgo(7),
    route: "/r/{shortCode}",
    method: "GET",
    status: 500,
    outcome: "error",
    latencyMs: 234,
    shortCode: "abc1234",
    userId: null,
    traceId: "trace-9f1e7b",
  },
];
