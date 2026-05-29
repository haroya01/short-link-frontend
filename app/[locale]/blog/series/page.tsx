"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Layers, Plus, Trash2 } from "lucide-react";
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

export default function BlogSeriesPage() {
  const t = useTranslations("blogWorkspace");
  const { ready, authenticated } = useAuth();
  const [series, setSeries] = useState<SeriesView[]>([]);
  const [selected, setSelected] = useState<SeriesDetailView | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    try {
      setSeries(await listSeries());
    } catch {
      setSeries([]);
    }
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void loadList();
  }, [ready, authenticated, loadList]);

  async function select(id: number) {
    setError(null);
    try {
      setSelected(await getSeries(id));
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
      await loadList();
      setSelected(created);
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
      if (selected?.series.id === id) setSelected(null);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    if (!selected) return;
    const ids = selected.posts.map((p) => p.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusy(true);
    try {
      setSelected(await setSeriesPosts(selected.series.id, ids));
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "reorder failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (!authenticated) {
    return <main className="px-6 py-12 text-slate-600">{t("loginRequired")}</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("seriesTitle")}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left: create + list */}
        <div>
          <form onSubmit={handleCreate} className="space-y-2 rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-700">{t("seriesNewTitle")}</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("seriesTitlePlaceholder")}
              maxLength={200}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-400"
            />
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("seriesSlugPlaceholder")}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              minLength={2}
              maxLength={200}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-accent-400"
            />
            <p className="text-[12px] text-slate-400">{t("seriesSlugHint")}</p>
            <button
              type="submit"
              disabled={busy || !title.trim() || !slug.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {t("seriesCreate")}
            </button>
          </form>

          <ul className="mt-4 space-y-1">
            {series.length === 0 && (
              <li className="px-1 text-sm text-slate-400">{t("seriesEmpty")}</li>
            )}
            {series.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => select(s.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selected?.series.id === s.id
                      ? "bg-accent-50 text-accent-800"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Layers className="h-4 w-4 shrink-0 text-accent-500" />
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  <span className="text-[12px] text-slate-400">{s.postCount}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: selected series members */}
        <div>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          {!selected ? (
            <p className="text-sm text-slate-400">{t("selectSeries")}</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">{selected.series.title}</h2>
                <button
                  type="button"
                  onClick={() => handleDelete(selected.series.id)}
                  disabled={busy}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-500">{t("seriesMembers")}</p>

              {selected.posts.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">{t("seriesNoMembers")}</p>
              ) : (
                <ul className="mt-3 space-y-1">
                  {selected.posts.map((p, i) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5"
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-50 text-[12px] font-semibold text-accent-700">
                        {i + 1}
                      </span>
                      <a
                        href={`/write/${p.id}`}
                        className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:text-accent-700"
                      >
                        {p.title || p.slug}
                      </a>
                      <span className="flex shrink-0 gap-0.5">
                        <button
                          type="button"
                          onClick={() => move(i, -1)}
                          disabled={busy || i === 0}
                          className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(i, 1)}
                          disabled={busy || i === selected.posts.length - 1}
                          className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
