"use client";

import { useEffect, useRef, useState } from "react";
import { readToken } from "@/lib/api";

export type LiveClick = {
  id: number;
  occurredAt: string;
  countryCode: string;
  deviceClass: string;
  channel: string;
  bot: boolean;
};

type UseClickStreamOptions = {
  /**
   * Anonymous claim token handed back when the link was created without a session. Required for the
   * landing-page result card path — the matching backend channel accepts {@code ?claimToken=...}
   * when no JWT is present. When omitted, the hook falls back to the JWT stored by {@link readToken}
   * (logged-in dashboard/stats surfaces). When neither is available the hook stays idle so it never
   * fires a 401 storm.
   */
  claimToken?: string | null;
  /** Cap retained in memory; older clicks fall off as new ones arrive. */
  maxItems?: number;
  /** Fired on each click event so callers can drive counters / scroll cues. */
  onTick?: () => void;
};

export type UseClickStreamResult = {
  items: LiveClick[];
  /** True once the backend has sent the {@code ready} event. */
  connected: boolean;
  /** Total click events received across the lifetime of this hook (not capped by maxItems). */
  count: number;
};

const DEFAULT_MAX = 30;

/**
 * Subscribes to {@code /api/v1/links/{code}/stream} via {@link EventSource}. Auth uses the claim
 * token when provided (anonymous links on the landing result card) or falls back to the access JWT
 * (authenticated dashboard / stats). Auto-reconnects with exponential backoff and closes on unmount.
 *
 * <p>The {@code onTick} callback is read from a ref so the EventSource isn't torn down on every
 * parent re-render that hands in a fresh closure identity.
 */
export function useClickStream(
  shortCode: string,
  opts: UseClickStreamOptions = {},
): UseClickStreamResult {
  const { claimToken = null, maxItems = DEFAULT_MAX, onTick } = opts;

  const [items, setItems] = useState<LiveClick[]>([]);
  const [connected, setConnected] = useState(false);
  const [count, setCount] = useState(0);
  const seqRef = useRef(0);
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    const token = claimToken ?? readToken();
    if (!token) return;

    let es: EventSource | null = null;
    let cancelled = false;
    let backoff = 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function open() {
      if (cancelled) return;
      const base =
        process.env.NEXT_PUBLIC_API_BASE ??
        process.env.NEXT_PUBLIC_BACKEND_URL ??
        (process.env.NODE_ENV === "development" ? "http://localhost:8080" : "");
      const param = claimToken ? "claimToken" : "token";
      const url = `${base}/api/v1/links/${shortCode}/stream?${param}=${encodeURIComponent(token!)}`;
      es = new EventSource(url);
      es.addEventListener("ready", () => setConnected(true));
      es.addEventListener("click", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data);
          const id = ++seqRef.current;
          setItems((prev) => [{ id, ...payload } as LiveClick, ...prev].slice(0, maxItems));
          setCount((c) => c + 1);
          onTickRef.current?.();
        } catch {
          // ignore malformed payloads
        }
      });
      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (cancelled) return;
        timer = setTimeout(() => {
          backoff = Math.min(backoff * 2, 30_000);
          open();
        }, backoff);
      };
    }

    open();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      es?.close();
    };
  }, [shortCode, claimToken, maxItems]);

  return { items, connected, count };
}
