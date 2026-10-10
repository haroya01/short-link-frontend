"use client";

import { useEffect, useRef, useState } from "react";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { TranslationState } from "@/modules/translation/lib/use-in-place-translation";

export function languageName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

const action =
  "focus-ring rounded font-medium text-slate-600 transition-colors hover:text-accent-700 dark:text-slate-300 dark:hover:text-accent-400";

export function TranslateLine({
  source,
  state,
  progress,
  onTranslate,
  onShowOriginal,
  writtenIn = false,
  className,
}: {
  source: string;
  state: TranslationState;
  progress: number | null;
  onTranslate: () => void;
  onShowOriginal: () => void;
  writtenIn?: boolean;
  className?: string;
}) {
  const t = useTranslations("translation");
  const locale = useLocale();
  const language = languageName(source, locale);
  const [announce, setAnnounce] = useState("");
  const previous = useRef(state);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (previous.current === state) return;
    if (state === "done") setAnnounce(t("showingTranslation"));
    else if (state === "idle" && previous.current === "done") setAnnounce(t("showingOriginal"));
    previous.current = state;
    if (state !== "busy" && document.activeElement === document.body) button.current?.focus();
  }, [state, t]);

  return (
    <div
      data-translate-line
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-slate-500 dark:text-slate-400",
        className,
      )}
    >
      <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {state === "busy" ? (
        <>
          <span role="status">{t("translating")}</span>
          <span
            role="progressbar"
            aria-label={t("translating")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress === null ? undefined : Math.round(progress * 100)}
            className="relative h-1 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          >
            <span
              className={cn(
                "absolute inset-y-0 left-0 rounded-full bg-accent-600 dark:bg-accent-500",
                progress === null
                  ? "w-full animate-pulse motion-reduce:animate-none"
                  : "transition-[width] duration-300 ease-out motion-reduce:transition-none",
              )}
              style={progress === null ? undefined : { width: `${Math.max(4, progress * 100)}%` }}
            />
          </span>
        </>
      ) : state === "done" ? (
        <>
          <span>{t("translatedFrom", { language })}</span>
          <span aria-hidden>·</span>
          <button ref={button} type="button" onClick={onShowOriginal} className={action}>
            {t("showOriginal")}
          </button>
        </>
      ) : (
        <>
          {writtenIn && (
            <>
              <span>{t("writtenIn", { language })}</span>
              <span aria-hidden>·</span>
            </>
          )}
          <button ref={button} type="button" onClick={onTranslate} className={action}>
            {t("translate")}
          </button>
        </>
      )}
      <span aria-live="polite" className="sr-only">
        {announce}
      </span>
    </div>
  );
}
