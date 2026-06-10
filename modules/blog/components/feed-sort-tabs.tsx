"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

export type FeedSortTab = {
  key: string;
  label: string;
  href: string;
  active: boolean;
  /** Non-interactive (e.g. "팔로잉" while a search is active). */
  disabled?: boolean;
};

// Tab horizontal padding (px-2.5 = 10px); the underline spans the label, inset past the padding.
const PAD = 10;
// Constant glide speed (ms per px travelled), clamped — so distance ≈ time: a far jump (최신 → 팔로잉)
// takes visibly longer and sweeps across the middle tab, while an adjacent hop stays quick.
const MS_PER_PX = 3;
const MIN_MS = 180;
const MAX_MS = 640;

/**
 * Feed-home sort tabs (최신 · 인기 · 팔로잉) with a single underline that *slides* between tabs — it
 * translates + resizes from the old tab to the new one (matching the content's left/right slide),
 * instead of each tab growing its own underline in place. Travel time scales with distance, so
 * jumping two tabs sweeps across the one between. The active position is measured client-side (labels
 * are any width); soft-nav keeps this mounted, so the bar transitions rather than jumps.
 */
export function FeedSortTabs({ tabs }: { tabs: FeedSortTab[] }) {
  const navRef = useRef<HTMLElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  const [durationMs, setDurationMs] = useState(300);

  // Re-measure whenever the active tab (or its label, on locale change) changes.
  const sig = tabs.map((t) => `${t.label}:${t.active ? 1 : 0}`).join("|");

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const target = () => {
      const el = nav.querySelector<HTMLElement>('[data-active="true"]');
      return el ? { left: el.offsetLeft + PAD, width: Math.max(el.offsetWidth - PAD * 2, 0) } : null;
    };

    // Active tab changed → glide to it, with travel time scaled by distance.
    const next = target();
    if (next) {
      setBar((prev) => {
        const dist = prev ? Math.abs(next.left - prev.left) : 0;
        setDurationMs(prev ? Math.min(MAX_MS, Math.max(MIN_MS, Math.round(dist * MS_PER_PX))) : 0);
        return next;
      });
    }

    // Genuine layout changes (window resize / font load) → reposition instantly, no glide. Skip the
    // ResizeObserver's initial fire, which would otherwise overwrite the glide above with a 0-distance.
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      const t = target();
      if (t) {
        setDurationMs(0);
        setBar(t);
      }
    });
    ro.observe(nav);
    return () => ro.disconnect();
  }, [sig]);

  return (
    <nav ref={navRef} className="relative flex gap-1 text-[15px] font-bold">
      {tabs.map((t) =>
        t.disabled ? (
          <span
            key={t.key}
            aria-disabled
            aria-current={t.active ? "page" : undefined}
            className="relative cursor-default px-2.5 py-1.5 text-slate-300"
          >
            {t.label}
          </span>
        ) : (
          <Link
            key={t.key}
            href={t.href}
            data-active={t.active ? "true" : undefined}
            aria-current={t.active ? "page" : undefined}
            className={`focus-ring touch-target relative rounded px-2.5 py-1.5 transition-colors ${
              t.active
                ? "text-accent-700 dark:text-accent-400"
                : "text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
            }`}
          >
            {t.label}
          </Link>
        ),
      )}
      {bar && (
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-[13px] left-0 h-0.5 rounded-full bg-accent-600 transition-[transform,width] ease-[var(--ease)] motion-reduce:transition-none"
          style={{
            transform: `translateX(${bar.left}px)`,
            width: `${bar.width}px`,
            transitionDuration: `${durationMs}ms`,
          }}
        />
      )}
    </nav>
  );
}
