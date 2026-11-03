"use client";

import { useTranslations } from "next-intl";

type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ title, message, onRetry }: Props) {
  const t = useTranslations("common");
  return (
    <div data-testid="error-state" className="py-8">
      <p className="text-[15px] font-medium text-slate-900 dark:text-slate-100">{title ?? message ?? t("errorTitle")}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="touch-target focus-ring -mx-1 mt-1.5 rounded-md px-1 py-0.5 text-[15px] font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 dark:text-slate-100 dark:decoration-slate-600 dark:hover:decoration-slate-100"
        >
          {t("retry")}
        </button>
      )}
    </div>
  );
}
