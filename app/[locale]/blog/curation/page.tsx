"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Layers } from "lucide-react";
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
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("savedTitle")}</h1>
      <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{t("savedSubtitle")}</p>

      {/* 내 컬렉션 — 저장한 글(읽기 위주)과 나란히 두는, 내가 엮은 컬렉션/길로 가는 진입점. 여기 섹션들과
          달리 별도 페이지라 접히는 목록이 아니라 링크 행으로 둔다. */}
      <BlogLink
        href={blogPath("/collections")}
        className="focus-ring mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
      >
        <Layers className="h-4 w-4 shrink-0 text-accent-600 dark:text-accent-500" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-slate-800 dark:text-slate-200">
            {tColl("myCollectionsTitle")}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-slate-500 dark:text-slate-400">
            {tColl("myCollectionsSubtitle")}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
      </BlogLink>

      {/* 저장한 글 = 한 번에 한 곳에 집중 — 각 섹션을 필요할 때 펼친다(읽기 리스트만 기본 열림). */}
      <div className="mt-6 space-y-3">
        <CollapsibleSection title={t("curationReadingList")} hint={t("curationReadingListHint")} defaultOpen>
          {/* Unified with the profile's 보관함 — smart shelf (manual folders + auto tag groups). */}
          <SmartShelf username={me?.username ?? ""} locale={locale} />
        </CollapsibleSection>
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
