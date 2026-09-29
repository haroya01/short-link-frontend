"use client";

import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  /** Phone-frame preview rendered inside the sheet. */
  children: React.ReactNode;
};

/**
 * Mobile-only floating button that opens a full-screen sheet showing the profile preview.
 * Hidden on lg+ where the preview is already a sticky aside next to the editor. Closes on
 * Escape, backdrop click, or the X button. Body scroll is locked while open so the editor
 * underneath doesn't bleed scroll-momentum into the sheet.
 */
export function MobilePreviewSheet({ children }: Props) {
  const t = useTranslations("settings.profile");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("previewTitle")}
        className="focus-ring fixed bottom-[var(--fab-bottom,1.25rem)] right-5 z-30 inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 lg:hidden dark:hover:bg-slate-800"
      >
        <Eye aria-hidden className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        {t("previewTitle")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 scrim"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] animate-fade-in overflow-y-auto rounded-t-2xl bg-white shadow-modal dark:bg-slate-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:bg-slate-900 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("previewTitle")}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closePreview")}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 pb-12 pt-5">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
