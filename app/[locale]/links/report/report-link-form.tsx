"use client";

import { useId, useState } from "react";
import { CheckCircle2, Link2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { LINK_REASON_CODES, reasonLabelKey } from "@/lib/api/abuse-report-reasons";
import { submitLinkAbuseReport, type AbuseReasonCode } from "@/lib/api/abuse-reports";
import { shortCodeOf } from "@/lib/link-reference";

type Props = {
  initialLink: string;
  initialReason: AbuseReasonCode | null;
};

export function ReportLinkForm({ initialLink, initialReason }: Props) {
  const t = useTranslations("linkReport");
  const linkId = useId();
  const linkNoteId = useId();
  const detailId = useId();
  const [link, setLink] = useState(initialLink);
  const [linkTouched, setLinkTouched] = useState(initialLink.length > 0);
  const [reasonCode, setReasonCode] = useState<AbuseReasonCode | null>(initialReason);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const code = shortCodeOf(link);
  const linkInvalid = linkTouched && link.trim().length > 0 && code == null;

  function messageFor(e: unknown): string {
    if (e instanceof ApiError) {
      if (e.detail.code === "SUBJECT_NOT_FOUND") return t("errors.notFound");
      if (e.detail.code === "DUPLICATE_REPORT") return t("errors.duplicate");
      if (e.status === 429) return t("errors.rateLimited");
    }
    return t("errors.failed");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLinkTouched(true);
    if (submitting || !code || !reasonCode) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitLinkAbuseReport({
        link: link.trim(),
        reasonCode,
        detail: detail.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setLink("");
    setLinkTouched(false);
    setReasonCode(null);
    setDetail("");
    setError(null);
    setDone(false);
  }

  if (done) {
    return (
      <div
        role="status"
        className="animate-fade-in space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <p className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
          <CheckCircle2 aria-hidden className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          {t("doneTitle")}
        </p>
        <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{t("doneBody")}</p>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          {t("another")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      <div className="space-y-2">
        <label htmlFor={linkId} className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          {t("linkLabel")}
        </label>
        <Input
          id={linkId}
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            setError(null);
          }}
          onBlur={() => setLinkTouched(true)}
          placeholder="kurl.me/abc123"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={2048}
          aria-invalid={linkInvalid || undefined}
          aria-describedby={linkNoteId}
        />
        <p id={linkNoteId} className="min-h-5 text-[13px] leading-5">
          {code ? (
            <span key={code} className="inline-flex animate-fade-in items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Link2 aria-hidden className="h-3.5 w-3.5 shrink-0" />
              {t.rich("linkParsed", {
                code,
                mono: (chunks) => (
                  <span className="font-mono text-slate-900 dark:text-slate-100">{chunks}</span>
                ),
              })}
            </span>
          ) : linkInvalid ? (
            <span className="text-red-600 dark:text-red-400">{t("linkInvalid")}</span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">{t("linkHint")}</span>
          )}
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-3 block text-sm font-medium text-slate-900 dark:text-slate-100">
          {t("reasonLegend")}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {LINK_REASON_CODES.map((reason) => (
            <label
              key={reason}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-600 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:has-[:checked]:border-slate-200 dark:has-[:checked]:bg-slate-800"
            >
              <input
                type="radio"
                name="reasonCode"
                value={reason}
                checked={reasonCode === reason}
                onChange={() => setReasonCode(reason)}
                className="h-3.5 w-3.5 focus:outline-none"
              />
              {t(reasonLabelKey(reason))}
            </label>
          ))}
        </div>
        <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{t("appealNote")}</p>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor={detailId} className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          {t("detailLabel")}
        </label>
        <Textarea
          id={detailId}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder={t("detailPlaceholder")}
        />
      </div>

      <div className="space-y-3">
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <Button type="submit" variant="destructive" disabled={submitting || !code || !reasonCode}>
          {submitting && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
