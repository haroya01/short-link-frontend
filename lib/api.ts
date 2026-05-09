import type {
  AdminActiveUsers,
  AdminCohort,
  AdminHealthMetrics,
  AdminLifecycle,
  AdminOverview,
  AdminRecentError,
  ApiKeySummary,
  BulkImportSummary,
  ClaimResult,
  CreateLinkRequest,
  CreateLinkResponse,
  CustomDomain,
  DestinationSummary,
  IssuedApiKey,
  IssuedWebhook,
  LinkDetail,
  LinkProtectionRequest,
  LinkProtectionResponse,
  LinkStats,
  Me,
  MyLink,
  MyLinksPage,
  OgOverrideRequest,
  OgOverrideResponse,
  ProblemDetail,
  TagSummary,
  TwoFactorRecoveryCodes,
  TwoFactorSetup,
  TwoFactorStatus,
  UpdateLinkRequest,
  MyProfile,
  PublicProfile,
  WebhookConfigPatch,
  WebhookSummary,
  WeeklyInsights,
} from "@/types";

const ACCESS_TOKEN_KEY = "short-link:access-token";

/**
 * Absolute backend origin in production (e.g., https://kurl.md). When the frontend runs on a
 * different subdomain (Vercel-hosted app.kurl.md), every API call must go directly to the apex
 * so the browser sends the refresh-token cookie. Empty string in dev — Next.js rewrites pick it up.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

function withBase(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return API_BASE + path;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: ProblemDetail,
  ) {
    super(detail.detail || detail.title || `HTTP ${status}`);
  }
}

let memoryToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function readToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  if (stored) memoryToken = stored;
  return memoryToken;
}

export function setToken(token: string | null) {
  memoryToken = token;
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.dispatchEvent(new CustomEvent("auth:change"));
}

async function tryRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(withBase("/api/v1/auth/refresh"), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken: string };
      setToken(data.accessToken);
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

type RequestInitWithBody = Omit<RequestInit, "body"> & {
  body?: BodyInit | object | null;
};

async function request<T>(
  path: string,
  init: RequestInitWithBody = {},
  retried = false,
): Promise<T> {
  const headers = new Headers(init.headers);
  const hasJsonBody =
    init.body != null && typeof init.body === "object" && !(init.body instanceof FormData);
  if (hasJsonBody) headers.set("Content-Type", "application/json");
  const token = readToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(withBase(path), {
    ...init,
    credentials: "include",
    headers,
    body: hasJsonBody ? JSON.stringify(init.body) : (init.body as BodyInit | null | undefined),
  });

  if (res.status === 401 && !retried) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, init, true);
    setToken(null);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body = text ? safeParse(text) : null;

  if (!res.ok) {
    const detail: ProblemDetail =
      body && typeof body === "object"
        ? { status: res.status, ...(body as object) }
        : { status: res.status, detail: text || res.statusText };
    throw new ApiError(res.status, detail);
  }

  return body as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function shortenUrl(payload: CreateLinkRequest): Promise<CreateLinkResponse> {
  const headers: Record<string, string> = {};
  // Anonymous shorten requires a fresh PoW token; authenticated users skip it (they're
  // identified by access token + per-user rate limit).
  if (!readToken()) {
    const { getPowToken, clearPowToken } = await import("./pow");
    const pow = await getPowToken();
    if (pow) {
      headers["X-Pow-Challenge"] = pow.challenge;
      headers["X-Pow-Nonce"] = pow.nonce;
    }
    // Each token is single-use, so clear the cached one after we attach it.
    clearPowToken();
  }
  return request<CreateLinkResponse>("/api/v1/links", {
    method: "POST",
    body: payload,
    headers,
  });
}

export type MyLinksFilters = {
  page?: number;
  size?: number;
  q?: string;
  tag?: string;
  domain?: string;
  expiry?: "NEVER" | "ACTIVE" | "EXPIRED" | "HAS_EXPIRY";
  createdAfter?: string;
  createdBefore?: string;
};

export async function listMyLinks(params?: MyLinksFilters): Promise<MyLinksPage> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.size) qs.set("size", String(params.size));
  if (params?.q) qs.set("q", params.q);
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.domain) qs.set("domain", params.domain);
  if (params?.expiry) qs.set("expiry", params.expiry);
  if (params?.createdAfter) qs.set("createdAfter", params.createdAfter);
  if (params?.createdBefore) qs.set("createdBefore", params.createdBefore);
  const suffix = qs.toString() ? `?${qs}` : "";
  return request<MyLinksPage>(`/api/v1/links/me${suffix}`, { method: "GET" });
}

export async function listTags(): Promise<TagSummary[]> {
  return request<TagSummary[]>("/api/v1/tags", { method: "GET" });
}

export async function deleteTag(id: number): Promise<void> {
  await request(`/api/v1/tags/${id}`, { method: "DELETE" });
}

export async function setLinkTags(shortCode: string, tags: string[]): Promise<void> {
  await request(`/api/v1/links/${shortCode}/tags`, {
    method: "PUT",
    body: { tags },
  });
}

export async function listWebhooks(shortCode: string): Promise<WebhookSummary[]> {
  return request<WebhookSummary[]>(`/api/v1/links/${shortCode}/webhooks`, {
    method: "GET",
  });
}

export async function registerWebhook(
  shortCode: string,
  url: string,
  name?: string,
): Promise<IssuedWebhook> {
  return request<IssuedWebhook>(`/api/v1/links/${shortCode}/webhooks`, {
    method: "POST",
    body: { url, name: name ?? null },
  });
}

export async function toggleWebhook(
  shortCode: string,
  id: number,
  enabled: boolean,
): Promise<WebhookSummary> {
  return request<WebhookSummary>(`/api/v1/links/${shortCode}/webhooks/${id}`, {
    method: "PATCH",
    body: { enabled },
  });
}

export async function deleteWebhook(shortCode: string, id: number): Promise<void> {
  await request(`/api/v1/links/${shortCode}/webhooks/${id}`, { method: "DELETE" });
}

export async function updateWebhookConfig(
  shortCode: string,
  id: number,
  patch: WebhookConfigPatch,
): Promise<WebhookSummary> {
  return request<WebhookSummary>(`/api/v1/links/${shortCode}/webhooks/${id}/config`, {
    method: "PUT",
    body: patch,
  });
}

export async function listDestinations(shortCode: string): Promise<DestinationSummary[]> {
  return request<DestinationSummary[]>(`/api/v1/links/${shortCode}/destinations`, {
    method: "GET",
  });
}

export async function addDestination(
  shortCode: string,
  url: string,
  weight: number,
  label?: string,
  countryCode?: string,
): Promise<DestinationSummary> {
  return request<DestinationSummary>(`/api/v1/links/${shortCode}/destinations`, {
    method: "POST",
    body: {
      url,
      weight,
      label: label ?? null,
      countryCode: countryCode && countryCode.length > 0 ? countryCode : null,
    },
  });
}

export async function updateDestination(
  shortCode: string,
  id: number,
  payload: {
    url?: string;
    weight?: number;
    label?: string | null;
    enabled?: boolean;
    countryCode?: string | null;
  },
): Promise<DestinationSummary> {
  return request<DestinationSummary>(`/api/v1/links/${shortCode}/destinations/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteDestination(shortCode: string, id: number): Promise<void> {
  await request(`/api/v1/links/${shortCode}/destinations/${id}`, { method: "DELETE" });
}

export async function getStats(shortCode: string): Promise<LinkStats> {
  return request<LinkStats>(`/api/v1/links/${shortCode}/stats`, { method: "GET" });
}

export async function updateLink(
  shortCode: string,
  payload: UpdateLinkRequest,
): Promise<MyLink> {
  return request<MyLink>(`/api/v1/links/${shortCode}`, { method: "PATCH", body: payload });
}

export async function deleteLink(shortCode: string): Promise<void> {
  await request(`/api/v1/links/${shortCode}`, { method: "DELETE" });
}

export async function getLinkDetail(shortCode: string): Promise<LinkDetail> {
  return request<LinkDetail>(`/api/v1/links/${shortCode}/detail`, { method: "GET" });
}

export async function setLinkOgOverride(
  shortCode: string,
  payload: OgOverrideRequest,
): Promise<OgOverrideResponse> {
  return request<OgOverrideResponse>(`/api/v1/links/${shortCode}/og`, {
    method: "PATCH",
    body: payload,
  });
}

export async function setLinkProtection(
  shortCode: string,
  payload: LinkProtectionRequest,
): Promise<LinkProtectionResponse> {
  return request<LinkProtectionResponse>(`/api/v1/links/${shortCode}/protection`, {
    method: "PATCH",
    body: payload,
  });
}

export async function getMe(): Promise<Me> {
  return request<Me>("/api/v1/users/me", { method: "GET" });
}

export async function updateMyTimezone(timezone: string): Promise<Me> {
  return request<Me>("/api/v1/users/me/preferences", {
    method: "PUT",
    body: { timezone },
  });
}

export async function getWeeklyInsights(): Promise<WeeklyInsights> {
  return request<WeeklyInsights>("/api/v1/users/me/insights/week", { method: "GET" });
}

export async function startBillingCheckout(): Promise<{ url: string }> {
  return request<{ url: string }>("/api/v1/billing/checkout", { method: "POST" });
}

export async function openBillingPortal(): Promise<{ url: string }> {
  return request<{ url: string }>("/api/v1/billing/portal", { method: "POST" });
}

export async function getMyProfile(): Promise<MyProfile> {
  return request<MyProfile>("/api/v1/users/me/profile", { method: "GET" });
}

export async function updateMyProfile(payload: {
  username?: string;
  bio?: string;
}): Promise<MyProfile> {
  return request<MyProfile>("/api/v1/users/me/profile", { method: "PUT", body: payload });
}

export async function toggleLinkOnProfile(
  shortCode: string,
  show: boolean,
): Promise<{ show: boolean }> {
  return request<{ show: boolean }>(`/api/v1/links/${shortCode}/profile`, {
    method: "PUT",
    body: { show },
  });
}

export async function getPublicProfile(username: string): Promise<PublicProfile> {
  return request<PublicProfile>(`/api/v1/public/profiles/${username}`, { method: "GET" });
}

export async function deleteMyAccount(): Promise<void> {
  await request("/api/v1/users/me", { method: "DELETE" });
}

export async function downloadMyData(): Promise<void> {
  const token = readToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(withBase("/api/v1/users/me/export"), {
    method: "GET",
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let parsed: ProblemDetail;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { status: res.status, detail: text || res.statusText };
    }
    throw new ApiError(res.status, parsed);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kurl-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

export async function getPublicTotals(): Promise<{ links: number; clicks: number }> {
  return request("/api/v1/public/stats", { method: "GET" });
}

export async function getPublicLinkStats(shortCode: string): Promise<LinkStats> {
  return request<LinkStats>(`/api/v1/links/${shortCode}/public-stats`, { method: "GET" });
}

export async function setLinkVisibility(
  shortCode: string,
  statsPublic: boolean,
): Promise<{ shortCode: string; statsPublic: boolean }> {
  return request(`/api/v1/links/${shortCode}/visibility`, {
    method: "PATCH",
    body: { statsPublic },
  });
}

export async function getAdminHealthMetrics(): Promise<AdminHealthMetrics> {
  return request<AdminHealthMetrics>("/api/v1/admin/health-metrics", { method: "GET" });
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
  return request<AdminActiveUsers>(`/api/v1/admin/active-users?period=${period}`, {
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

export async function listApiKeys(): Promise<ApiKeySummary[]> {
  return request<ApiKeySummary[]>("/api/v1/users/me/api-keys", { method: "GET" });
}

export async function issueApiKey(name: string): Promise<IssuedApiKey> {
  return request<IssuedApiKey>("/api/v1/users/me/api-keys", {
    method: "POST",
    body: { name: name.trim() || null },
  });
}

export async function revokeApiKey(id: number): Promise<void> {
  await request(`/api/v1/users/me/api-keys/${id}`, { method: "DELETE" });
}

export async function claimAnonymousLinks(claimTokens: string[]): Promise<ClaimResult> {
  return request<ClaimResult>("/api/v1/users/me/claim-anonymous", {
    method: "POST",
    body: { claimTokens },
  });
}

export async function bulkImportLinks(file: File): Promise<BulkImportSummary> {
  const form = new FormData();
  form.append("file", file);
  const token = readToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(withBase("/api/v1/links/bulk"), {
    method: "POST",
    credentials: "include",
    headers,
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    let parsed: ProblemDetail;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { status: res.status, detail: text || res.statusText };
    }
    throw new ApiError(res.status, parsed);
  }
  return {
    ok: Number(res.headers.get("X-Bulk-Ok") ?? 0),
    failed: Number(res.headers.get("X-Bulk-Failed") ?? 0),
    resultCsv: text,
  };
}

export async function listCustomDomains(): Promise<CustomDomain[]> {
  return request<CustomDomain[]>("/api/v1/custom-domains", { method: "GET" });
}

export async function registerCustomDomain(domain: string): Promise<CustomDomain> {
  return request<CustomDomain>("/api/v1/custom-domains", {
    method: "POST",
    body: { domain },
  });
}

export async function verifyCustomDomain(id: number): Promise<CustomDomain> {
  return request<CustomDomain>(`/api/v1/custom-domains/${id}/verify`, { method: "POST" });
}

export async function deleteCustomDomain(id: number): Promise<void> {
  await request(`/api/v1/custom-domains/${id}`, { method: "DELETE" });
}

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  return request<TwoFactorStatus>("/api/v1/2fa/status", { method: "GET" });
}

export async function startTwoFactorSetup(): Promise<TwoFactorSetup> {
  return request<TwoFactorSetup>("/api/v1/2fa/setup", { method: "POST" });
}

export async function confirmTwoFactor(code: string): Promise<TwoFactorRecoveryCodes> {
  return request<TwoFactorRecoveryCodes>("/api/v1/2fa/confirm", {
    method: "POST",
    body: { code },
  });
}

export async function disableTwoFactor(code: string): Promise<void> {
  await request("/api/v1/2fa/disable", { method: "POST", body: { code } });
}

export async function regenerateRecoveryCodes(code: string): Promise<TwoFactorRecoveryCodes> {
  return request<TwoFactorRecoveryCodes>("/api/v1/2fa/recovery-codes/regenerate", {
    method: "POST",
    body: { code },
  });
}

export async function verifyTwoFactor(
  challenge: string,
  code: string,
  recovery: boolean,
): Promise<{ accessToken: string }> {
  return request<{ accessToken: string }>("/api/v1/auth/2fa/verify", {
    method: "POST",
    body: { challenge, code, recovery },
  });
}

export async function logout(): Promise<void> {
  try {
    await request("/api/v1/auth/logout", { method: "POST" });
  } catch {
  }
  setToken(null);
}

export function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
