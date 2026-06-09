"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { PublicAuthor } from "@/modules/blog/api/public-posts";
import { Avatar } from "@/modules/blog/components/avatar";

/** One narrowing axis of the 팔로잉 feed — either an author (사람) or a followed tag (주제). */
export type FeedFacet = { kind: "author"; value: string } | { kind: "tag"; value: string };

/**
 * 팔로잉 피드 필터 칩 — "사람(@핸들)"과 "주제(#태그)"를 한 줄에 모아, 통합된 팔로우 피드를 작가/주제 어느
 * 쪽으로든 좁힐 수 있게 한다. 백엔드가 팔로우한 작가·구독 시리즈·팔로우한 주제를 한 피드로 합쳐 주므로,
 * 여기선 이미 받은 항목을 클라이언트에서 한 축으로 거른다(작가 칩과 동일한 토큰·모션). 좁힐 축이 1개 이하면
 * 필터 자체가 노이즈라 숨긴다. 한 번에 하나의 facet 만 활성(상호 배타) — "전체 보기"로 해제.
 */
export function FollowFilterChips({
  authors,
  tags,
  active,
  onSelect,
}: {
  authors: PublicAuthor[];
  tags: string[];
  active: FeedFacet | null;
  onSelect: (facet: FeedFacet | null) => void;
}) {
  const t = useTranslations("publicFeed");
  if (authors.length + tags.length <= 1) return null;

  // min-h-[34px]: 터치 타깃(WCAG 2.5.8). 모션은 시스템 토큰(--ease, 200ms). shrink-0/whitespace-nowrap:
  // 한 줄 가로 스크롤에서 칩이 찌그러지거나 줄바꿈되지 않게. (author-filter-chips 와 동일)
  const base =
    "inline-flex min-h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full text-[13px] font-medium transition-colors duration-200 ease-[var(--ease)]";
  const tone = (on: boolean) =>
    on
      ? "bg-accent-600 text-white"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";
  const isOn = (facet: FeedFacet) =>
    active?.kind === facet.kind && active.value === facet.value;
  const toggle = (facet: FeedFacet) => onSelect(isOn(facet) ? null : facet);

  return (
    // 한 줄 가로 스크롤 — 사람+주제가 많아져도 여러 줄 벽이 되지 않고 옆으로 흐른다(스크롤바 숨김).
    <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        aria-pressed={!active}
        onClick={() => onSelect(null)}
        className={cn(base, tone(!active), "px-3.5 py-1.5")}
      >
        {t("railFollowingAll")}
      </button>
      {authors.map((a) => {
        const facet: FeedFacet = { kind: "author", value: a.username };
        return (
          <button
            key={`author:${a.username}`}
            type="button"
            aria-pressed={isOn(facet)}
            onClick={() => toggle(facet)}
            className={cn(base, tone(isOn(facet)), "py-1 pl-1 pr-3")}
          >
            <Avatar src={a.avatarUrl} name={a.username} size="xs" />@{a.username}
          </button>
        );
      })}
      {tags.map((tg) => {
        const facet: FeedFacet = { kind: "tag", value: tg };
        return (
          <button
            key={`tag:${tg}`}
            type="button"
            aria-pressed={isOn(facet)}
            onClick={() => toggle(facet)}
            className={cn(base, tone(isOn(facet)), "px-3.5 py-1.5")}
          >
            #{tg}
          </button>
        );
      })}
    </div>
  );
}
