"use client";

import { useCallback, useEffect, useState } from "react";
import { searchPublicFeed, type PublicFeedItem } from "@/modules/blog/api/public-posts";

export function useLiveSearch(query: string, enabled: boolean, size: number) {
  const [results, setResults] = useState<PublicFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const q = query.trim();
    if (!enabled || !q) {
      setResults([]);
      setLoading(false);
      setFailed(false);
      return;
    }
    setLoading(true);
    let live = true;
    const id = window.setTimeout(async () => {
      const res = await searchPublicFeed(q, "recent", 0, size).catch(() => null);
      if (!live) return;
      setFailed(!res?.ok);
      setResults(res?.ok ? res.data.items.slice(0, size) : []);
      setLoading(false);
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, [query, enabled, size, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { results, loading, failed, retry };
}
