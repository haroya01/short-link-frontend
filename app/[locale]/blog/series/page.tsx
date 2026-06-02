"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Layers, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  createSeries,
  deleteSeries,
  getSeries,
  listSeries,
  setSeriesPosts,
  type SeriesDetailView,
  type SeriesView,
} from "@/modules/blog/api/series";
import { SkeletonRows } from "@/modules/blog/components/skeleton";

/**
 * Author series workspace — create a series, then expand any one inline to reorder / drop its member
 * posts. Single centered column with quiet accordion cards, matching the rest of the workspace (내 글 ·
 * 분석): no permanent form box, no cramped master-detail. "새 시리즈" toggles an inline create panel.
 */
export default function BlogSeriesPage() {
  const t = useTranslations("blogWorkspace");
  const { ready, authenticated } = useAuth();
  const [series, setSeries] = useState<SeriesView[]>([]);
  const [expanded, setExpanded] = useState<SeriesDetailView | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Host-aware base for the member edit links (/write lives beside /series on every deployment).
  const [writeBase, setWriteBase] = useState("/write");

  useEffect(() => {
    setWriteBase(window.location.pathname.replace(/\/series(?:\/.*)?$/, "/write"));
  }, []);

  const loadList = useCallback(async () => {
    try {
      setSeries(await listSeries());
    } catch {
      setSeries([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void loadList();
  }, [ready, authenticated, loadList]);

  async function toggleExpand(id: number) {
    if (expanded?.series.id === id) {
      setExpanded(null);
      return;
    }
    setError(null);
    try {
      setExpanded(await getSeries(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !title.trim() || !slug.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createSeries({ title: title.trim(), slug: slug.trim() });
      setTitle("");
      setSlug("");
      setCreating(false);
      await loadList();
      setExpanded(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t("seriesDeleteConfirm"))) return;
    setBusy(true);
    try {
      await deleteSeries(id);
      if (expanded?.series.id === id) setExpanded(null);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    if (!expanded) return;
    const ids = expanded.posts.map((p) => p.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusy(true);
    try {
      setExpanded(await setSeriesPosts(expanded.series.id, ids));
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "reorder failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (!authenticated) {
    return <main className="px-6 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("seriesTitle")}</h1>
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          className={`focus-ring inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            creating
              ? "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              : "bg-accent-600 text-white hover:bg-accent-700"
          }`}
        >
          {creating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {creating ? t("seriesCancel") : t("seriesNewTitle")}
        </button>
      </header>

      {creating && (
        <form
          onSubmit={handleCreate}
          className="mt-5 space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("seriesTitlePlaceholder")}
            maxLength={200}
            autoFocus
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors focus:border-accent-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
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
              disabled={busy || !title.trim() || !slug.trim()}
              className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
            >
              {t("seriesCreate")}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-6">
        {!loaded && <SkeletonRows count={4} />}
        {loaded && series.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
            {t("seriesEmpty")}
          </p>
        )}
        <ul className="space-y-2">
          {loaded &&
            series.map((s) => {
              const open = expanded?.series.id === s.id;
              return (
                <li
                  key={s.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 transition-colors dark:border-slate-800"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(s.id)}
                    aria-expanded={open}
                    className="focus-ring flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <Layers className="h-4 w-4 shrink-0 text-accent-500 dark:text-accent-400" />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                      {s.title}
                    </span>
                    <span className="shrink-0 text-[13px] text-slate-400 dark:text-slate-500">
                      {t("postCount", { count: s.postCount })}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>

                  {open && expanded && (
                    <div className="border-t border-slate-100 px-4 py-4 dark:border-slate-800">
                      {expanded.posts.length === 0 ? (
                        <p className="py-2 text-sm text-slate-400 dark:text-slate-500">{t("seriesNoMembers")}</p>
                      ) : (
                        <ol className="space-y-0.5">
                          {expanded.posts.map((p, i) => (
                            <li
                              key={p.id}
                              className="group/row flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            >
                              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-50 text-[12px] font-semibold text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">
                                {i + 1}
                              </span>
                              <a
                                href={`${writeBase}/${p.id}`}
                                className="focus-ring min-w-0 flex-1 truncate rounded text-sm text-slate-800 transition-colors hover:text-accent-700 dark:text-slate-200 dark:hover:text-accent-300"
                              >
                                {p.title || p.slug}
                              </a>
                              <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 [@media(hover:none)]:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => move(i, -1)}
                                  disabled={busy || i === 0}
                                  aria-label={t("curationMoveUp")}
                                  className="focus-ring grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => move(i, 1)}
                                  disabled={busy || i === expanded.posts.length - 1}
                                  aria-label={t("curationMoveDown")}
                                  className="focus-ring grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                      <div className="mt-3 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          disabled={busy}
                          className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t("seriesDelete")}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
        </ul>
      </div>
    </main>
  );
}
