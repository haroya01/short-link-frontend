"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Direction-aware crossfade-slide for the feed content as you switch tabs (최신 0 · 인기 1 · 팔로잉 2):
 * enter from the right when moving to a tab on the right, from the left when moving back — reads as
 * paging across rather than always one direction.
 *
 * The previous index is held at module scope (not per-instance state) because the page renders TWO
 * separate instances — recent/trending share one (inside the fixed ReadingShell) and following is its
 * own — and a tab switch unmounts one, mounts the other. A per-instance ref/state would reset on that
 * remount and lose the direction (every following → elsewhere move looked like "forward"). It's read
 * during render for the slide class and written in an effect (commit phase) so render stays pure /
 * StrictMode-safe. The children are server-rendered; this only positions them and picks the class.
 */
let committedIndex: number | null = null;

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
  const back = committedIndex !== null && index < committedIndex;

  useEffect(() => {
    committedIndex = index;
  }, [index]);

  return (
    <div key={contentKey} className={back ? "content-slide-back" : "content-slide-fwd"}>
      {children}
    </div>
  );
}
