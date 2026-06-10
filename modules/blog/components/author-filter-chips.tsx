"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { PublicAuthor } from "@/modules/blog/api/public-posts";
import { Avatar } from "@/modules/blog/components/avatar";

/**
 * Author filter chips — a row of "people" pills (avatar + handle) + a "전체 보기" reset, used to filter
 * a feed/grid by author. People read as people, so each chip carries the author's avatar, not bare
 * text. Shared by the 팔로잉(작가별) and 시리즈(시리즈 작가별) tabs so the filter looks identical on both.
 * Hidden when there's 0–1 author (a filter with one option is noise).
 */
export function AuthorFilterChips({
  authors,
  active,
  onSelect,
}: {
  authors: PublicAuthor[];
  active: string | null;
  onSelect: (username: string | null) => void;
}) {
  const t = useTranslations("publicFeed");
  if (authors.length <= 1) return null;

  // h-9 고정: 전체보기·작가 칩이 정확히 같은 높이 → 줄이 삐죽삐죽하지 않게. 모션은 시스템 토큰(--ease,
  // 200ms). shrink-0/whitespace-nowrap: 한 줄 가로 스크롤에서 찌그러짐·줄바꿈 방지. (follow-filter-chips 와 동일)
  const base =
    "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full text-[13px] font-medium transition-colors duration-200 ease-[var(--ease)]";
  const tone = (on: boolean) =>
    on
      ? "bg-accent-700 text-white"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";

  return (
    // 한 줄 가로 스크롤 — 작가가 많아져도 여러 줄 벽이 되지 않고 옆으로 흐른다(스크롤바 숨김).
    <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        aria-pressed={!active}
        onClick={() => onSelect(null)}
        className={cn(base, tone(!active), "px-4")}
      >
        {t("railFollowingAll")}
      </button>
      {authors.map((a) => (
        <button
          key={a.username}
          type="button"
          aria-pressed={active === a.username}
          onClick={() => onSelect(active === a.username ? null : a.username)}
          className={cn(base, tone(active === a.username), "pl-2 pr-4")}
        >
          <Avatar src={a.avatarUrl} name={a.username} size="xs" />@{a.username}
        </button>
      ))}
    </div>
  );
}
