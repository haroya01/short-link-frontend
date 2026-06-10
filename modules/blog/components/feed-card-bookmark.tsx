"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { useBookmarks } from "@/modules/blog/lib/use-bookmarks";

/**
 * Save-to-reading-list toggle that lives in the top-right of a feed card, so a post can be saved
 * without opening it. Quiet by default: hidden until the row is hovered/focused (revealed always on
 * touch, where there's no hover, and whenever the post is already saved so its state stays visible).
 * Reads/writes the shared {@link useBookmarks} store, so it's one network call for the whole feed and
 * every card for the same post stays in sync. Anonymous click starts the login flow.
 *
 * Rendered as a sibling of the card's post links (never nested inside an `<a>`), and stops propagation
 * so clicking it never also triggers the row's navigation.
 */
export function FeedCardBookmark({
  postId,
  username,
  slug,
}: {
  postId: number;
  username: string;
  slug: string;
}) {
  const t = useTranslations("publicFeed");
  const { isSaved, toggle } = useBookmarks();
  const saved = isSaved(username, slug);
  // Pop only on click (not when the store hydrates the saved state) — same gate as the follow/구독 button.
  const [interacted, setInteracted] = useState(false);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setInteracted(true);
        void toggle(postId, username, slug);
      }}
      aria-pressed={saved}
      aria-label={saved ? t("bookmarkOn") : t("bookmark")}
      title={saved ? t("bookmarkOn") : t("bookmark")}
      // A faint translucent chip keeps the icon legible when the card has a thumbnail and the button
      // sits over it; over plain text rows the chip is all but invisible on the card background.
      // Reveal 은 300ms --ease 페이드 + 0.9→1 스케일의 잔잔한 떠오름 — transition-all 기본 150ms 는
      // 흰 칩이 hover 순간 탁 켜져 난폭하게 읽혔다.
      className={`grid h-8 w-8 place-items-center rounded-lg bg-white/70 text-slate-600 shadow-sm ring-1 ring-white/50 backdrop-blur-md transition-[opacity,transform,background-color,color] duration-300 ease-[var(--ease)] hover:bg-accent-50 hover:text-accent-700 focus-ring motion-reduce:transform-none dark:bg-slate-900/55 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-accent-500/15 dark:hover:text-accent-300 ${
        saved
          ? "scale-100 text-accent-600 opacity-100 dark:text-accent-400"
          : "scale-90 opacity-0 focus-visible:scale-100 focus-visible:opacity-100 group-hover:scale-100 group-hover:opacity-100 [@media(hover:none)]:scale-100 [@media(hover:none)]:opacity-100"
      }`}
    >
      {/* Keyed by state so it remounts + replays the pop on each toggle (only after a click). */}
      <span key={saved ? "on" : "off"} className={`inline-flex ${interacted ? "subscribe-pop" : ""}`}>
        <Bookmark className={`h-[18px] w-[18px] ${saved ? "fill-accent-600 dark:fill-accent-400" : ""}`} />
      </span>
    </button>
  );
}
