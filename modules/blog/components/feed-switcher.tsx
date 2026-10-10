"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { FeedMoreMenu, type FeedMoreItem, type FeedMoreToggle } from "@/modules/blog/components/feed-more-menu";
import { FeedSortTabs, PAD, glideMs, type FeedSortTab } from "@/modules/blog/components/feed-sort-tabs";
import {
  BLOG_MEMORY,
  NOTES_MEMORY,
  forgetFeedMemory,
  readFeedMemory,
  writeFeedMemory,
} from "@/modules/blog/lib/feed-memory";

type Bar = { left: number; width: number; ms: number };

function useSwitcherBar() {
  const ref = useRef<HTMLElement>(null);
  const [bar, setBar] = useState<Bar | null>(null);

  useLayoutEffect(() => {
    const header = ref.current;
    if (!header) return;
    const measure = (glide: boolean) => {
      const el = header.querySelector<HTMLElement>('[data-active="true"]');
      if (!el) return setBar(null);
      const box = header.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      const clip = el.closest("nav")?.getBoundingClientRect();
      const start = Math.max(rect.left + PAD, clip?.left ?? -Infinity) - box.left;
      const end = Math.min(rect.right - PAD, clip?.right ?? Infinity) - box.left;
      if (end <= start) return setBar(null);
      setBar((prev) => ({ left: start, width: end - start, ms: glide && prev ? glideMs(Math.abs(start - prev.left)) : 0 }));
    };
    measure(false);
    const moved = new MutationObserver(() => measure(true));
    moved.observe(header, { subtree: true, attributes: true, attributeFilter: ["data-active"], childList: true });
    const resized = new ResizeObserver(() => measure(false));
    resized.observe(header);
    const nav = header.querySelector("nav");
    if (nav) resized.observe(nav);
    const scrolled = () => measure(false);
    header.addEventListener("scroll", scrolled, true);
    return () => {
      moved.disconnect();
      resized.disconnect();
      header.removeEventListener("scroll", scrolled, true);
    };
  }, []);

  return { ref, bar };
}

/** A signed-out visitor never keeps 팔로잉 — the bare URL must open on 최신 for them. */
export function FeedSwitcher({
  surface,
  tabs,
  more,
  toggles,
}: {
  surface: "blog" | "notes";
  tabs: FeedSortTab[];
  more?: FeedMoreItem[];
  toggles?: FeedMoreToggle[];
}) {
  const t = useTranslations("notes");
  const router = useRouter();
  const { ready, authenticated } = useAuth();
  const memory = surface === "blog" ? BLOG_MEMORY : NOTES_MEMORY;
  const activeKey = tabs.find((tab) => tab.active)?.key;
  const fallbackHref = tabs.find((tab) => tab.key === memory.fallback)?.href;
  const openMore = more?.find((item) => item.active)?.key ?? null;
  const { ref, bar } = useSwitcherBar();
  const [pendingMore, setPendingMore] = useState<string | null>(null);
  const [tabPicked, setTabPicked] = useState(false);

  useEffect(() => {
    if (!ready || authenticated || readFeedMemory(memory) !== "following") return;
    forgetFeedMemory(memory);
    const explicit = new URLSearchParams(window.location.search).has(memory.param);
    if (activeKey === "following" && !explicit && fallbackHref) router.replace(fallbackHref);
  }, [ready, authenticated, memory, activeKey, fallbackHref, router]);

  useEffect(() => {
    setPendingMore(null);
    setTabPicked(false);
  }, [activeKey, openMore]);

  const showMore = ready && authenticated && more && more.length > 0;

  return (
    <header
      ref={ref}
      data-feed-switcher={surface}
      className="relative flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800"
    >
      <FeedSortTabs
        tabs={tabs}
        underline={false}
        idle={pendingMore !== null}
        onSelect={(key) => {
          setTabPicked(true);
          setPendingMore(null);
          if (key === "following" && !(ready && authenticated)) return;
          writeFeedMemory(memory, key);
        }}
      />
      {showMore && (
        <div className="shrink-0">
          <FeedMoreMenu
            items={more}
            toggles={toggles}
            label={t("feedMore")}
            activeKey={tabPicked ? null : (pendingMore ?? openMore)}
            onPick={(item) => {
              setTabPicked(false);
              setPendingMore(item.key);
              const url = new URL(item.href, window.location.href);
              router.push(url.pathname + url.search + url.hash);
            }}
          />
        </div>
      )}
      {bar && (
        <span
          aria-hidden
          data-switcher-bar
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-slate-900 transition-[transform,width] ease-[var(--ease)] motion-reduce:transition-none dark:bg-slate-100"
          style={{ transform: `translateX(${bar.left}px)`, width: `${bar.width}px`, transitionDuration: `${bar.ms}ms` }}
        />
      )}
    </header>
  );
}
