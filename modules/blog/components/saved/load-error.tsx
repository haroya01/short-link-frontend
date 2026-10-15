"use client";

import { useTranslations } from "next-intl";

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTranslations("savedLibrary");
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-[14px] text-slate-500 dark:text-slate-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring rounded-full px-4 py-2 text-[13px] font-medium text-accent-700 transition-colors hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-500/10"
      >
        {t("retry")}
      </button>
    </div>
  );
}
