"use client";

import { useEffect, useRef, useState } from "react";
import { readToken, request, withBase } from "@/lib/api";

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

type StreamTokenResponse = {
  streamToken: string;
};

type StreamCredential = {
  param: "claimToken" | "streamToken";
  value: string;
};

export type UseClickStreamResult = {
  items: LiveClick[];
  /** True once the backend has sent the {@code ready} event. */
  connected: boolean;
  reconnecting: boolean;
  /** Total click events received for the current link/credential (not capped by maxItems). */
  count: number;
};

const DEFAULT_MAX = 30;

/**
 * Subscribes to {@code /api/v1/links/{code}/stream} via {@link EventSource}. Anonymous landing
 * cards use their claim token; authenticated pages first exchange the access JWT for a short-lived,
 * short-code-scoped stream token so the long-lived JWT never appears in an EventSource URL.
 * Auto-reconnects with exponential backoff and closes on unmount.
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
  const [reconnecting, setReconnecting] = useState(false);
  const [count, setCount] = useState(0);
  const seqRef = useRef(0);
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    setItems([]);
    setCount(0);
    seqRef.current = 0;
  }, [shortCode, claimToken]);

  useEffect(() => {
    setConnected(false);
    setReconnecting(false);
    if (!claimToken && !readToken()) return;

    let es: EventSource | null = null;
    let cancelled = false;
    let backoff = 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function scheduleReconnect() {
      if (cancelled || timer) return;
      timer = setTimeout(() => {
        timer = null;
        backoff = Math.min(backoff * 2, 30_000);
        void open();
      }, backoff);
    }

    async function credential(): Promise<StreamCredential> {
      if (claimToken) return { param: "claimToken", value: claimToken };
      const data = await request<StreamTokenResponse>(
        `/api/v1/links/${shortCode}/stream-token`,
        { method: "POST" },
      );
      return { param: "streamToken", value: data.streamToken };
    }

    async function open() {
      if (cancelled) return;
      let auth: StreamCredential;
      try {
        auth = await credential();
      } catch {
        if (cancelled) return;
        setConnected(false);
        setReconnecting(true);
        scheduleReconnect();
        return;
      }
      if (cancelled) return;
      const url = `${withBase(`/api/v1/links/${shortCode}/stream`)}?${auth.param}=${encodeURIComponent(auth.value)}`;
      es = new EventSource(url);
      es.addEventListener("ready", () => {
        if (cancelled) return;
        backoff = 1000;
        setConnected(true);
        setReconnecting(false);
      });
      es.addEventListener("click", (event) => {
        if (cancelled) return;
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
        if (cancelled) return;
        setConnected(false);
        setReconnecting(true);
        es?.close();
        scheduleReconnect();
      };
    }

    void open();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      es?.close();
    };
  }, [shortCode, claimToken, maxItems]);

  return { items, connected, reconnecting, count };
}
