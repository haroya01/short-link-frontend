"use client";

import { useCallback, useEffect, useState } from "react";
import { readStorageJson, writeStorageJson } from "@/lib/storage-json";

const STORAGE_KEY = "kurl:profile-editor:collapsed-sections:v1";

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((v) => typeof v === "number");
}

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

  // Hydrate from localStorage on mount. SSR-safe: storage access lives inside useEffect, initial
  // render uses the empty default so server-rendered and client-rendered HTML match.
  useEffect(() => {
    const arr = readStorageJson<number[]>(STORAGE_KEY, isNumberArray, []);
    if (arr.length > 0) setCollapsed(new Set(arr));
  }, []);

  const persist = useCallback((next: Set<number>) => {
    writeStorageJson(STORAGE_KEY, Array.from(next));
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
