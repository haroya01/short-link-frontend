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

  // min-h-[34px]: 손가락 터치 타깃(WCAG 2.5.8) 확보. 모션은 시스템 토큰(--ease, 200ms)으로 통일.
  // shrink-0/whitespace-nowrap: 한 줄 가로 스크롤에서 칩이 찌그러지거나 줄바꿈되지 않게.
  const base =
    "inline-flex min-h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full text-[13px] font-medium transition-colors duration-200 ease-[var(--ease)]";
  const tone = (on: boolean) =>
    on
      ? "bg-accent-600 text-white"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";

  return (
    // 한 줄 가로 스크롤 — 작가가 많아져도 여러 줄 벽이 되지 않고 옆으로 흐른다(스크롤바 숨김).
    <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        aria-pressed={!active}
        onClick={() => onSelect(null)}
        className={cn(base, tone(!active), "px-3.5 py-1.5")}
      >
        {t("railFollowingAll")}
      </button>
      {authors.map((a) => (
        <button
          key={a.username}
          type="button"
          aria-pressed={active === a.username}
          onClick={() => onSelect(active === a.username ? null : a.username)}
          className={cn(base, tone(active === a.username), "py-1 pl-1 pr-3")}
        >
          <Avatar src={a.avatarUrl} name={a.username} size="xs" />@{a.username}
        </button>
      ))}
    </div>
  );
}
