"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { readNavPrev } from "@/modules/blog/lib/author-tab-direction";

export type AuthorTab = { key: string; href: string; label: string; private?: boolean };

// Tab horizontal padding (px-4 = 16px); the underline spans the label, inset past the padding.
const PAD = 16;
// Constant glide speed (ms per px travelled), clamped — so distance ≈ time: 글 → 소개 sweeps across
// 시리즈 and takes visibly longer than an adjacent hop. Mirrors the feed's FeedSortTabs.
const MS_PER_PX = 3;
const MIN_MS = 180;
const MAX_MS = 640;

/**
 * Author tab bar (글 · 시리즈 · 소개) with a single underline that *glides* from the previous tab to the
 * active one on a switch — the same motion as the feed's 최신/인기/팔로잉 bar, so the two surfaces feel
 * like one product. The author surface hard-navigates (subdomain model), so unlike FeedSortTabs the bar
 * can't simply stay mounted and transition; instead it seeds the underline at the previous tab's
 * position (recovered via author-tab-direction) and glides to the active one on mount. First visit / a
 * same-tab refresh just places the underline with no glide.
 */
export function AuthorTabs({
  tabs,
  activeKey,
  username,
}: {
  tabs: AuthorTab[];
  activeKey: string;
  username: string;
}) {
  const { me } = useAuth();
  const isOwner = me?.username === username;
  // Private tabs (좋아요 / 북마크) only on your own profile. They're appended in order, so the visible
  // index doubles as the tab-direction index for both owner and visitor.
  const visible = tabs.filter((t) => !t.private || isOwner);
  const activeIndex = Math.max(0, visible.findIndex((t) => t.key === activeKey));
  const navRef = useRef<HTMLElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  const [durationMs, setDurationMs] = useState(0);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = (i: number) => {
      const el = nav.querySelectorAll<HTMLElement>("[data-tab]")[i];
      return el ? { left: el.offsetLeft + PAD, width: Math.max(el.offsetWidth - PAD * 2, 0) } : null;
    };

    const target = measure(activeIndex);
    if (!target) return;

    const prev = readNavPrev();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    if (prev == null || prev === activeIndex || reduce) {
      // First visit / same-tab refresh / reduced motion → place it, no glide.
      setDurationMs(0);
      setBar(target);
    } else {
      // Seed at the previous tab's slot (no transition), then glide to the active one next frame.
      const start = measure(prev) ?? target;
      setDurationMs(0);
      setBar(start);
      raf = requestAnimationFrame(() =>
        (raf = requestAnimationFrame(() => {
          const dist = Math.abs(target.left - start.left);
          setDurationMs(Math.min(MAX_MS, Math.max(MIN_MS, Math.round(dist * MS_PER_PX))));
          setBar(target);
        })),
      );
    }

    // Genuine layout changes (window resize / late font load shifting label widths) → reposition
    // instantly, no glide. Skip the observer's initial fire so it doesn't clobber the glide above.
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      const t = measure(activeIndex);
      if (t) {
        setDurationMs(0);
        setBar(t);
      }
    });
    ro.observe(nav);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // isOwner flips the visible tab set (private tabs appear) → re-measure when it resolves.
  }, [activeIndex, isOwner]);

  return (
    <nav
      ref={navRef}
      className="relative mt-8 flex gap-1 border-b border-slate-200 text-[15px] font-medium dark:border-slate-800"
    >
      {visible.map((tab, i) => (
        <a
          key={tab.key}
          href={tab.href}
          data-tab
          data-active={i === activeIndex ? "true" : undefined}
          aria-current={i === activeIndex ? "page" : undefined}
          className={`focus-ring relative rounded-t px-4 py-2.5 transition-colors ${
            i === activeIndex
              ? "text-slate-900 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {tab.label}
        </a>
      ))}
      {bar && (
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-px left-0 h-0.5 rounded-full bg-accent-600 transition-[transform,width] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
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
