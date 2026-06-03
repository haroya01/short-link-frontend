"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, FileText, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import {
  createSeries,
  deleteSeries,
  listSeries,
  setSeriesPosts,
  updateSeries,
  type SeriesView,
} from "@/modules/blog/api/series";
import { listMyPosts, type PostView } from "@/modules/blog/api/posts";
import { Mark } from "@/components/common/logo";
import { PostStatusBadge } from "@/modules/blog/components/post-status-badge";
import { SkeletonRows } from "@/modules/blog/components/skeleton";

/**
 * 내 글의 "시리즈별 보기" — the post list grouped by series (the unified workspace; series is a lens on
 * 내 글, not a separate page). Each series is a group whose header curates it inline (이름 변경 · 정렬 ·
 * 글 추가/제거 · 삭제); posts with no series fall into a "시리즈 없음" group. Membership owns ordering, so
 * every change persists the series' ordered post-id list. Never deletes a post — only its membership.
 */
export function SeriesGroupedView({ writeBase }: { writeBase: string }) {
  const t = useTranslations("blogWorkspace");
  const [series, setSeries] = useState<SeriesView[]>([]);
  const [posts, setPosts] = useState<PostView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [nTitle, setNTitle] = useState("");
  const [nSlug, setNSlug] = useState("");

  const [renaming, setRenaming] = useState<number | null>(null);
  const [rTitle, setRTitle] = useState("");
  const [rSlug, setRSlug] = useState("");

  // Which series' "글 추가" picker is open, and its search query.
  const [picking, setPicking] = useState<number | null>(null);
  const [pickQuery, setPickQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([listSeries(), listMyPosts()]);
      setSeries(s);
      setPosts(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(
    () =>
      series.map((s) => ({
        series: s,
        members: posts
          .filter((p) => p.seriesId === s.id)
          .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0)),
      })),
    [series, posts],
  );
  const ungrouped = useMemo(() => posts.filter((p) => p.seriesId == null), [posts]);

  const memberIds = (seriesId: number) =>
    groups.find((g) => g.series.id === seriesId)?.members.map((m) => m.id) ?? [];

  async function commitMembers(seriesId: number, ids: number[]) {
    setBusy(true);
    setError(null);
    try {
      await setSeriesPosts(seriesId, ids);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "update failed");
    } finally {
      setBusy(false);
    }
  }

  function move(seriesId: number, index: number, dir: -1 | 1) {
    const ids = [...memberIds(seriesId)];
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void commitMembers(seriesId, ids);
  }

  const removeMember = (seriesId: number, postId: number) =>
    void commitMembers(seriesId, memberIds(seriesId).filter((id) => id !== postId));
  const addMember = (seriesId: number, postId: number) =>
    void commitMembers(seriesId, [...memberIds(seriesId), postId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !nTitle.trim() || !nSlug.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createSeries({ title: nTitle.trim(), slug: nSlug.trim() });
      setNTitle("");
      setNSlug("");
      setCreating(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    } finally {
      setBusy(false);
    }
  }

  function startRename(s: SeriesView) {
    setRenaming(s.id);
    setRTitle(s.title);
    setRSlug(s.slug);
  }

  async function handleRename(id: number) {
    if (busy || !rTitle.trim() || !rSlug.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await updateSeries(id, { title: rTitle.trim(), slug: rSlug.trim() });
      setRenaming(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "rename failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t("seriesDeleteConfirm"))) return;
    setBusy(true);
    try {
      await deleteSeries(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
    } finally {
      setBusy(false);
    }
  }

  // Add-picker candidates: unassigned posts (a post lives in one series), narrowed by search.
  const candidates = useMemo(() => {
    const q = pickQuery.trim().toLowerCase();
    return ungrouped.filter((p) => !q || (p.title || p.slug).toLowerCase().includes(q));
  }, [ungrouped, pickQuery]);

  if (!loaded) return <SkeletonRows count={5} />;

  return (
    <div className="space-y-3">
      {/* 새 시리즈 */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          className={`focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
            creating
              ? "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              : "bg-accent-600 text-white hover:bg-accent-700"
          }`}
        >
          {creating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {creating ? t("seriesCancel") : t("seriesNewTitle")}
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <input
            value={nTitle}
            onChange={(e) => setNTitle(e.target.value)}
            placeholder={t("seriesTitlePlaceholder")}
            maxLength={200}
            autoFocus
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors focus:border-accent-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            value={nSlug}
            onChange={(e) => setNSlug(e.target.value)}
            placeholder={t("seriesSlugPlaceholder")}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            minLength={2}
            maxLength={200}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-accent-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-slate-400 dark:text-slate-500">{t("seriesSlugHint")}</p>
            <button
              type="submit"
              disabled={busy || !nTitle.trim() || !nSlug.trim()}
              className="focus-ring shrink-0 rounded-lg bg-accent-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
            >
              {t("seriesCreate")}
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {series.length === 0 && ungrouped.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
          {t("seriesEmpty")}
        </p>
      )}

      {/* Series groups */}
      {groups.map(({ series: s, members }) => (
        <section
          key={s.id}
          className="mark-hoverable overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"
        >
          <header className="flex items-center gap-3 px-4 py-3.5">
            <Mark animated className="h-3 w-auto shrink-0 text-accent-500 dark:text-accent-400" />
            {renaming === s.id ? (
              <span className="flex flex-1 items-center gap-2">
                <input
                  value={rTitle}
                  onChange={(e) => setRTitle(e.target.value)}
                  maxLength={200}
                  autoFocus
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-accent-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <input
                  value={rSlug}
                  onChange={(e) => setRSlug(e.target.value)}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  maxLength={200}
                  className="w-28 shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-[13px] outline-none focus:border-accent-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => handleRename(s.id)}
                  disabled={busy || !rTitle.trim() || !rSlug.trim()}
                  className="focus-ring shrink-0 rounded-lg bg-accent-600 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
                >
                  {t("seriesRenameSave")}
                </button>
                <button
                  type="button"
                  onClick={() => setRenaming(null)}
                  aria-label={t("seriesCancel")}
                  className="focus-ring grid h-7 w-7 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                  {s.title}
                </span>
                <span className="shrink-0 text-[13px] text-slate-400 dark:text-slate-500">
                  {t("postCount", { count: members.length })}
                </span>
                <span className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => startRename(s)}
                    disabled={busy}
                    aria-label={t("seriesRename")}
                    title={t("seriesRename")}
                    className="focus-ring grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    disabled={busy}
                    aria-label={t("seriesDelete")}
                    title={t("seriesDelete")}
                    className="focus-ring grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </>
            )}
          </header>

          <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800">
            {members.length === 0 ? (
              <p className="px-1 py-1.5 text-sm text-slate-400 dark:text-slate-500">{t("seriesNoMembers")}</p>
            ) : (
              <ol className="space-y-0.5">
                {members.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-50 font-mono text-[12px] font-semibold tabular-nums text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <a
                      href={`${writeBase}/${p.id}`}
                      className="focus-ring min-w-0 flex-1 truncate rounded text-sm text-slate-800 transition-colors hover:text-accent-700 dark:text-slate-200 dark:hover:text-accent-300"
                    >
                      {p.title || p.slug}
                    </a>
                    <PostStatusBadge status={p.status} />
                    <span className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(s.id, i, -1)}
                        disabled={busy || i === 0}
                        aria-label={t("curationMoveUp")}
                        className="focus-ring grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(s.id, i, 1)}
                        disabled={busy || i === members.length - 1}
                        aria-label={t("curationMoveDown")}
                        className="focus-ring grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMember(s.id, p.id)}
                        disabled={busy}
                        aria-label={t("seriesRemoveFromSeries")}
                        title={t("seriesRemoveFromSeries")}
                        className="focus-ring ml-0.5 grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {/* 글 추가 — picker of unassigned posts */}
            <div className="mt-2">
              {picking !== s.id ? (
                <button
                  type="button"
                  onClick={() => {
                    setPicking(s.id);
                    setPickQuery("");
                  }}
                  disabled={busy}
                  className="focus-ring inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-500 transition-colors hover:border-accent-300 hover:bg-accent-50/50 hover:text-accent-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-accent-500/40 dark:hover:bg-accent-500/10 dark:hover:text-accent-300"
                >
                  <Plus className="h-4 w-4" />
                  {t("seriesAddPost")}
                </button>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      value={pickQuery}
                      onChange={(e) => setPickQuery(e.target.value)}
                      placeholder={t("seriesPickerSearch")}
                      autoFocus
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setPicking(null)}
                      aria-label={t("seriesCancel")}
                      className="focus-ring grid h-6 w-6 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {candidates.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                      {t("seriesPickerEmpty")}
                    </p>
                  ) : (
                    <ul className="max-h-60 overflow-y-auto p-1">
                      {candidates.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => addMember(s.id, p.id)}
                            disabled={busy}
                            className="focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent-50/60 disabled:opacity-50 dark:hover:bg-accent-500/10"
                          >
                            <Plus className="h-4 w-4 shrink-0 text-accent-500 dark:text-accent-400" />
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                              {p.title || p.slug}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      ))}

      {/* 시리즈 없음 */}
      {ungrouped.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <header className="flex items-center gap-3 px-4 py-3.5">
            <FileText className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-slate-500 dark:text-slate-400">
              {t("seriesNoneGroup")}
            </span>
            <span className="shrink-0 text-[13px] text-slate-400 dark:text-slate-500">
              {t("postCount", { count: ungrouped.length })}
            </span>
          </header>
          <ol className="border-t border-slate-100 px-3 py-3 dark:border-slate-800">
            {ungrouped.map((p) => (
              <li key={p.id}>
                <a
                  href={`${writeBase}/${p.id}`}
                  className="focus-ring flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-200">
                    {p.title || p.slug}
                  </span>
                  <PostStatusBadge status={p.status} />
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
