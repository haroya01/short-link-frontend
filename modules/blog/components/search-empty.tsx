import { getTranslations } from "next-intl/server";
import { Mark } from "@/components/common/logo";
import { blogPath } from "@/lib/host";
import type { TagCount } from "@/modules/blog/api/public-posts";
import { TagChip } from "@/modules/blog/components/tag-chip";

/**
 * No-results state for a feed search — built as a *discovery springboard*, not a dead end. Instead of a
 * generic icon-medallion + "try again", it echoes what was searched, then hands the reader popular
 * topics to jump into (one tap → that tag's feed). The kurl mark line-draws in (the 사사삭) as the quiet
 * brand signature in place of a stock search glyph. Fully dark-aware.
 *
 * 인라인 재검색 폼: 카피가 "다른 검색어를 시도"하라는데 실행 수단이 화면에 없었다 — 특히 모바일은
 * 헤더에 검색 인풋이 없어 이 화면이 반쯤 막다른 벽이었다(적대 검증 r2). 순수 HTML GET 폼이라
 * JS 없이도 동작하고, 쿼리만 교체해 같은 면으로 되돌아온다.
 */
export async function SearchEmpty({
  query,
  tags,
  locale,
}: {
  query: string;
  tags: TagCount[];
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  const topics = tags.slice(0, 8);

  return (
    <div className="flex flex-col items-center px-4 py-12 text-center sm:py-16">
      <Mark className="h-6 w-auto text-accent-600 dark:text-accent-400" animated />

      <h2 className="mt-7 max-w-md text-card-title-xl font-bold leading-snug tracking-tight text-slate-900 dark:text-slate-100">
        {t("searchEmptyHeading", { q: query })}
      </h2>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
        {t("searchEmptyBody")}
      </p>

      <form action="" method="get" className="mt-6 flex w-full max-w-sm items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          aria-label={t("searchPlaceholder")}
          placeholder={t("searchPlaceholder")}
          className="focus-ring h-10 min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 text-[14px] text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="submit"
          className="focus-ring h-10 shrink-0 rounded-full bg-accent-700 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-accent-800"
        >
          {t("searchSubmit")}
        </button>
      </form>

      {topics.length > 0 && (
        <div className="mt-10 w-full max-w-md">
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
            {t("searchEmptyTopics")}
          </p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {topics.map((tag) => (
              <li key={tag.tag}>
                <TagChip
                  soft
                  href={blogPath(`/tags/${encodeURIComponent(tag.tag)}`)}
                  label={tag.tag}
                  count={tag.count}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
