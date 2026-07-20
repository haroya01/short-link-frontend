import * as Sentry from "@sentry/nextjs";

import type { ProblemDetail } from "@/types";
import { readStorageString, removeStorageItem, writeStorageString } from "@/lib/storage-json";
import { clearSessionHint, hasSessionHint, writeSessionHint } from "@/lib/session-hint";
import { mockLinksResponse } from "@/lib/api/_links-mocks";
import { fetchWithTimeout, isTimeoutError } from "@/lib/api/fetch-timeout";

const ACCESS_TOKEN_KEY = "short-link:access-token";

/**
 * Absolute backend origin in production (e.g., https://kurl.md). When the frontend runs on a
 * different subdomain (Vercel-hosted app.kurl.md), every API call must go directly to the apex
 * so the browser sends the refresh-token cookie. Empty string in dev — Next.js rewrites pick it up.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/** Demo/mock mode (NEXT_PUBLIC_USE_MOCKS=1) — lets the app render + interact without a backend. */
const MOCKS_ON = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

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
  const stored = readStorageString(ACCESS_TOKEN_KEY);
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
  if (token) {
    writeStorageString(ACCESS_TOKEN_KEY, token);
    // .kurl.me hint so anonymous visitors skip the refresh POST while cross-subdomain sessions
    // still recover (see bootstrapSession).
    writeSessionHint();
  } else {
    removeStorageItem(ACCESS_TOKEN_KEY);
    clearSessionHint();
  }
  window.dispatchEvent(new CustomEvent("auth:change"));
}

/**
 * Recover the session from the refresh cookie when there's no access token in this origin's
 * localStorage. The token is per-origin but the refresh cookie is Domain=.kurl.me, so this keeps a
 * signed-in user signed in after switching subdomains (kurl.me ↔ blog.kurl.me) instead of looking
 * logged out. No-op (and no request) when a token is already present.
 */
export async function bootstrapSession(): Promise<boolean> {
  // Demo/mock mode: seed a token so `useMe` (gated on token presence) enables and resolves to the
  // mock viewer — making the signed-in UX (follow, comments, following feed, header logout)
  // exercisable without a backend.
  if (MOCKS_ON) {
    if (!readToken()) setToken("mock-session-token");
    return true;
  }
  if (readToken()) {
    // Keep the shared .kurl.me hint fresh whenever this origin already holds a token, so the next
    // subdomain we land on knows a session exists and can recover it.
    writeSessionHint();
    return true;
  }
  // No token in this origin's storage. A pure anonymous visitor has no session to recover, so skip
  // the guaranteed-401 refresh POST; only attempt it when the hint says a session exists somewhere.
  if (!hasSessionHint()) return false;
  return (await tryRefresh()) != null;
}

async function tryRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetchWithTimeout(withBase("/api/v1/auth/refresh"), {
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
  /** Per-call abort ceiling. Omit for the 8s default; pass 0 to opt out (long-running exports). */
  timeoutMs?: number;
};

async function fetchWithAuth(
  path: string,
  init: RequestInitWithBody,
  retried: boolean,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const hasJsonBody =
    init.body != null && typeof init.body === "object" && !(init.body instanceof FormData);
  if (hasJsonBody) headers.set("Content-Type", "application/json");
  const token = readToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetchWithTimeout(
      withBase(path),
      {
        ...init,
        credentials: "include",
        headers,
        body: hasJsonBody ? JSON.stringify(init.body) : (init.body as BodyInit | null | undefined),
      },
      init.timeoutMs,
    );
  } catch (err) {
    // A hung request that aborted on the timeout — surface it as a normal 504 ApiError so callers'
    // existing try/catch (and graceful-degradation fallbacks) handle it uniformly instead of a raw
    // DOMException leaking through.
    if (isTimeoutError(err)) {
      throw new ApiError(504, {
        status: 504,
        title: "Gateway Timeout",
        detail: "Request timed out",
        code: "TIMEOUT",
      } as ProblemDetail);
    }
    throw err;
  }

  if (res.status === 401 && !retried) {
    const refreshed = await tryRefresh();
    if (refreshed) return fetchWithAuth(path, init, true);
    setToken(null);
  }

  return res;
}

export async function request<T>(
  path: string,
  init: RequestInitWithBody = {},
  retried = false,
): Promise<T> {
  // Mock mode: answer known links-product read endpoints locally so the app renders without a backend.
  if (MOCKS_ON) {
    const mocked = mockLinksResponse(path, init.method ?? "GET");
    if (mocked !== undefined) return mocked as T;
  }
  const res = await fetchWithAuth(path, init, retried);

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body = text ? safeParse(text) : null;

  if (!res.ok) {
    throw apiErrorFromResponse(path, init, res, body, text);
  }

  return body as T;
}

export async function requestText(
  path: string,
  init: RequestInitWithBody = {},
  retried = false,
): Promise<{ text: string; headers: Headers }> {
  const res = await fetchWithAuth(path, init, retried);
  const text = await res.text();
  const body = text ? safeParse(text) : null;
  if (!res.ok) {
    throw apiErrorFromResponse(path, init, res, body, text);
  }
  return { text, headers: res.headers };
}

export async function requestBlob(
  path: string,
  init: RequestInitWithBody = {},
  retried = false,
): Promise<{ blob: Blob; filename: string | null; headers: Headers }> {
  // Exports (CSV/ZIP of all events) can legitimately run long — opt out of the abort ceiling
  // unless the caller sets one explicitly.
  const res = await fetchWithAuth(path, { timeoutMs: 0, ...init }, retried);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const body = text ? safeParse(text) : null;
    throw apiErrorFromResponse(path, init, res, body, text);
  }
  return {
    blob: await res.blob(),
    filename: filenameFromContentDisposition(res.headers.get("Content-Disposition") ?? ""),
    headers: res.headers,
  };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function apiErrorFromResponse(
  path: string,
  init: RequestInitWithBody,
  res: Response,
  body: unknown,
  text: string,
): ApiError {
  const detail: ProblemDetail =
    body && typeof body === "object"
      ? { status: res.status, ...(body as object) }
      : { status: res.status, detail: text || res.statusText };
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
  return new ApiError(res.status, detail);
}

function filenameFromContentDisposition(header: string): string | null {
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) return decodeURIComponent(utf8[1]);
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1] ?? null;
}

import type { Me } from "@/types";

/** A demo viewer for mock mode — username is NOT one of the mock authors, so the follow button
 *  shows on every author page (never "your own profile"). */
// The demo viewer is the author "dohyun" (matches the mock author fixture), so visiting /p/dohyun is
// "your own profile" — private 좋아요/북마크 tabs show, the self-follow button hides, etc.
const MOCK_ME: Me = {
  id: 1,
  email: "dohyun@kurl.me",
  role: "USER",
  username: "dohyun",
  tier: "FREE",
  createdAt: "2026-01-01T00:00:00Z",
  avatarUrl: "https://i.pravatar.cc/120?img=12",
};

export async function fetchMe(): Promise<Me> {
  if (MOCKS_ON) return Promise.resolve(MOCK_ME);
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
