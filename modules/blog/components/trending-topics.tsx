import { getTranslations } from "next-intl/server";
import type { TagCount } from "@/modules/blog/api/public-posts";
import { BlogLink } from "@/modules/blog/components/blog-link";

/**
 * 발견 피드 "인기 주제" — 교과서 표준 패턴(Medium "recommended topics" / Hashnode / dev.to):
 * **균일한 pill 태그**의 가로 나열. 크기 가변·차트 등 장식 없이(난잡함의 원인) 동일한 알약 버튼으로
 * 깔끔하게. 클릭하면 그 주제(인기순)로 필터. 시스템의 다른 칩과 동일한 시각 언어.
 */
export async function TrendingTopics({
  topics,
  locale,
  activeTag = "",
}: {
  topics: TagCount[];
  locale: string;
  /** Currently filtered tag — that chip renders active and links back to "clear", so selecting a
   *  topic highlights in place instead of removing the strip (no layout jump). */
  activeTag?: string;
}) {
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  if (topics.length === 0) return null;
  const lower = activeTag.toLowerCase();

  return (
    <div className="mb-7">
      <p className="mb-3 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
        {t("trendingTopicsLabel")}
      </p>
      <div className="flex flex-wrap gap-2">
        {topics.slice(0, 12).map((tg) => {
          const active = tg.tag.toLowerCase() === lower;
          return (
            <BlogLink
              key={tg.tag}
              href={active ? "?sort=trending" : `?sort=trending&tag=${encodeURIComponent(tg.tag)}`}
              aria-current={active ? "true" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-accent-600 text-white hover:bg-accent-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              }`}
            >
              #{tg.tag}
            </BlogLink>
          );
        })}
      </div>
    </div>
  );
}
