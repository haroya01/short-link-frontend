"use client";

import { useCallback, useEffect, useRef } from "react";

export function usePacedRefresh(refresh: () => void, lastFetchedAt: number, minIntervalMs: number) {
  const refreshRef = useRef(refresh);
  const lastRef = useRef(lastFetchedAt);
  const stale = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);
  useEffect(() => {
    lastRef.current = lastFetchedAt;
  }, [lastFetchedAt]);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const run = useCallback(() => {
    clear();
    if (!stale.current || document.visibilityState !== "visible") return;
    const wait = lastRef.current + minIntervalMs - Date.now();
    if (wait > 0) {
      timer.current = setTimeout(run, wait);
      return;
    }
    stale.current = false;
    refreshRef.current();
  }, [minIntervalMs]);

  useEffect(() => {
    const onVisibility = () => (document.visibilityState === "visible" ? run() : clear());
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clear();
    };
  }, [run]);

  return useCallback(() => {
    stale.current = true;
    if (!timer.current) run();
  }, [run]);
}
