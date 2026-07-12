"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createSeries, listSeries, type SeriesView } from "@/modules/blog/api/series";
import { ApiError } from "@/lib/api/client";

type Props = {
  value: number | null;
  onChange: (seriesId: number | null) => void;
  noneLabel: string;
  emptyHint: string;
};

/**
 * Assigns the post to one of the author's series — or creates a new one inline (no trip to the series
 * workspace), so a "스토리" can be made freely while writing. Pick from the list, or "+ 새 시리즈" → type a
 * name → it's created (slug auto-derived) and selected.
 */
export function SeriesSelect({ value, onChange, noneLabel, emptyHint }: Props) {
  const t = useTranslations("postEditor");
  const [series, setSeries] = useState<SeriesView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSeries()
      .then(setSeries)
      .catch(() => setSeries([]))
      .finally(() => setLoaded(true));
  }, []);

  async function create() {
    const title = newTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Auto-derive a slug from the title; non-Latin titles (ko/ja) collapse to empty → random fallback.
      const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const slug = base.length >= 2 ? base : `series-${Math.random().toString(36).slice(2, 8)}`;
      const created = await createSeries({ title, slug });
      setSeries((prev) => [created.series, ...prev]);
      onChange(created.series.id);
      setNewTitle("");
      setCreating(false);
    } catch (e) {
      // 같은 제목을 다시 쓰면 슬러그가 겹쳐 409 — 조용히 사라지지 않게 고칠 수 있는 안내로.
      setError(e instanceof ApiError && e.status === 409 ? t("seriesCreateConflict") : t("seriesCreateError"));
    } finally {
      setBusy(false);
    }
  }

  if (creating) {
    return (
      <div>
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            aria-label={t("seriesNew")}
            value={newTitle}
            onChange={(e) => {
              setNewTitle(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void create();
              } else if (e.key === "Escape") {
                setCreating(false);
                setNewTitle("");
                setError(null);
              }
            }}
            maxLength={200}
            placeholder={t("seriesNewPlaceholder")}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-accent-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-accent-500"
          />
          <button
            type="button"
            onClick={create}
            disabled={busy || !newTitle.trim()}
            className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-800 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t("seriesNew")}
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setNewTitle("");
              setError(null);
            }}
            aria-label={t("close")}
            className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && (
          <p className="mt-1 text-[11px] text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          aria-label={t("series")}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 outline-none transition-colors focus:border-accent-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-accent-500 sm:text-sm"
        >
          <option value="">{noneLabel}</option>
          {series.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-accent-500/50 dark:hover:text-accent-400"
        >
          <Plus className="h-4 w-4" />
          {t("seriesNew")}
        </button>
      </div>
      {loaded && series.length === 0 && (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{emptyHint}</p>
      )}
    </div>
  );
}
