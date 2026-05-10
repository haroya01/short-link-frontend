"use client";

import { useEffect, useState } from "react";

export type TabKey = "overview" | "traffic" | "sources" | "audience" | "settings";

const VALID: ReadonlyArray<TabKey> = ["overview", "traffic", "sources", "audience", "settings"];

function readHash(): TabKey {
  if (typeof window === "undefined") return "overview";
  const h = window.location.hash.replace("#", "") as TabKey;
  return VALID.includes(h) ? h : "overview";
}

/**
 * Tab state synced to {@code window.location.hash}. Refresh / share preserves the active tab,
 * and back / forward updates it via the {@code hashchange} event. Returns a setter that writes
 * the hash via {@code replaceState} so the back stack doesn't grow on every tab click.
 */
export function useTabHash(): [TabKey, (next: TabKey) => void] {
  const [tab, setTab] = useState<TabKey>(() => readHash());
  useEffect(() => {
    const onHash = () => setTab(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [
    tab,
    (next: TabKey) => {
      setTab(next);
      if (typeof window !== "undefined") {
        history.replaceState(null, "", `#${next}`);
      }
    },
  ];
}
