"use client";

import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/common/copy-button";

export function CreatedLine({ longUrl, shortUrl }: { longUrl: string; shortUrl: string }) {
  const t = useTranslations("events.detail");
  const display = shortUrl.replace(/^https?:\/\//, "");

  return (
    <div data-testid="event-created-line" className="relative mb-8" style={{ ["--sweep-at" as string]: "120ms" } as React.CSSProperties}>
      <span aria-hidden className="sweep-out pointer-events-none absolute inset-x-0 bottom-0 flex items-end pb-3">
        <span className="truncate font-mono text-[16px] font-medium text-slate-400 dark:text-slate-500">
          {longUrl.replace(/^https?:\/\//, "")}
        </span>
      </span>
      <div className="sweep-in relative flex items-end gap-4 pb-2.5">
        <a href={shortUrl} target="_blank" rel="noreferrer" className="focus-ring min-w-0 flex-1 rounded-sm">
          <span className="block truncate font-mono text-[21px] font-bold tracking-tight text-accent-700 dark:text-accent-400 sm:text-[24px]">
            {display}
          </span>
        </a>
        <CopyButton size="sm" variant="accent" label={t("heroCopy")} value={shortUrl} />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-accent-600 dark:bg-accent-500" />
      </div>
    </div>
  );
}
