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
  const base =
    "inline-flex min-h-[34px] items-center gap-1.5 rounded-full text-[13px] font-medium transition-colors duration-200 ease-[var(--ease)]";
  const tone = (on: boolean) =>
    on
      ? "bg-accent-600 text-white"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
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
