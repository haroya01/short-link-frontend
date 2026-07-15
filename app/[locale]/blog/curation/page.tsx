"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { blogPath } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { BrandTick } from "@/modules/blog/components/rail-heading";
import { CollapsibleSection } from "@/modules/blog/components/saved/collapsible-section";
import { SmartShelf } from "@/modules/blog/components/saved/smart-shelf";
import { LikedList } from "@/modules/blog/components/saved/liked-list";
import { HighlightsList } from "@/modules/blog/components/saved/highlights-list";
import { MyCommentsList } from "@/modules/blog/components/saved/my-comments-list";
import { ReadingHistoryList } from "@/modules/blog/components/saved/reading-history-list";
import { FollowedTagsShelf } from "@/modules/blog/components/saved/followed-tags-shelf";

/**
 * 저장한 글 — the reader's own corner: bookmarked posts, liked posts, the comments they've written, and
 * their reading history. One quiet column of {@link RailHeading}-labelled sections (the brand-green tick
 * is the section signature — no per-section icon competing with it), each hint sitting under its label.
 */
export default function SavedPostsPage() {
  const t = useTranslations("blogWorkspace");
  const tColl = useTranslations("collections");
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

      {/* 읽기 리스트 = 이 페이지의 본문 — "다시 읽으러 온" 사람이 서랍을 열 필요 없이 바로
          만나는 열린 섹션. 나머지 보관 성격 목록들은 아래 조용한 인덱스로 강등(서랍장 6개가
          동급으로 서 있던 판을 본문 1 + 색인 6으로). */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-slate-100">
          <BrandTick />
          {t("curationReadingList")}
        </h2>
        <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{t("curationReadingListHint")}</p>
        <div className="mt-4">
          {/* Unified with the profile's 보관함 — smart shelf (manual folders + auto tag groups). */}
          <SmartShelf username={me?.username ?? ""} locale={locale} />
        </div>
      </section>

      {/* 보관함 인덱스 — 내 컬렉션(별도 페이지 링크)과 접이식 목록들을 한 가지 행 문법으로. */}
      <div className="mt-10 divide-y divide-slate-100 border-y border-slate-100 dark:divide-slate-800 dark:border-slate-800">
        <BlogLink
          href={blogPath("/collections")}
          className="focus-ring flex w-full items-center gap-3 px-1 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center gap-2 text-[13px] font-bold text-slate-800 dark:text-slate-200">
              <BrandTick />
              {tColl("myCollectionsTitle")}
            </span>
            <span className="truncate text-[12px] font-normal text-slate-500 dark:text-slate-400">
              {tColl("myCollectionsSubtitle")}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
        </BlogLink>
        <CollapsibleSection title={t("curationLiked")} hint={t("curationLikedHint")}>
          <LikedList username={me?.username ?? ""} locale={locale} />
        </CollapsibleSection>
        <CollapsibleSection title={t("curationHighlights")} hint={t("curationHighlightsHint")}>
          {/* 내 서재 — 내가 그은 구절 모음, 원문 문장으로 되돌아가는 딥링크. */}
          <HighlightsList username={me?.username ?? ""} locale={locale} />
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
