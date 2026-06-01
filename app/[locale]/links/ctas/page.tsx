"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
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
        <p className="text-gray-600">{tc("loginRequired")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-2 text-sm text-gray-500">{t("description")}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t("new")}
        </button>
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

      {loading && <p className="text-gray-500">{tc("loading")}</p>}
      {error && (
        <p className="text-red-600">
          {tc("errorPrefix")} {error}
        </p>
      )}

      {!loading && !error && ctas.length === 0 && (
        <p className="text-gray-500">{t("empty")}</p>
      )}

      {!loading && ctas.length > 0 && (
        <ul className="mt-6 divide-y divide-gray-100">
          {ctas.map((cta) => (
            <li key={cta.id} className="flex items-center gap-3 py-4">
              <span
                className={`rounded px-2 py-1 text-xs font-medium ${
                  cta.style === "PRIMARY"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {cta.style}
              </span>
              <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                {t(`purpose.${cta.purpose}`)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{cta.label}</p>
                <p className="truncate text-xs text-gray-500">{cta.url}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(cta)}
                className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                {t("edit")}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(cta)}
                className="rounded border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                {t("delete")}
              </button>
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
      className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3"
    >
      <h2 className="text-sm font-medium text-gray-700">
        {initial ? t("editorTitleEdit") : t("editorTitleNew")}
      </h2>
      <label className="block text-sm">
        <span className="text-gray-700">{t("label")}</span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={100}
          required
          placeholder={t("labelPlaceholder")}
          className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="text-gray-700">URL</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={2048}
          required
          pattern="https?://.*"
          placeholder="https://"
          className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-mono"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-gray-700">{t("style")}</span>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as CtaStyle)}
            className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            {STYLE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-gray-700">{t("intent")}</span>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as CtaPurpose)}
            className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            {PURPOSE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          {tc("cancel")}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? t("saving") : initial ? t("save") : t("create")}
        </button>
      </div>
    </form>
  );
}
