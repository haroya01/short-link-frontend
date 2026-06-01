"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Bookmark, ExternalLink, Pin, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listMyPosts, type PostView } from "@/modules/blog/api/posts";
import {
  getBookmarks,
  getPinnedIds,
  removeBookmark,
  setPinnedIds,
  type BookmarkItem,
} from "@/modules/blog/api/curation";
import { SkeletonRows } from "@/modules/blog/components/skeleton";

/**
 * 큐레이션 — author curates two things: which of their published posts are pinned (and in what order)
 * atop the public blog home, and a reading list of bookmarked posts. Front-end-only for now: state is
 * mock-persisted to localStorage (see modules/blog/api/curation.ts), so reorder/add/remove all work
 * across reloads without a backend. Matches the workspace dashboard conventions, not the public
 * reading column.
 */
export default function ContentCurationPage() {
  const t = useTranslations("blogWorkspace");
  const { ready, authenticated } = useAuth();
  const [posts, setPosts] = useState<PostView[]>([]);
  const [pinnedIds, setPins] = useState<number[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [addId, setAddId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !authenticated) return;
    setPins(getPinnedIds());
    setBookmarks(getBookmarks());
    listMyPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [ready, authenticated]);

  const published = useMemo(() => posts.filter((p) => p.status === "PUBLISHED"), [posts]);
  const byId = useMemo(() => new Map(published.map((p) => [p.id, p])), [published]);
  const pinnedPosts = pinnedIds
    .map((id) => byId.get(id))
    .filter((p): p is PostView => p !== undefined);
  const addable = published.filter((p) => !pinnedIds.includes(p.id));

  function commitPins(ids: number[]) {
    setPins(ids);
    setPinnedIds(ids);
  }
  function addPin() {
    const id = Number(addId);
    if (!id || pinnedIds.includes(id)) return;
    commitPins([...pinnedIds, id]);
    setAddId("");
  }
  function removePin(id: number) {
    commitPins(pinnedIds.filter((x) => x !== id));
  }
  function movePin(id: number, dir: -1 | 1) {
    const i = pinnedIds.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= pinnedIds.length) return;
    const next = [...pinnedIds];
    [next[i], next[j]] = [next[j], next[i]];
    commitPins(next);
  }
  function dropBookmark(id: number) {
    setBookmarks(removeBookmark(id));
  }

  if (!ready) return null;
  if (!authenticated) {
    return <main className="px-6 py-12 text-slate-600">{t("loginRequired")}</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("curationTitle")}</h1>
      <p className="mt-1 text-[13px] text-slate-500">{t("curationSubtitle")}</p>
      <p className="mt-3 inline-block rounded-md bg-amber-50 px-2.5 py-1 text-[12px] text-amber-700">
        {t("curationMockNote")}
      </p>

      {/* 대표글 핀 — pick & order the posts that surface atop the public home. */}
      <section className="mt-8">
        <div className="flex items-center gap-2 text-slate-700">
          <Pin className="h-4 w-4 text-accent-600" />
          <h2 className="text-sm font-semibold">{t("curationPinned")}</h2>
        </div>
        <p className="mt-1 text-[12px] text-slate-400">{t("curationPinnedHint")}</p>

        {loading ? (
          <div className="mt-4">
            <SkeletonRows count={3} />
          </div>
        ) : (
          <>
            {pinnedPosts.length > 0 ? (
              <ul className="mt-4 divide-y divide-slate-100">
                {pinnedPosts.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-5 shrink-0 text-center text-[13px] font-semibold text-accent-600">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-slate-900">
                        {p.title || p.slug}
                      </span>
                      <span className="block truncate font-mono text-[12px] text-slate-400">
                        /{p.slug}
                      </span>
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => movePin(p.id, -1)}
                        disabled={i === 0}
                        aria-label={t("curationMoveUp")}
                        className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePin(p.id, 1)}
                        disabled={i === pinnedPosts.length - 1}
                        aria-label={t("curationMoveDown")}
                        className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePin(p.id)}
                        aria-label={t("curationUnpin")}
                        className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-[13px] text-slate-400">
                {t("curationPinnedEmpty")}
              </p>
            )}

            {addable.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <select
                  value={addId}
                  onChange={(e) => setAddId(e.target.value)}
                  aria-label={t("curationAddLabel")}
                  className="focus-ring min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-700 outline-none transition-colors focus:border-accent-400"
                >
                  <option value="">{t("curationAddPlaceholder")}</option>
                  {addable.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title || p.slug}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addPin}
                  disabled={!addId}
                  className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  {t("curationAdd")}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* 읽기 리스트 — bookmarked posts (mock; saved from post pages in a later pass). */}
      <section className="mt-12">
        <div className="flex items-center gap-2 text-slate-700">
          <Bookmark className="h-4 w-4 text-accent-600" />
          <h2 className="text-sm font-semibold">{t("curationReadingList")}</h2>
        </div>
        <p className="mt-1 text-[12px] text-slate-400">{t("curationReadingListHint")}</p>

        {bookmarks.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {bookmarks.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <a
                    href={`/p/${b.username}/${b.slug}`}
                    className="focus-ring group flex items-center gap-1.5 truncate text-[15px] font-medium text-slate-900 hover:text-accent-700"
                  >
                    <span className="truncate">{b.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-accent-600" />
                  </a>
                  <span className="block truncate text-[12px] text-slate-400">@{b.username}</span>
                </span>
                <button
                  type="button"
                  onClick={() => dropBookmark(b.id)}
                  aria-label={t("curationRemoveBookmark")}
                  className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-[13px] text-slate-400">
            {t("curationReadingListEmpty")}
          </p>
        )}
      </section>
    </main>
  );
}
