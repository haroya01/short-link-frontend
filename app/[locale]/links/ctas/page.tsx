"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MousePointerClick } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApiErrorMessage } from "@/lib/error-messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/use-confirm";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
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
  const errorMessage = useApiErrorMessage();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [ctas, setCtas] = useState<CtaView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [editing, setEditing] = useState<CtaView | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCtas(await listMyCtas());
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void load();
  }, [ready, authenticated, load]);

  async function handleDelete(cta: CtaView) {
    if (!(await confirm({ title: t("deleteConfirm", { label: cta.label }), destructive: true }))) return;
    try {
      await deleteCta(cta.id);
      setCtas((prev) => prev.filter((c) => c.id !== cta.id));
    } catch (e) {
      toast(errorMessage(e, t("deleteFailed")), "error");
    }
  }

  if (!ready) return null;
  if (!authenticated) return <SignInEmptyState page reason="ctas" icon={MousePointerClick} />;

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>
        </div>
        {!editing && (
          <Button type="button" variant="accent" onClick={() => setEditing("new")}>
            {t("new")}
          </Button>
        )}
      </div>

      {editing && (
        <CtaEditor
          initial={editing === "new" ? null : editing}
          onSaved={(cta) => {
            setCtas((prev) => {
              const existing = prev.find((c) => c.id === cta.id);
              return existing ? prev.map((c) => (c.id === cta.id ? cta : c)) : [cta, ...prev];
            });
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? (
        <ul aria-busy className="divide-y divide-slate-100 dark:divide-slate-800">
          {[0, 1, 2].map((i) => (
            <li key={i} className="py-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </li>
          ))}
        </ul>
      ) : error ? (
        <ErrorState message={errorMessage(error, tc("errorDesc"))} onRetry={() => void load()} />
      ) : ctas.length === 0 ? (
        <EmptyState icon={MousePointerClick} title={t("empty")} />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {ctas.map((cta) => (
            <li key={cta.id} className="flex items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{cta.label}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {t(`purpose.${cta.purpose}`)} · {t(`styleOption.${cta.style}`)} ·{" "}
                  <span className="font-mono">{cta.url}</span>
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(cta)}>
                {t("edit")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                onClick={() => void handleDelete(cta)}
              >
                {t("delete")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {confirmDialog}
    </div>
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
  const errorMessage = useApiErrorMessage();
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
    } catch (err) {
      setError(errorMessage(err, t("saveFailed")));
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5"
    >
      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
        {initial ? t("editorTitleEdit") : t("editorTitleNew")}
      </h2>
      <label className="block space-y-1.5">
        <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{t("label")}</span>
        <Input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={100}
          required
          placeholder={t("labelPlaceholder")}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">URL</span>
        <Input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={2048}
          required
          pattern="https?://.*"
          placeholder="https://"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="font-mono"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{t("style")}</span>
          <Select value={style} onChange={(e) => setStyle(e.target.value as CtaStyle)}>
            {STYLE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {t(`styleOption.${s}`)}
              </option>
            ))}
          </Select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{t("intent")}</span>
          <Select value={purpose} onChange={(e) => setPurpose(e.target.value as CtaPurpose)}>
            {PURPOSE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {t(`purpose.${p}`)}
              </option>
            ))}
          </Select>
        </label>
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <Button type="submit" variant="accent" disabled={saving}>
          {saving ? t("saving") : initial ? t("save") : t("create")}
        </Button>
      </div>
    </form>
  );
}
