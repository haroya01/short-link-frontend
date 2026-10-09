"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useDismiss } from "@/hooks/use-dismiss";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { submitAbuseReport, type AbuseReasonCode, type AbuseSubjectType } from "@/lib/api/abuse-reports";
import { REASON_CODES, reasonLabelKey } from "@/lib/api/abuse-report-reasons";

const HEADER_HEIGHT = 56;

type Props = {
  subjectType: AbuseSubjectType;
  subjectId: number;
  /** Whose content this is — the owner gets no report control. */
  ownerUsername?: string;
  /** A hairline before the trigger, for when it closes a row of other actions. */
  leadingRule?: boolean;
  /** The server a note came from: offers to send it an anonymous copy, off unless chosen. */
  forwardDomain?: string;
  /** Opened from a ⋯ menu instead of the flag: no trigger, the popover anchors to the menu's box. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Quiet "신고" affordance. The trigger is a small muted flag link that can sit inline beside the other
 * post actions (like / bookmark / share); the report form opens as a popover anchored to it, so it never
 * pushes the action row around or leaves the button orphaned on its own line.
 *
 * The reporter picks one of six reasons (the #611 `reasonCode` enum, mirroring the iOS reason set) and
 * may add free-text `detail`. Submit is disabled until a reason is chosen. A failed submit keeps the form
 * open with an error so it can be sent again; success also raises a toast so the confirm isn't lost when
 * the popover closes. Closes on outside-click / Escape.
 */
export function ReportButton({
  subjectType,
  subjectId,
  ownerUsername,
  leadingRule = false,
  forwardDomain,
  open: openProp,
  onOpenChange,
}: Props) {
  const t = useTranslations("publicPost");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const { me } = useAuth();
  const [openState, setOpenState] = useState(false);
  const fromMenu = openProp !== undefined;
  const open = fromMenu ? openProp : openState;
  const setOpen = (next: boolean | ((current: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(open) : next;
    if (fromMenu) onOpenChange?.(value);
    else setOpenState(value);
  };
  const [reasonCode, setReasonCode] = useState<AbuseReasonCode | null>(null);
  const [detail, setDetail] = useState("");
  const [forward, setForward] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [below, setBelow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDismiss(open, ref, () => setOpen(false));
  useLayoutEffect(() => {
    if (!open || !ref.current || !dialogRef.current) return;
    const room = ref.current.getBoundingClientRect().top - HEADER_HEIGHT;
    setBelow(room < dialogRef.current.offsetHeight + 8);
  }, [open]);
  // Contain Tab within the popover + restore focus to the flag trigger on close.
  useFocusTrap(dialogRef, { active: open, onEscape: () => setOpen(false), autoFocus: true });

  function reset() {
    setReasonCode(null);
    setDetail("");
    setForward(false);
    setSubmitted(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || submitted || !reasonCode) return;
    setSubmitting(true);
    try {
      await submitAbuseReport({
        subjectType,
        subjectId,
        reasonCode,
        detail: detail.trim() || undefined,
        forward: forwardDomain ? forward : undefined,
      });
    } catch {
      toast(t("reportFailed"), "error");
      return;
    } finally {
      setSubmitting(false);
    }
    setSubmitted(true);
    toast(t("reportDone"), "success");
    window.setTimeout(() => {
      setOpen(false);
      reset();
    }, 1800);
  }

  if (ownerUsername && me?.username === ownerUsername) return null;

  return (
    <>
      {leadingRule && <span aria-hidden className="h-4 w-px bg-slate-200 dark:bg-slate-700" />}
      <div className={fromMenu ? "pointer-events-none absolute inset-0" : "relative"} ref={ref}>
        {!fromMenu && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="touch-target inline-flex items-center gap-1 rounded text-xs text-slate-500 transition-colors hover:text-slate-600 focus-ring dark:text-slate-400 dark:hover:text-slate-300"
          >
            <Flag className="h-3 w-3" />
            {t("report")}
          </button>
        )}

        {open && (
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "pointer-events-auto absolute right-0 z-30 w-72 rounded-surface border border-slate-200 bg-white p-4 shadow-float dark:border-slate-700 dark:bg-slate-850",
              below ? "top-full mt-2" : "bottom-full mb-2",
            )}
          >
            <h2 id={titleId} className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t(subjectType === "NOTE" ? "reportTitleNote" : "reportTitle")}
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
                      className="flex cursor-pointer items-center gap-2 rounded-surface px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60 has-[:checked]:bg-slate-100 dark:has-[:checked]:bg-slate-800"
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={code}
                        checked={reasonCode === code}
                        onChange={() => setReasonCode(code)}
                        className="h-3.5 w-3.5"
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
                    className="mt-1 block w-full rounded-surface border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-accent-400 focus:ring-2 focus:ring-accent-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-accent-500 dark:focus:ring-accent-500/20"
                    placeholder={t("reportPlaceholder")}
                  />
                </label>
                {forwardDomain && (
                  <label className="flex items-start gap-2 text-[13px] text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={forward}
                      onChange={(e) => setForward(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5"
                    />
                    <span>
                      {t("reportForward", { domain: forwardDomain })}
                      <span className="block text-[12px] text-slate-500 dark:text-slate-400">{t("reportForwardHint")}</span>
                    </span>
                  </label>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-surface px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 focus-ring dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {tc("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !reasonCode}
                    className="inline-flex items-center gap-1.5 rounded-surface bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50"
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
    </>
  );
}
