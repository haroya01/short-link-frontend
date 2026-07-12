"use client";

import { useId, useRef, useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDismiss } from "@/hooks/use-dismiss";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useToast } from "@/components/ui/toast";
import { submitAbuseReport, type AbuseReasonCode, type AbuseSubjectType } from "@/lib/api/abuse-reports";
import { REASON_CODES, reasonLabelKey } from "@/lib/api/abuse-report-reasons";

type Props = {
  subjectType: AbuseSubjectType;
  subjectId: number;
};

/**
 * Quiet "신고" affordance. The trigger is a small muted flag link that can sit inline beside the other
 * post actions (like / bookmark / share); the report form opens as a popover anchored to it, so it never
 * pushes the action row around or leaves the button orphaned on its own line.
 *
 * The reporter picks one of six reasons (the #611 `reasonCode` enum, mirroring the iOS reason set) and
 * may add free-text `detail`. Submit is disabled until a reason is chosen. Anonymous — a failed submit
 * still reads as received (Sentry captures it server-side); success also raises a toast so the confirm
 * isn't lost when the popover closes. Closes on outside-click / Escape.
 */
export function ReportButton({ subjectType, subjectId }: Props) {
  const t = useTranslations("publicPost");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<AbuseReasonCode | null>(null);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDismiss(open, ref, () => setOpen(false));
  // Contain Tab within the popover + restore focus to the flag trigger on close.
  useFocusTrap(dialogRef, { active: open, onEscape: () => setOpen(false), autoFocus: true });

  function reset() {
    setReasonCode(null);
    setDetail("");
    setSubmitted(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || submitted || !reasonCode) return;
    setSubmitting(true);
    try {
      await submitAbuseReport({ subjectType, subjectId, reasonCode, detail: detail.trim() || undefined });
    } catch {
      // 익명 신고 — 실패해도 사용자에겐 접수로 보여주고 silent. prod 는 Sentry 가 capture.
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      toast(t("reportDone"), "success");
      window.setTimeout(() => {
        setOpen(false);
        reset();
      }, 1800);
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
          <h2 id={titleId} className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t("reportTitle")}
          </h2>
          {submitted ? (
            <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{t("reportDone")}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <fieldset className="space-y-1.5">
                <legend className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t("reportReason")}
                </legend>
                {REASON_CODES.map((code) => (
                  <label
                    key={code}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60 has-[:checked]:bg-slate-100 dark:has-[:checked]:bg-slate-800"
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={code}
                      checked={reasonCode === code}
                      onChange={() => setReasonCode(code)}
                      className="h-3.5 w-3.5 accent-red-600"
                    />
                    {t(reasonLabelKey(code))}
                  </label>
                ))}
              </fieldset>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="sr-only">{t("reportDetail")}</span>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  maxLength={2000}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-accent-400 focus:ring-2 focus:ring-accent-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-accent-500 dark:focus:ring-accent-500/20"
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
                  disabled={submitting || !reasonCode}
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
