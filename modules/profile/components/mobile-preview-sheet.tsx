"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  children: React.ReactNode;
};

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
        className="focus-ring inline-flex min-h-11 shrink-0 items-center rounded-full border border-slate-200 px-4 text-[14px] font-medium text-slate-600 transition-colors duration-200 ease-[var(--ease)] hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100 lg:hidden"
      >
        {t("previewTitle")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-labelledby="profile-preview-title">
          <div
            className="absolute inset-0 scrim"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[92dvh] animate-[sheet-up_280ms_var(--ease)_both] overflow-y-auto rounded-t-2xl bg-white shadow-modal motion-reduce:animate-none dark:bg-slate-850">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:bg-slate-850 dark:border-slate-800">
              <h2 id="profile-preview-title" className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("previewTitle")}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closePreview")}
                className="focus-ring -mr-2 grid h-11 w-11 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="pb-[env(safe-area-inset-bottom)]">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
