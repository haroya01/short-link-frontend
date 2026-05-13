"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { useRafThrottledListener } from "./use-raf-throttled-listener";

type Behavior = "center" | "start";

type Options = {
  /** Number of items the carousel iterates over. Used to clamp the resolved active index. */
  itemCount: number;
  /**
   * Which edge of the snapped child aligns to the container — {@code "center"} for "one centered
   * card, two halves peeking" (ProductCardEntry's old peek mode) and {@code "start"} for full-
   * width pagination (GalleryEntry, ProductCardEntry's new paginated mode).
   */
  behavior?: Behavior;
};

type CarouselApi = {
  /** Attach to the scroller (the {@code overflow-x-auto} container holding the snap children). */
  scrollerRef: RefObject<HTMLDivElement>;
  /** Index of the currently-snapped item, computed from the scroll position. */
  activeIdx: number;
  /** Smoothly scroll the carousel so item {@code idx} becomes active. */
  scrollToIdx: (idx: number) => void;
};

/**
 * Shared horizontal-snap carousel logic for any block that renders a row of children with
 * scroll-snap + page dots: GalleryEntry's image roll, ProductCardEntry's product roll. Both
 * carousels used to keep their own scroller ref + rAF-throttled scroll listener + offsetLeft
 * math — small but identical, and bug-fixes (e.g. the previous-edition center vs start
 * distinction) had to be applied twice.
 *
 * <p>The hook owns:
 * <ul>
 *   <li>A ref to attach to the scrolling element (caller writes the {@code overflow-x-auto} +
 *       snap classes themselves).</li>
 *   <li>The {@code activeIdx} derived from the snapped child position — re-measured on each
 *       scroll tick (rAF-throttled) and on viewport resize.</li>
 *   <li>A {@code scrollToIdx} helper that handles both alignment behaviors.</li>
 * </ul>
 *
 * <p>Children must be {@code [data-card]} elements (matches existing convention from
 * ProductCardEntry — letting the hook target them by selector regardless of how the caller
 * wraps each item).
 */
export function useCardCarousel({ itemCount, behavior = "start" }: Options): CarouselApi {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useRafThrottledListener(
    () => scrollerRef.current,
    () => {
      const el = scrollerRef.current;
      if (!el) return;
      if (behavior === "start") {
        const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        setActiveIdx(Math.max(0, Math.min(itemCount - 1, idx)));
        return;
      }
      // "center" — pick the child whose middle is closest to the container middle. Handles
      // variable-width children + last-card snapping to start instead of center.
      const containerRect = el.getBoundingClientRect();
      const containerMid = containerRect.left + containerRect.width / 2;
      const children = Array.from(el.querySelectorAll<HTMLElement>("[data-card]"));
      let best = 0;
      let bestDist = Infinity;
      children.forEach((child, idx) => {
        const r = child.getBoundingClientRect();
        const mid = r.left + r.width / 2;
        const d = Math.abs(mid - containerMid);
        if (d < bestDist) {
          bestDist = d;
          best = idx;
        }
      });
      setActiveIdx(best);
    },
    [itemCount, behavior],
  );

  const scrollToIdx = useCallback(
    (idx: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const child =
        behavior === "center"
          ? el.querySelectorAll<HTMLElement>("[data-card]")[idx]
          : (el.children[idx] as HTMLElement | undefined);
      if (!child) return;
      const left =
        behavior === "center"
          ? child.offsetLeft - (el.clientWidth - child.clientWidth) / 2
          : child.offsetLeft;
      el.scrollTo({ left, behavior: "smooth" });
    },
    [behavior],
  );

  return { scrollerRef, activeIdx, scrollToIdx };
}
