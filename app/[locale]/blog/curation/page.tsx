"use client";

import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { CollapsibleSection } from "@/modules/blog/components/saved/collapsible-section";
import { SmartShelf } from "@/modules/blog/components/saved/smart-shelf";
import { LikedList } from "@/modules/blog/components/saved/liked-list";
import { MyCommentsList } from "@/modules/blog/components/saved/my-comments-list";
import { ReadingHistoryList } from "@/modules/blog/components/saved/reading-history-list";

/**
 * 저장한 글 — the reader's own corner: bookmarked posts, liked posts, the comments they've written, and
 * their reading history. One quiet column of {@link RailHeading}-labelled sections (the brand-green tick
 * is the section signature — no per-section icon competing with it), each hint sitting under its label.
 */
export default function SavedPostsPage() {
  const t = useTranslations("blogWorkspace");
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

      {/* 저장한 글 = 한 번에 한 곳에 집중 — 각 섹션을 필요할 때 펼친다(읽기 리스트만 기본 열림). */}
      <div className="mt-8 space-y-3">
        <CollapsibleSection title={t("curationReadingList")} hint={t("curationReadingListHint")} defaultOpen>
          {/* Unified with the profile's 보관함 — smart shelf (manual folders + auto tag groups). */}
          <SmartShelf username={me?.username ?? ""} locale={locale} />
        </CollapsibleSection>
        <CollapsibleSection title={t("curationLiked")} hint={t("curationLikedHint")}>
          <LikedList username={me?.username ?? ""} locale={locale} />
        </CollapsibleSection>
        <CollapsibleSection title={t("curationComments")} hint={t("curationCommentsHint")}>
          <MyCommentsList locale={locale} />
        </CollapsibleSection>
        <CollapsibleSection title={t("curationHistory")} hint={t("curationHistoryHint")}>
          <ReadingHistoryList username={me?.username ?? ""} locale={locale} />
        </CollapsibleSection>
      </div>
    </main>
  );
}
