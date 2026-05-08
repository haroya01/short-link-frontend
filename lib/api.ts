import type {
  AdminOverview,
  CreateLinkRequest,
  CreateLinkResponse,
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
  UpdateLinkRequest,
} from "@/types";

const ACCESS_TOKEN_KEY = "short-link:access-token";

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
      const res = await fetch("/api/v1/auth/refresh", {
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

  const res = await fetch(path, {
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
  return request<CreateLinkResponse>("/api/v1/links", { method: "POST", body: payload });
}

export async function listMyLinks(params?: {
  page?: number;
  size?: number;
  q?: string;
}): Promise<MyLinksPage> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.size) qs.set("size", String(params.size));
  if (params?.q) qs.set("q", params.q);
  const suffix = qs.toString() ? `?${qs}` : "";
  return request<MyLinksPage>(`/api/v1/links/me${suffix}`, { method: "GET" });
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
    body: JSON.stringify({ timezone }),
  });
}

export async function deleteMyAccount(): Promise<void> {
  await request("/api/v1/users/me", { method: "DELETE" });
}

export function exportMyDataUrl(): string {
  return "/api/v1/users/me/export";
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
    body: JSON.stringify({ statsPublic }),
  });
}

export async function getAdminOverview(): Promise<AdminOverview> {
  return request<AdminOverview>("/api/v1/admin/overview", { method: "GET" });
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
