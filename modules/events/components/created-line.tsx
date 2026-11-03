"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/common/copy-button";

export function CreatedLine({
  label,
  longUrl,
  shortUrl,
  children,
}: {
  label: string;
  longUrl: string;
  shortUrl: string;
  children: ReactNode;
}) {
  const t = useTranslations("events.share");

  return (
    <li
      data-testid="event-created-line"
      className="relative flex items-center gap-2 py-3"
      style={{ ["--sweep-at" as string]: "160ms" } as React.CSSProperties}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-slate-900 dark:text-slate-100">{label}</span>
        <span className="relative mt-0.5 block">
          <span aria-hidden className="sweep-out absolute inset-0 truncate font-mono text-[13px] text-slate-400 dark:text-slate-500">
            {longUrl.replace(/^https?:\/\//, "")}
          </span>
          <span className="sweep-in block truncate font-mono text-[13px] font-semibold text-accent-700 dark:text-accent-400">
            {shortUrl.replace(/^https?:\/\//, "")}
          </span>
        </span>
      </span>
      <CopyButton size="sm" label={t("copy")} value={shortUrl} />
      {children}
      <span aria-hidden className="sweep-in absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-accent-600 dark:bg-accent-500" />
    </li>
  );
}
