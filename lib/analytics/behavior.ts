/**
 * First-party reader-behavior beacon queue. Feeds our own `behavior_event` table (not PostHog):
 * events must join server-side view/click rows (visitor hash, bot flags) for the funnel, so they
 * have to land in our DB. Delivery contract mirrors the view beacon — fire-and-forget, no
 * Content-Type header (text/plain avoids a CORS preflight; the backend parses the raw string), and
 * failures are silent because analytics must never cost UX.
 *
 * Identity is deliberately thin: a tab-lifetime session id (sessionStorage — no tracking cookie)
 * plus the server-side visitor hash. Mock lane (NEXT_PUBLIC_USE_MOCKS=1) keeps events in-memory so
 * demo/e2e runs stay network-free.
 */

export type BehaviorTargetType = "post" | "connection" | "profile" | "series" | "tag";

export type BehaviorEventInput = {
  name: "read_progress" | "second_action" | "cta_click";
  postId?: number;
  targetType?: BehaviorTargetType;
  targetId?: string;
  depthPct?: number;
  dwellMs?: number;
};

declare global {
  interface Window {
    __kurlBehavior?: BehaviorEventInput[];
  }
}

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const SESSION_KEY = "kurl_bhv_sid";
const FLUSH_AFTER_MS = 8_000;
const FLUSH_AT_COUNT = 12;

let queue: BehaviorEventInput[] = [];
let timer: number | null = null;

/** Tab-lifetime session id; null when storage is unavailable (private mode) — events still send. */
export function behaviorSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let sid = window.sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      window.sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return null;
  }
}

export function trackBehavior(evt: BehaviorEventInput): void {
  if (typeof window === "undefined") return;
  if (USE_MOCKS) {
    (window.__kurlBehavior ??= []).push(evt);
    return;
  }
  queue.push(evt);
  if (queue.length >= FLUSH_AT_COUNT) {
    flushBehavior();
    return;
  }
  if (timer == null) {
    timer = window.setTimeout(() => flushBehavior(), FLUSH_AFTER_MS);
  }
}

/** `useBeacon` on pagehide/visibility-hidden — sendBeacon survives unload where fetch may not. */
export function flushBehavior(useBeacon = false): void {
  if (timer != null) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;
  const body = JSON.stringify({ sessionId: behaviorSessionId(), events: queue });
  queue = [];
  const url = `${API_BASE}/api/v1/public/behavior-events`;
  if (useBeacon && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    try {
      navigator.sendBeacon(url, body);
      return;
    } catch {
      // fall through to fetch
    }
  }
  fetch(url, { method: "POST", body, keepalive: true }).catch(() => {});
}
