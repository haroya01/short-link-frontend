"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  createCta,
  deleteCta,
  listMyCtas,
  updateCta,
  type CtaPurpose,
  type CtaStyle,
  type CtaView,
} from "@/lib/api/ctas";

const STYLE_OPTIONS: CtaStyle[] = ["PRIMARY", "SECONDARY"];
const PURPOSE_OPTIONS: CtaPurpose[] = [
  "BOOKING",
  "SUBSCRIBE",
  "PURCHASE",
  "CONTACT",
  "DOWNLOAD",
  "CUSTOM",
];

export default function CtaLibraryPage() {
  const { ready, authenticated } = useAuth();
  const t = useTranslations("ctaLibrary");
  const tc = useTranslations("common");
  const [ctas, setCtas] = useState<CtaView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CtaView | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCtas(await listMyCtas());
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void load();
  }, [ready, authenticated, load]);

  async function handleDelete(cta: CtaView) {
    if (!window.confirm(t("deleteConfirm", { label: cta.label }))) {
      return;
    }
    try {
      await deleteCta(cta.id);
      setCtas((prev) => prev.filter((c) => c.id !== cta.id));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "delete failed");
    }
  }

  if (!ready) return null;
  if (!authenticated) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-slate-600 dark:text-slate-400">{tc("loginRequired")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-sm font-bold tracking-headline text-slate-900 dark:text-slate-100">{t("title")}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>
        </div>
        <Button
          type="button"
          variant="accent"
          size="sm"
          onClick={() => setEditing("new")}
        >
          {t("new")}
        </Button>
      </header>

      {editing && (
        <CtaEditor
          initial={editing === "new" ? null : editing}
          onSaved={(cta) => {
            setCtas((prev) => {
              const existing = prev.find((c) => c.id === cta.id);
              return existing
                ? prev.map((c) => (c.id === cta.id ? cta : c))
                : [cta, ...prev];
            });
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading && <p className="text-slate-500 dark:text-slate-400">{tc("loading")}</p>}
      {error && (
        <p className="text-red-600 dark:text-red-400">
          {tc("errorPrefix")} {error}
        </p>
      )}

      {!loading && !error && ctas.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400">{t("empty")}</p>
      )}

      {!loading && ctas.length > 0 && (
        <ul className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
          {ctas.map((cta) => (
            <li key={cta.id} className="flex items-center gap-3 py-4">
              <span
                className={`rounded px-2 py-1 text-xs font-medium ${
                  cta.style === "PRIMARY"
                    ? "bg-accent-100 dark:bg-accent-500/15 text-accent-800 dark:text-accent-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {cta.style}
              </span>
              <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs text-slate-600 dark:text-slate-400">
                {t(`purpose.${cta.purpose}`)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{cta.label}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{cta.url}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditing(cta)}
              >
                {t("edit")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(cta)}
              >
                {t("delete")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function CtaEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial: CtaView | null;
  onSaved: (cta: CtaView) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("ctaLibrary");
  const tc = useTranslations("common");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [style, setStyle] = useState<CtaStyle>(initial?.style ?? "PRIMARY");
  const [purpose, setPurpose] = useState<CtaPurpose>(initial?.purpose ?? "CUSTOM");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const cta = initial
        ? await updateCta(initial.id, { label, url, style, purpose })
        : await createCta({ label, url, style, purpose });
      onSaved(cta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 space-y-3"
    >
      <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {initial ? t("editorTitleEdit") : t("editorTitleNew")}
      </h2>
      <label className="block text-sm">
        <span className="text-slate-700 dark:text-slate-300">{t("label")}</span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={100}
          required
          placeholder={t("labelPlaceholder")}
          className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-700 dark:text-slate-300">URL</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={2048}
          required
          pattern="https?://.*"
          placeholder="https://"
          className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-slate-700 dark:text-slate-300">{t("style")}</span>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as CtaStyle)}
            className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          >
            {STYLE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-700 dark:text-slate-300">{t("intent")}</span>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as CtaPurpose)}
            className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          >
            {PURPOSE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
          {tc("cancel")}
        </Button>
        <Button
          type="submit"
          variant="accent"
          size="sm"
          disabled={saving}
        >
          {saving ? t("saving") : initial ? t("save") : t("create")}
        </Button>
      </div>
    </form>
  );
}
