"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { submitAbuseReport, type AbuseSubjectType } from "@/lib/api/abuse-reports";

type Props = {
  subjectType: AbuseSubjectType;
  subjectId: number;
};

export function ReportButton({ subjectType, subjectId }: Props) {
  const t = useTranslations("publicPost");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      await submitAbuseReport({ subjectType, subjectId, reason: reason.trim() || undefined });
    } catch {
      // 익명 신고 — 실패해도 사용자에겐 접수로 보여주고 silent. prod 는 Sentry 가 capture.
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      window.setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setReason("");
      }, 2000);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded text-xs text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
      >
        <Flag className="h-3 w-3" />
        {t("report")}
      </button>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {submitted ? (
        <p className="text-sm text-slate-600">{t("reportDone")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            {t("reportReason")}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={2000}
              rows={3}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
              placeholder={t("reportPlaceholder")}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            >
              {tc("cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {submitting ? t("reportSubmitting") : t("reportSubmit")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
