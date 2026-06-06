"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { BlogLink } from "@/modules/blog/components/blog-link";

export type AuthorTab = { key: string; href: string; label: string; private?: boolean };

/** Which tab the current path is on. The bar lives in the persistent layout (mounted once), so the
 *  active tab is derived from the live pathname — it updates on a client tab switch without a remount. */
function activeKeyForPath(pathname: string): string {
  const seg = pathname.replace(/\/+$/, "").split("/").pop() ?? "";
  return ["series", "about", "liked", "bookmarks"].includes(seg) ? seg : "posts";
}

// Tab horizontal padding (px-4 = 16px); the underline spans the label, inset past the padding.
const PAD = 16;
// Constant glide speed (ms per px travelled), clamped — so distance ≈ time: 글 → 소개 sweeps across
// 시리즈 and takes visibly longer than an adjacent hop. Mirrors the feed's FeedSortTabs.
const MS_PER_PX = 3;
const MIN_MS = 180;
const MAX_MS = 640;

/**
 * Author tab bar (글 · 시리즈 · 소개 · 좋아요 · 북마크) with a single underline that *glides* from the
 * previous tab to the active one on a switch — the same motion as the feed's 최신/인기/팔로잉 bar. The
 * bar is mounted once in the persistent layout (ProfileChrome), so on a client tab switch it stays put
 * and glides from its current slot to the new active tab (derived from the live pathname). First paint
 * places the underline with no glide.
 */
export function AuthorTabs({
  tabs,
  username,
}: {
  tabs: AuthorTab[];
  username: string;
}) {
  const { me } = useAuth();
  const pathname = usePathname();
  const activeKey = activeKeyForPath(pathname);
  const isOwner = me?.username === username;
  // Private tabs (좋아요 / 북마크) only on your own profile. They're appended in order, so the visible
  // index doubles as the tab-direction index for both owner and visitor.
  const visible = tabs.filter((t) => !t.private || isOwner);
  const activeIndex = Math.max(0, visible.findIndex((t) => t.key === activeKey));
  const navRef = useRef<HTMLElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  // The bar is persistent (mounted once in the layout) so it glides from wherever it currently is to
  // the new active tab on each switch — its previous on-screen slot, not a hard-nav hand-off.
  const prevLeft = useRef<number | null>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = (i: number) => {
      const el = nav.querySelectorAll<HTMLElement>("[data-tab]")[i];
      return el ? { left: el.offsetLeft + PAD, width: Math.max(el.offsetWidth - PAD * 2, 0) } : null;
    };

    const target = measure(activeIndex);
    if (!target) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Glide from where the bar currently sits to the new active tab. First placement (no prior slot)
    // and reduced-motion just snap into position.
    const from = prevLeft.current;
    prevLeft.current = target.left;
    if (from == null || from === target.left || reduce) {
      setDurationMs(0);
      setBar(target);
    } else {
      const dist = Math.abs(target.left - from);
      setDurationMs(Math.min(MAX_MS, Math.max(MIN_MS, Math.round(dist * MS_PER_PX))));
      setBar(target);
    }

    // Owner sees 5 tabs; on a narrow phone they overflow + scroll. Keep the active tab (and its
    // gliding underline) in view so the current section is never scrolled off-screen.
    const activeEl = nav.querySelectorAll<HTMLElement>("[data-tab]")[activeIndex];
    if (activeEl) {
      const right = activeEl.offsetLeft + activeEl.offsetWidth;
      if (right > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = right - nav.clientWidth;
      else if (activeEl.offsetLeft < nav.scrollLeft) nav.scrollLeft = activeEl.offsetLeft;
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
        prevLeft.current = t.left;
        setDurationMs(0);
        setBar(t);
      }
    });
    ro.observe(nav);
    return () => ro.disconnect();
    // isOwner flips the visible tab set (private tabs appear) → re-measure when it resolves.
  }, [activeIndex, isOwner]);

  return (
    <nav
      ref={navRef}
      className="relative mt-8 flex gap-1 overflow-x-auto border-b border-slate-100 text-[15px] font-medium [scrollbar-width:none] dark:border-slate-800 [&::-webkit-scrollbar]:hidden"
    >
      {visible.map((tab, i) => (
        <BlogLink
          key={tab.key}
          href={tab.href}
          data-tab
          data-active={i === activeIndex ? "true" : undefined}
          aria-current={i === activeIndex ? "page" : undefined}
          className={`focus-ring touch-target relative shrink-0 whitespace-nowrap rounded-t px-4 py-2.5 transition-colors ${
            i === activeIndex
              ? "text-slate-900 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {tab.label}
        </BlogLink>
      ))}
      {bar && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-accent-600 transition-[transform,width] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
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
