"use client";

import { useEffect } from "react";
import {
  flushBehavior,
  trackBehavior,
  type BehaviorTargetType,
} from "@/lib/analytics/behavior";

const TARGET_TYPES: readonly string[] = ["post", "connection", "profile", "series", "tag"];

/**
 * Mounted once (AppProviders). Second-action clicks are collected by delegation: any element
 * carrying `data-bhv="<target type>"` (+ optional `data-bhv-id`) reports on click, so server
 * components annotate links with data attributes instead of becoming client components. The post
 * context comes from the article's `data-bhv-post` — absent on non-post surfaces, which is fine
 * (the funnel joins on session, not page). Also owns the leave-time flush: pagehide/hidden is the
 * only reliable moment to drain the queue on mobile.
 */
export function BehaviorTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-bhv]");
      if (!el) return;
      const targetType = el.getAttribute("data-bhv");
      if (!targetType || !TARGET_TYPES.includes(targetType)) return;
      const post = document.querySelector("article[data-bhv-post]")?.getAttribute("data-bhv-post");
      trackBehavior({
        name: "second_action",
        targetType: targetType as BehaviorTargetType,
        targetId: el.getAttribute("data-bhv-id") ?? undefined,
        postId: post ? Number(post) : undefined,
      });
    };
    const onPageHide = () => flushBehavior(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushBehavior(true);
    };
    // capture phase — soft navigation unmounts the link before bubble listeners run reliably.
    document.addEventListener("click", onClick, true);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return null;
}
