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

import type { Me } from "@/types";

export async function fetchMe(): Promise<Me> {
  return request<Me>("/api/v1/users/me", { method: "GET" });
}

export function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
