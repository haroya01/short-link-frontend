"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { PublicPostDetail } from "@/modules/blog/api/public-posts";

const opened = new Map<number, PublicPostDetail>();
const listeners = new Set<() => void>();

export function setUnlockedPost(postId: number, detail: PublicPostDetail | null): void {
  if (detail) opened.set(postId, detail);
  else opened.delete(postId);
  listeners.forEach((listener) => listener());
}

export function useUnlockedPost(postId: number): PublicPostDetail | null {
  const subscribe = useCallback((listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => opened.get(postId) ?? null,
    () => null,
  );
}
