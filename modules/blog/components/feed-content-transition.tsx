"use client";

import { useState, type ReactNode } from "react";

/**
 * Direction-aware crossfade-slide for the feed content as you switch tabs (최신 0 · 인기 1 · 팔로잉 2).
 * It remembers the previous tab index across soft navigations (the component instance is preserved —
 * only the inner `key`ed block remounts), so it can enter from the right when moving to a tab on the
 * right and from the left when moving back — reads as paging across rather than always one direction.
 *
 * The children are server-rendered (passed in from the server page); this only positions them and
 * picks the animation class.
 */
export function FeedContentTransition({
  index,
  contentKey,
  children,
}: {
  /** Active tab index — recent 0, trending 1, following 2. */
  index: number;
  /** Remount key (tab + search query) — changing it replays the slide. */
  contentKey: string;
  children: ReactNode;
}) {
  // React's "store previous value" pattern — adjust state during render (StrictMode-safe; mutating a
  // ref during render double-fires and loses the direction). When the tab index changes we record
  // whether it moved back (to a lower index) and remember the new index.
  const [prevIndex, setPrevIndex] = useState(index);
  const [back, setBack] = useState(false);
  if (index !== prevIndex) {
    setBack(index < prevIndex);
    setPrevIndex(index);
  }

  return (
    <div key={contentKey} className={back ? "content-slide-back" : "content-slide-fwd"}>
      {children}
    </div>
  );
}
