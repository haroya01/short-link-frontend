import type {
  AdminActiveUsers,
  AdminActivity,
  AdminCohort,
  AdminHealthMetrics,
  AdminLifecycle,
  AdminLinkDetail,
  AdminLinkMetric,
  AdminLinkMetricsSort,
  AdminLinkMetricsWindow,
  AdminLinkSort,
  AdminLinksPage,
  AdminOutcomeDistribution,
  AdminOverview,
  AdminRecentError,
  AdminRequestMetricsWindow,
  AdminRequestRawQuery,
  AdminRequestRawRow,
  AdminRouteAggregate,
  AdminRouteMetric,
  AdminRouteMetricsWindow,
  AdminTopLinksPage,
  AdminTopUsersPage,
  AdminUserRole,
  AdminUsersPage,
} from "@/types";

import { request } from "./client";

export async function getAdminHealthMetrics(): Promise<AdminHealthMetrics> {
  return request<AdminHealthMetrics>("/api/v1/admin/health-metrics", { method: "GET" });
}

export interface MintedAccessToken {
  accessToken: string;
  expiresInSeconds: number;
}

/** Mint a fresh access token for the calling admin (for API scripting). */
export async function mintAdminAccessToken(): Promise<MintedAccessToken> {
  return request<MintedAccessToken>("/api/v1/admin/access-token", { method: "POST" });
}

export async function getAdminCohort(weeks = 8): Promise<AdminCohort> {
  return request<AdminCohort>(`/api/v1/admin/cohort?weeks=${weeks}`, { method: "GET" });
}

export async function getAdminLifecycle(days = 30): Promise<AdminLifecycle> {
  return request<AdminLifecycle>(`/api/v1/admin/lifecycle?days=${days}`, { method: "GET" });
}

export async function getAdminActiveUsers(
  period: "DAU" | "WAU" | "MAU" = "DAU",
): Promise<AdminActiveUsers> {
  const backendPeriod = period === "DAU" ? "day" : period === "WAU" ? "week" : "month";
  return request<AdminActiveUsers>(`/api/v1/admin/active-users?period=${backendPeriod}`, {
    method: "GET",
  });
}

export async function getAdminRecentErrors(limit = 50): Promise<AdminRecentError[]> {
  return request<AdminRecentError[]>(`/api/v1/admin/recent-errors?limit=${limit}`, {
    method: "GET",
  });
}

export async function getAdminOverview(): Promise<AdminOverview> {
  return request<AdminOverview>("/api/v1/admin/overview", { method: "GET" });
}

export async function getAdminTopUsersByLinks(
  page: number,
  size: number,
): Promise<AdminTopUsersPage> {
  return request<AdminTopUsersPage>(
    `/api/v1/admin/top-users-by-links?page=${page}&size=${size}`,
    { method: "GET" },
  );
}

export async function getAdminTopUsersByClicks(
  page: number,
  size: number,
): Promise<AdminTopUsersPage> {
  return request<AdminTopUsersPage>(
    `/api/v1/admin/top-users-by-clicks?page=${page}&size=${size}`,
    { method: "GET" },
  );
}

export async function getAdminTopLinksByClicks(
  page: number,
  size: number,
): Promise<AdminTopLinksPage> {
  return request<AdminTopLinksPage>(
    `/api/v1/admin/top-links-by-clicks?page=${page}&size=${size}`,
    { method: "GET" },
  );
}

export async function getAdminUsers(params: {
  q?: string;
  role?: AdminUserRole;
  page: number;
  size: number;
}): Promise<AdminUsersPage> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.role) qs.set("role", params.role);
  qs.set("page", String(params.page));
  qs.set("size", String(params.size));
  return request<AdminUsersPage>(`/api/v1/admin/users?${qs.toString()}`, { method: "GET" });
}

export async function getAdminLinks(params: {
  q?: string;
  ownerId?: number;
  sort?: AdminLinkSort;
  page: number;
  size: number;
}): Promise<AdminLinksPage> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.ownerId != null) qs.set("ownerId", String(params.ownerId));
  if (params.sort) qs.set("sort", params.sort);
  qs.set("page", String(params.page));
  qs.set("size", String(params.size));
  return request<AdminLinksPage>(`/api/v1/admin/links?${qs.toString()}`, { method: "GET" });
}

export async function getAdminLinkDetail(code: string): Promise<AdminLinkDetail> {
  return request<AdminLinkDetail>(`/api/v1/admin/links/${encodeURIComponent(code)}`, {
    method: "GET",
  });
}

export async function getAdminActivity(): Promise<AdminActivity> {
  return request<AdminActivity>("/api/v1/admin/links/activity", { method: "GET" });
}

export async function getAdminRouteMetrics(
  window: AdminRouteMetricsWindow = "all",
): Promise<AdminRouteMetric[]> {
  const qs = window === "all" ? "" : `?window=${window}`;
  return request<AdminRouteMetric[]>(`/api/v1/admin/route-metrics${qs}`, { method: "GET" });
}

export async function getAdminLinkMetrics(
  window: AdminLinkMetricsWindow = "24h",
  sort: AdminLinkMetricsSort = "count",
): Promise<AdminLinkMetric[]> {
  const params = new URLSearchParams({ window, sort });
  return request<AdminLinkMetric[]>(`/api/v1/admin/link-metrics?${params.toString()}`, {
    method: "GET",
  });
}

export async function getRequestRouteAggregates(
  window: AdminRequestMetricsWindow = "1h",
): Promise<AdminRouteAggregate[]> {
  return request<AdminRouteAggregate[]>(`/api/v1/admin/metrics/routes?window=${window}`, {
    method: "GET",
  });
}

export async function getRequestOutcomes(
  shortCode: string,
  window: AdminRequestMetricsWindow = "1h",
): Promise<AdminOutcomeDistribution> {
  const params = new URLSearchParams({ shortCode, window });
  return request<AdminOutcomeDistribution>(
    `/api/v1/admin/metrics/outcomes?${params.toString()}`,
    { method: "GET" },
  );
}

export async function getRequestRows(
  query: AdminRequestRawQuery = {},
): Promise<AdminRequestRawRow[]> {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.route) params.set("route", query.route);
  if (query.outcome) params.set("outcome", query.outcome);
  if (query.shortCode) params.set("shortCode", query.shortCode);
  if (query.userId != null) params.set("userId", String(query.userId));
  if (query.limit != null) params.set("limit", String(query.limit));
  const qs = params.toString();
  return request<AdminRequestRawRow[]>(
    `/api/v1/admin/metrics/requests${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
}
