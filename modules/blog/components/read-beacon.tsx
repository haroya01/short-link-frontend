"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { recordRead } from "@/modules/blog/api/reading-history";

/**
 * Records the post in the signed-in reader's reading history (Medium-style, account-synced). Fires
 * once per mount when authenticated; anonymous readers are covered by the separate (aggregate)
 * ViewBeacon and never get a personal history. Fire-and-forget — never blocks reading.
 */
export function ReadBeacon({ postId }: { postId: number }) {
  const { ready, authenticated } = useAuth();
  useEffect(() => {
    if (!ready || !authenticated) return;
    recordRead(postId);
  }, [ready, authenticated, postId]);
  return null;
}
