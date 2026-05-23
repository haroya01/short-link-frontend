import * as Sentry from "@sentry/nextjs";

import type { ProblemDetail } from "@/types";

const ACCESS_TOKEN_KEY = "short-link:access-token";

/**
 * Absolute backend origin in production (e.g., https://kurl.md). When the frontend runs on a
 * different subdomain (Vercel-hosted app.kurl.md), every API call must go directly to the apex
 * so the browser sends the refresh-token cookie. Empty string in dev — Next.js rewrites pick it up.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export function withBase(path: string): string {
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
  // No-op when the value hasn't changed — otherwise an expired-token path that re-calls
  // setToken(null) on every failed request re-dispatches auth:change and re-triggers /me across
  // all listeners, fanning out into N² requests.
  if (memoryToken === token) return;
  memoryToken = token;
  // 로그아웃 / 토큰 만료 → 캐시 무효화. 토큰 rotation (same user, refresh) 은 cache 유지해서
  // AuthProvider sync 가 네트워크 안 거치고 캐시 응답으로 빠르게 끝나게.
  if (token === null) invalidateMeCache();
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

export type RequestInitWithBody = Omit<RequestInit, "body"> & {
  body?: BodyInit | object | null;
};

export async function request<T>(
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
    // Leave a Sentry breadcrumb so the next captured exception (e.g. a React render that
    // dereferences a failed response) carries the API context that produced it. requestId comes
    // from the backend MdcFilter response header, so admin "recent errors" + Sentry can be
    // cross-referenced on the same id.
    // res.headers may be undefined under test fetch mocks — guard so a breadcrumb never breaks
    // the request path.
    const requestId = res.headers?.get?.("X-Request-Id") ?? null;
    Sentry.addBreadcrumb({
      category: "api",
      type: "http",
      level: res.status >= 500 ? "error" : "warning",
      message: `${(init.method ?? "GET").toUpperCase()} ${path} → ${res.status}`,
      data: {
        status: res.status,
        path,
        method: (init.method ?? "GET").toUpperCase(),
        code: (detail as { code?: string }).code,
        requestId,
      },
    });
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

// ---- /me cache lives here so setToken(null) can invalidate it without a cycle ----

import type { Me } from "@/types";

let meInFlight: Promise<Me> | null = null;
let meCache: { data: Me; ts: number } | null = null;
// /me 는 인증 상태 + 사용자 메타 (timezone / role 등). 자주 안 바뀌므로 60s 캐시.
// 토큰 refresh 마다 auth:change → AuthProvider sync → getMe 가 도는데 동일 사용자의 같은
// 데이터를 매번 네트워크에서 새로 받을 필요가 없음. setToken 이 의도적 변화 (login / logout)
// 일 땐 invalidateMeCache() 로 비움.
const ME_TTL_MS = 60_000;

export function invalidateMeCache(): void {
  meCache = null;
}

export async function getMe(): Promise<Me> {
  if (meCache && Date.now() - meCache.ts < ME_TTL_MS) {
    return meCache.data;
  }
  // Single-flight: 동시에 여러 곳에서 호출돼도 한 요청만 나가게.
  if (meInFlight) return meInFlight;
  meInFlight = request<Me>("/api/v1/users/me", { method: "GET" })
    .then((data) => {
      meCache = { data, ts: Date.now() };
      return data;
    })
    .finally(() => {
      meInFlight = null;
    });
  return meInFlight;
}

export function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
