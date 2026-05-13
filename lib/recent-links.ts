"use client";

import { useEffect, useState } from "react";
import { readStorageJson, writeStorageJson } from "./storage-json";

const STORAGE_KEY = "kurl:recent-links:v1";
const MAX_ITEMS = 10;
const ANONYMOUS_TTL_MS = 24 * 60 * 60 * 1000;

export type RecentLink = {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: number;
  claimToken?: string | null;
};

function isRecentLinkArray(value: unknown): value is RecentLink[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      !!item &&
      typeof item === "object" &&
      typeof (item as RecentLink).shortCode === "string" &&
      typeof (item as RecentLink).shortUrl === "string" &&
      typeof (item as RecentLink).originalUrl === "string" &&
      typeof (item as RecentLink).createdAt === "number",
  );
}

function read(): RecentLink[] {
  const all = readStorageJson<RecentLink[]>(STORAGE_KEY, isRecentLinkArray, []);
  const now = Date.now();
  return all.filter((item) => now - item.createdAt < ANONYMOUS_TTL_MS);
}

function write(items: RecentLink[]) {
  writeStorageJson(STORAGE_KEY, items);
}

export function recordRecent(link: RecentLink) {
  if (typeof window === "undefined") return;
  const current = read();
  const next = [link, ...current.filter((c) => c.shortCode !== link.shortCode)].slice(0, MAX_ITEMS);
  write(next);
  window.dispatchEvent(new CustomEvent("kurl:recent-changed"));
}

export function readPendingClaimTokens(): string[] {
  return read()
    .map((r) => r.claimToken)
    .filter((t): t is string => typeof t === "string" && t.length > 0);
}

export function clearClaimTokens(claimedTokens: Iterable<string>) {
  const claimedSet = new Set(claimedTokens);
  if (claimedSet.size === 0) return;
  const current = read();
  const next = current.map((item) =>
    item.claimToken && claimedSet.has(item.claimToken) ? { ...item, claimToken: null } : item,
  );
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
