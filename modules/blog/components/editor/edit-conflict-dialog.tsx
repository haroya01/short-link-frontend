"use client";

import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/use-focus-trap";

/**
 * Another device saved this post while it was being edited here. The writer picks which version stays;
 * Escape and the backdrop don't decide for them, since either answer replaces something.
 */
export function EditConflictDialog({
  open,
  onLoadLatest,
  onOverwrite,
}: {
  open: boolean;
  onLoadLatest: () => Promise<void>;
  onOverwrite: () => Promise<unknown>;
}) {
  const t = useTranslations("postEditor");
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const [busy, setBusy] = useState(false);
  useFocusTrap(panel, { active: open, autoFocus: true });

  if (!open) return null;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 pt-12 sm:pt-16">
      <div aria-hidden className="fixed inset-0 scrim animate-fade-in" />
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        className="relative mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-modal animate-fade-in dark:border-slate-800 dark:bg-slate-850"
      >
        <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {t("editConflictTitle")}
        </h2>
        <p id={bodyId} className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {t("editConflictBody")}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={busy} onClick={() => void run(onLoadLatest)}>
            {t("editConflictLoadLatest")}
          </Button>
          <Button disabled={busy} onClick={() => void run(onOverwrite)}>
            {t("editConflictOverwrite")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
