"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "kurl:recent-links:v1";
const MAX_ITEMS = 10;
const ANONYMOUS_TTL_MS = 24 * 60 * 60 * 1000;

export type RecentLink = {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: number;
};

function read(): RecentLink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentLink[];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((item) => now - item.createdAt < ANONYMOUS_TTL_MS);
  } catch {
    return [];
  }
}

function write(items: RecentLink[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore storage errors */
  }
}

export function recordRecent(link: RecentLink) {
  if (typeof window === "undefined") return;
  const current = read();
  const next = [link, ...current.filter((c) => c.shortCode !== link.shortCode)].slice(0, MAX_ITEMS);
  write(next);
  window.dispatchEvent(new CustomEvent("kurl:recent-changed"));
}

export function useRecentLinks(): RecentLink[] {
  const [items, setItems] = useState<RecentLink[]>([]);
  useEffect(() => {
    setItems(read());
    const onChange = () => setItems(read());
    window.addEventListener("kurl:recent-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("kurl:recent-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return items;
}
