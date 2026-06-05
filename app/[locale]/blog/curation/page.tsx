"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bookmark, Heart } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { SmartShelf } from "@/modules/blog/components/saved/smart-shelf";
import { LikedList } from "@/modules/blog/components/saved/liked-list";

/**
 * 저장한 글 — the reader's own reading list: bookmarked posts (account-synced via the bookmark toggle
 * on post pages) and liked posts. 대표글 핀(author curation) moved onto the 글 목록 itself — each
 * published post has an inline 대표글 toggle there — so this page is purely the saved/liked shelf.
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
      <section className="mt-8">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <Bookmark className="h-4 w-4 text-accent-600 dark:text-accent-400" />
          <h2 className="text-sm font-semibold">{t("curationReadingList")}</h2>
        </div>
        <p className="mt-1 text-[12px] text-slate-400 dark:text-slate-500">{t("curationReadingListHint")}</p>

        {/* Unified with the profile's 보관함 — smart shelf (manual folders + auto tag groups). */}
        <div className="mt-5">
          <SmartShelf username={me?.username ?? ""} locale={locale} />
        </div>
      </section>

      {/* 좋아요한 글 — posts the user liked (read-only list; the like toggle lives on each post). */}
      <section className="mt-12">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <Heart className="h-4 w-4 text-accent-600 dark:text-accent-400" />
          <h2 className="text-sm font-semibold">{t("curationLiked")}</h2>
        </div>
        <p className="mt-1 text-[12px] text-slate-400 dark:text-slate-500">{t("curationLikedHint")}</p>

        <div className="mt-5">
          <LikedList username={me?.username ?? ""} locale={locale} />
        </div>
      </section>
    </main>
  );
}
