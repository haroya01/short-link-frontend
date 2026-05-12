"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "kurl:profile-editor:collapsed-sections:v1";

/**
 * Per-browser memory of which TEXT-header sections the editor user has collapsed. State is a set
 * of profile_block ids — the TEXT block is the section anchor, and a presence in the set means
 * the rows immediately following it (up to the next TEXT block) should render as hidden.
 *
 * <p>localStorage-backed so the editor remembers fold state across page reloads, but intentionally
 * NOT synced to the backend — collapsed state is a per-device viewing preference (a phone with
 * less screen wants different defaults than a laptop), not a property of the profile content.
 */
export function useCollapsedSections() {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  // Hydrate from localStorage on mount. SSR-safe: window only touched inside useEffect, initial
  // render uses the empty default so server-rendered and client-rendered HTML match.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setCollapsed(new Set(parsed.filter((v): v is number => typeof v === "number")));
    } catch {
      /* corrupt JSON — start empty rather than crashing the editor */
    }
  }, []);

  const persist = useCallback((next: Set<number>) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch {
      /* quota / private mode — fold state still works for this session, won't persist */
    }
  }, []);

  const toggle = useCallback(
    (blockId: number) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(blockId)) next.delete(blockId);
        else next.add(blockId);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { collapsed, toggle };
}
