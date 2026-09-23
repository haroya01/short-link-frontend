"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogPath } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { CollapsibleSection } from "@/modules/blog/components/saved/collapsible-section";
import { SmartShelf } from "@/modules/blog/components/saved/smart-shelf";
import { LikedList } from "@/modules/blog/components/saved/liked-list";
import { HighlightsList } from "@/modules/blog/components/saved/highlights-list";
import { MyCommentsList } from "@/modules/blog/components/saved/my-comments-list";
import { ReadingHistoryList } from "@/modules/blog/components/saved/reading-history-list";
import { FollowedTagsShelf } from "@/modules/blog/components/saved/followed-tags-shelf";

/** The reader's library: visible destinations for saved posts, passages, and collections. */
export default function SavedPostsPage() {
  return (
    <Suspense fallback={null}>
      <Library />
    </Suspense>
  );
}

function Library() {
  const t = useTranslations("blogWorkspace");
  const showingHighlights = useSearchParams().get("view") === "highlights";
  const locale = useLocale();
  const { ready, authenticated, me } = useAuth();

  if (!ready) return null;
  if (!authenticated) {
    return <main className="px-6 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>;
  }

  return (
    // max-w-3xl: 글·분석·리드와 같은 워크스페이스 공통 폭.
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("savedTitle")}</h1>
      <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{t("savedSubtitle")}</p>

      <nav aria-label={t("savedTitle")} className="mt-7 grid grid-cols-3 border-b border-slate-100 dark:border-slate-800">
        {[
          { href: `/${locale}${blogPath("/curation")}`, label: t("curationReadingList"), active: !showingHighlights },
          { href: `/${locale}${blogPath("/curation?view=highlights")}`, label: t("curationHighlights"), active: showingHighlights },
          { href: `/${locale}${blogPath("/collections")}`, label: t("libraryCollections"), active: false },
        ].map(({ href, label, active }) => (
          <BlogLink
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`focus-ring flex min-h-12 items-center justify-center border-b-2 px-2 py-3 text-center text-[13px] font-medium transition-colors ${
              active
                ? "border-accent-600 text-accent-700 dark:border-accent-500 dark:text-accent-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            {label}
          </BlogLink>
        ))}
      </nav>

      <section className="mt-6" aria-labelledby="library-section-title">
        <h2 id="library-section-title" className="sr-only">
          {t(showingHighlights ? "curationHighlights" : "curationReadingList")}
        </h2>
        <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t(showingHighlights ? "curationHighlightsHint" : "curationReadingListHint")}
        </p>
        <div className="mt-4">
          {showingHighlights ? (
            <HighlightsList username={me?.username ?? ""} locale={locale} />
          ) : (
            <SmartShelf username={me?.username ?? ""} locale={locale} />
          )}
        </div>
      </section>

      <div className="mt-10 divide-y divide-slate-100 border-y border-slate-100 dark:divide-slate-800 dark:border-slate-800">
        <CollapsibleSection title={t("curationLiked")} hint={t("curationLikedHint")}>
          <LikedList username={me?.username ?? ""} locale={locale} />
        </CollapsibleSection>
        <CollapsibleSection title={t("curationComments")} hint={t("curationCommentsHint")}>
          <MyCommentsList locale={locale} />
        </CollapsibleSection>
        <CollapsibleSection title={t("curationHistory")} hint={t("curationHistoryHint")}>
          <ReadingHistoryList username={me?.username ?? ""} locale={locale} />
        </CollapsibleSection>
        {/* 구독한 태그 — 팔로우한 주제를 한눈에, 눌러서 그 주제 피드로. 관리(언팔로우)는 설정에 둔다. */}
        <CollapsibleSection title={t("curationTags")} hint={t("curationTagsHint")}>
          <FollowedTagsShelf />
        </CollapsibleSection>
      </div>
    </main>
  );
}
