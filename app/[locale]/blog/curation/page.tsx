"use client";

import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { RailHeading } from "@/modules/blog/components/rail-heading";
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

      {/* 읽기 리스트 — bookmarked posts (account-synced, saved via the bookmark toggle on post pages). */}
      <section className="mt-10">
        <RailHeading>{t("curationReadingList")}</RailHeading>
        <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{t("curationReadingListHint")}</p>
        {/* Unified with the profile's 보관함 — smart shelf (manual folders + auto tag groups). */}
        <div className="mt-5">
          <SmartShelf username={me?.username ?? ""} locale={locale} />
        </div>
      </section>

      {/* 좋아요한 글 — posts the user liked (read-only list; the like toggle lives on each post). */}
      <section className="mt-12">
        <RailHeading>{t("curationLiked")}</RailHeading>
        <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{t("curationLikedHint")}</p>
        <div className="mt-5">
          <LikedList username={me?.username ?? ""} locale={locale} />
        </div>
      </section>

      {/* 내 댓글 — every comment the user wrote, anchored to its post (private to the owner). */}
      <section className="mt-12">
        <RailHeading>{t("curationComments")}</RailHeading>
        <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{t("curationCommentsHint")}</p>
        <div className="mt-5">
          <MyCommentsList locale={locale} />
        </div>
      </section>

      {/* 읽기 기록 — posts the reader has read (account-synced, newest first; private to the owner). */}
      <section className="mt-12">
        <RailHeading>{t("curationHistory")}</RailHeading>
        <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{t("curationHistoryHint")}</p>
        <div className="mt-5">
          <ReadingHistoryList username={me?.username ?? ""} locale={locale} />
        </div>
      </section>
    </main>
  );
}
