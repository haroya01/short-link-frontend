"use client";

import { useEffect } from "react";
import { postProfileVisit } from "@/lib/api";

/**
 * Fires a single visit beacon to the backend on mount. Owner-side stats dashboard reads these
 * rows as the profile's visit history (same enrichment as click_event: device / country / UTM
 * / referrer / source channel). Fire-and-forget — never blocks paint, errors are silently
 * dropped because the page render is what actually matters for the visitor.
 */
export function ProfileVisitBeacon({ username }: { username: string }) {
  useEffect(() => {
    postProfileVisit(username);
  }, [username]);
  return null;
}
