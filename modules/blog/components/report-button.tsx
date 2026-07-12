"use client";

import { useId, useRef, useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDismiss } from "@/hooks/use-dismiss";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { submitAbuseReport, type AbuseSubjectType } from "@/lib/api/abuse-reports";

type Props = {
  subjectType: AbuseSubjectType;
  subjectId: number;
};

/**
 * Quiet "신고" affordance. The trigger is a small muted flag link that can sit inline beside the other
 * post actions (like / bookmark / share); the report form opens as a popover anchored to it, so it never
 * pushes the action row around or leaves the button orphaned on its own line. Anonymous — a failed
 * submit still reads as received (Sentry captures it server-side). Closes on outside-click / Escape.
 */
export function ReportButton({ subjectType, subjectId }: Props) {
  const t = useTranslations("publicPost");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDismiss(open, ref, () => setOpen(false));
  // Contain Tab within the popover + restore focus to the flag trigger on close. The textarea places
  // its own initial focus (autoFocus), so the trap doesn't move it.
  useFocusTrap(dialogRef, { active: open, onEscape: () => setOpen(false), autoFocus: false });

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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="touch-target inline-flex items-center gap-1 rounded text-xs text-slate-500 transition-colors hover:text-slate-600 focus-ring dark:text-slate-500 dark:hover:text-slate-300"
      >
        <Flag className="h-3 w-3" />
        {t("report")}
      </button>

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="absolute bottom-full right-0 z-30 mb-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <h2 id={titleId} className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t("report")}
          </h2>
          {submitted ? (
            <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{t("reportDone")}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                {t("reportReason")}
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  autoFocus
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-accent-400 focus:ring-2 focus:ring-accent-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-accent-500 dark:focus:ring-accent-500/20"
                  placeholder={t("reportPlaceholder")}
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 focus-ring dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {tc("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {submitting ? t("reportSubmitting") : t("reportSubmit")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
