"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { readToken } from "@/lib/api";

type LiveClick = {
  id: number;
  occurredAt: string;
  countryCode: string;
  deviceClass: string;
  channel: string;
  bot: boolean;
};

const MAX_FEED = 30;

/**
 * Subscribes to {@code /api/v1/links/{code}/stream} via EventSource and shows the most recent
 * clicks on the stats page in real time. Auto-reconnects with backoff. Closed when the component
 * unmounts.
 */
export function LiveClickFeed({ shortCode, onTick }: { shortCode: string; onTick?: () => void }) {
  const t = useTranslations("stats.live");
  const [items, setItems] = useState<LiveClick[]>([]);
  const [connected, setConnected] = useState(false);
  const seqRef = useRef(0);
  // Stash the latest onTick in a ref so the EventSource useEffect doesn't re-run (and tear down
  // the connection) every time the parent re-renders with a fresh callback identity.
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    const token = readToken();
    if (!token) return;

    let es: EventSource | null = null;
    let cancelled = false;
    let backoff = 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function open() {
      if (cancelled) return;
      // Always hit the backend host directly — Next.js rewrites buffer chunked responses in dev,
      // and in prod the SPA lives on a different origin (e.g., app.kurl.md → kurl.md). Falls back
      // to localhost:8080 only when neither env var is set.
      const base =
        process.env.NEXT_PUBLIC_API_BASE ??
        process.env.NEXT_PUBLIC_BACKEND_URL ??
        (process.env.NODE_ENV === "development" ? "http://localhost:8080" : "");
      const url = `${base}/api/v1/links/${shortCode}/stream?token=${encodeURIComponent(token!)}`;
      es = new EventSource(url);
      es.addEventListener("ready", () => setConnected(true));
      es.addEventListener("click", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data);
          const id = ++seqRef.current;
          setItems((prev) => [{ id, ...payload } as LiveClick, ...prev].slice(0, MAX_FEED));
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
  }, [shortCode]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-700">
          {t("title")}
        </h3>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span
            className={
              "inline-block h-2 w-2 rounded-full " +
              (connected ? "animate-pulse bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300")
            }
            aria-hidden
          />
          <span className={connected ? "font-medium text-emerald-700" : "text-slate-500"}>
            {connected ? t("connected") : t("connecting")}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-[12px] text-slate-500">
          {t("waiting")}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 text-[12px]">
              <span className="font-mono tabular-nums text-slate-500" suppressHydrationWarning>
                {formatTime(item.occurredAt)}
              </span>
              {item.countryCode && (
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                  {item.countryCode}
                </span>
              )}
              {item.deviceClass && (
                <span className="text-slate-600">{item.deviceClass}</span>
              )}
              {item.channel && (
                <span className="truncate text-slate-500" title={item.channel}>
                  · {item.channel}
                </span>
              )}
              {item.bot && (
                <span className="ml-auto rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700">
                  bot
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString();
  } catch {
    return iso;
  }
}
