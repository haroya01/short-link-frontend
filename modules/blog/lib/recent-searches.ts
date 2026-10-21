"use client";

import { useEffect, useState } from "react";
import { readStorageJson, removeStorageItem, writeStorageJson } from "@/lib/storage-json";

const KEY = "kurl:recent-searches:v1";
export const RECENT_SEARCHES_MAX = 8;

const isList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((q) => typeof q === "string");

export function readRecentSearches(): string[] {
  return readStorageJson(KEY, isList, [])
    .filter((q) => q.trim() !== "")
    .slice(0, RECENT_SEARCHES_MAX);
}

export function rememberSearch(query: string) {
  const q = query.trim();
  if (!q) return;
  writeStorageJson(KEY, [q, ...readRecentSearches().filter((seen) => seen !== q)].slice(0, RECENT_SEARCHES_MAX));
}

export function forgetSearch(query: string): string[] {
  const next = readRecentSearches().filter((seen) => seen !== query);
  writeStorageJson(KEY, next);
  return next;
}

export function useRecentSearches() {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => setList(readRecentSearches()), []);
  return {
    list,
    clear: () => {
      removeStorageItem(KEY);
      setList([]);
    },
    forget: (query: string) => setList(forgetSearch(query)),
  };
}
