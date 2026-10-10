"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { FeedMoreMenu, type FeedMoreItem, type FeedMoreToggle } from "@/modules/blog/components/feed-more-menu";
import { FeedSortTabs, type FeedSortTab } from "@/modules/blog/components/feed-sort-tabs";
import {
  BLOG_MEMORY,
  NOTES_MEMORY,
  forgetFeedMemory,
  readFeedMemory,
  writeFeedMemory,
} from "@/modules/blog/lib/feed-memory";

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

  useEffect(() => {
    if (!ready || authenticated || readFeedMemory(memory) !== "following") return;
    forgetFeedMemory(memory);
    const explicit = new URLSearchParams(window.location.search).has(memory.param);
    if (activeKey === "following" && !explicit && fallbackHref) router.replace(fallbackHref);
  }, [ready, authenticated, memory, activeKey, fallbackHref, router]);

  return (
    <header
      data-feed-switcher={surface}
      className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800"
    >
      <FeedSortTabs
        tabs={tabs}
        onSelect={(key) => {
          if (key === "following" && !(ready && authenticated)) return;
          writeFeedMemory(memory, key);
        }}
      />
      {ready && authenticated && more && more.length > 0 && (
        <div className="shrink-0">
          <FeedMoreMenu items={more} toggles={toggles} label={t("feedMore")} />
        </div>
      )}
    </header>
  );
}
