"use client";

import { useEffect } from "react";
import { flushBehavior, trackBehavior } from "@/lib/analytics/behavior";

const MILESTONES = [25, 50, 75, 100] as const;

/**
 * Reading-depth + dwell beacon for the post page (mounted beside ViewBeacon). Depth: how far the
 * `.prose-post` body has entered the viewport — each milestone fires once per mount, and a short
 * post that fits the first viewport legitimately fires them all on load. Dwell: visible time only
 * (visibilitychange-gated) so a background tab never reads as "read for an hour"; sent as a delta
 * on every hide, so partial dwells sum per session server-side instead of needing an unload-time
 * grand total that mobile browsers won't guarantee.
 */
export function ReadProgressBeacon({ postId }: { postId: number }) {
  useEffect(() => {
    const article = document.querySelector<HTMLElement>(".prose-post");
    if (!article) return;

    const fired = new Set<number>();
    let raf = 0;
    const measure = () => {
      raf = 0;
      const rect = article.getBoundingClientRect();
      const total = rect.height || 1;
      const seen = Math.min(total, Math.max(0, window.innerHeight - rect.top));
      const pct = (seen / total) * 100;
      for (const m of MILESTONES) {
        if (pct >= m && !fired.has(m)) {
          fired.add(m);
          trackBehavior({ name: "read_progress", postId, depthPct: m });
        }
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    let visibleSince: number | null =
      document.visibilityState === "visible" ? performance.now() : null;
    const sendDwellDelta = () => {
      if (visibleSince == null) return;
      const delta = performance.now() - visibleSince;
      visibleSince = null;
      if (delta >= 1_000) {
        trackBehavior({ name: "read_progress", postId, dwellMs: Math.round(delta) });
      }
      flushBehavior(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendDwellDelta();
      else if (visibleSince == null) visibleSince = performance.now();
    };
    const onPageHide = () => sendDwellDelta();

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      // soft-nav away counts like a hide — bank the visible time before the next page's beacon mounts.
      sendDwellDelta();
    };
  }, [postId]);
  return null;
}
