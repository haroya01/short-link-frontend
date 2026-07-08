"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";

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
// Capped at the move tier's ceiling (§10.7) — a two-tab jump still sweeps, just not slowly.
const MAX_MS = 320;

/**
 * Feed-home sort tabs (최신 · 인기 · 팔로잉) with a single underline that *slides* between tabs — it
 * translates + resizes from the old tab to the new one (matching the content's left/right slide),
 * instead of each tab growing its own underline in place. Travel time scales with distance, so
 * jumping two tabs sweeps across the one between. The active position is measured client-side (labels
 * are any width); soft-nav keeps this mounted, so the bar transitions rather than jumps.
 */
export function FeedSortTabs({ tabs }: { tabs: FeedSortTab[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // 클릭 즉시 반응: 서버가 새 active 를 SSR 로 돌려주기 전까지 눌린 탭을 활성으로 그려 밑줄을 선이동시킨다
  // (없으면 payload 도착까지 밑줄·색이 그대로여서 클릭이 씹힌 것처럼 보이고 더블 클릭을 부른다).
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  const [durationMs, setDurationMs] = useState(300);

  // The tab drawn as active — the optimistic pending tab while its route loads, else the
  // server-resolved one.
  const activeKey = pendingKey ?? tabs.find((t) => t.active)?.key ?? null;

  // Re-measure whenever the active tab (or its label, on locale change) changes — including the
  // optimistic pending tab, so the underline glides on click, not only when the payload arrives.
  const sig = tabs.map((t) => `${t.label}:${t.key === activeKey ? 1 : 0}`).join("|");

  // Transition settled (new RSC committed) → the server `active` now reflects the tab, so drop the
  // optimism; the freshly-committed prop keeps the same tab highlighted with no re-glide.
  useEffect(() => {
    if (!isPending) setPendingKey(null);
  }, [isPending]);

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
    // min-w-0 lets the nav shrink inside the masthead's flex row so its own overflow-x-auto kicks in
    // (a swipeable strip) instead of pushing the right-side control off-screen; pb-3.5/-mb-3.5 carves
    // room for the sliding underline (which overflow-x-auto would otherwise clip) without growing the row.
    // 영문·와이드 로케일에서 "For You"/"Following" 이 좁은 폰에서 한 탭 안에 줄바꿈되던 걸 막는다.
    <nav
      ref={navRef}
      aria-busy={isPending}
      className="relative flex min-w-0 gap-1 overflow-x-auto pb-3.5 -mb-3.5 text-[15px] font-bold [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((t) =>
        t.disabled ? (
          <span
            key={t.key}
            aria-disabled
            aria-current={t.active ? "page" : undefined}
            className="relative cursor-default whitespace-nowrap px-2.5 py-1.5 text-slate-300"
          >
            {t.label}
          </span>
        ) : (
          <Link
            key={t.key}
            href={t.href}
            data-active={t.key === activeKey ? "true" : undefined}
            aria-current={t.key === activeKey ? "page" : undefined}
            onClick={(e) => {
              // Modifier / middle clicks keep native anchor behaviour (new tab / window).
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              // Resolve the relative ?sort= href against the current URL before pushing — mirrors
              // BlogChromeLink. Wrapped in a transition so isPending flags the pending nav.
              const url = new URL(t.href, window.location.href);
              setPendingKey(t.key);
              startTransition(() => router.push(url.pathname + url.search + url.hash));
            }}
            className={`focus-ring touch-target relative whitespace-nowrap rounded px-2.5 py-1.5 transition-colors ${
              t.key === activeKey
                ? "text-accent-700 dark:text-accent-400"
                : // slate-500: slate-400 on white was 2.6:1 — under the 4.5:1 AA bar at this
                  // size. One shade down passes (4.8:1) and the active accent still dominates.
                  // Dark mirror bumped 500→400 for the same reason.
                  "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            {t.label}
          </Link>
        ),
      )}
      {bar && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0.5 left-0 h-0.5 rounded-full bg-accent-600 transition-[transform,width] ease-[var(--ease)] motion-reduce:transition-none"
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
