"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";

type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ title, message, onRetry }: Props) {
  const t = useTranslations("common");
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50/40 px-6 py-16 text-center">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle className="h-4 w-4" />
      </div>
      <p className="text-sm font-semibold text-slate-900">{title ?? t("errorTitle")}</p>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
        {message ?? t("errorDesc")}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-6" onClick={onRetry}>
          {t("retry")}
        </Button>
      )}
    </div>
  );
}
