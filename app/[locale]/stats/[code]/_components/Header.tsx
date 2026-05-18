import { ExternalLink, Link2 } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { PublicStatsToggle } from "@/components/public-stats-toggle";
import { QrButton } from "@/components/qr-button";
import { Skeleton } from "@/components/ui/skeleton";
import type { LinkStats } from "@/types";

type Props = {
  data: LinkStats;
  shortUrl: string;
  shortCodeLabel: string;
  onCopy: () => void;
};

/**
 * Stats hero card. Distinct from the body sections: an accent eyebrow + an oversized URL serves
 * as the typographic anchor so the page has a clear "this is the link you're looking at" landing
 * pad before the dense KPI grid. The ambient {@code from-accent-50/40} bleed is restrained —
 * dominant luxury / refined direction (vault decision 2026-05-18), accent appears as a hairline
 * of brand identity rather than competing with the data.
 */
export function Header({ data, shortUrl, shortCodeLabel, onCopy }: Props) {
  const display = shortUrl || `/${data.shortCode}`;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-300/40 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-accent-200/20 blur-3xl"
      />
      <div className="relative flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-700">
            <Link2 className="h-3 w-3" />
            {shortCodeLabel}
          </p>
          <a
            href={display}
            target="_blank"
            rel="noreferrer"
            aria-label={shortCodeLabel}
            className="group mt-2 block truncate font-mono text-2xl font-bold leading-none tracking-tight text-slate-900 transition-colors hover:text-accent-700"
          >
            /{data.shortCode}
          </a>
          <a
            href={display}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate rounded-lg bg-slate-50 px-2 py-1 text-[12px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate font-mono">{display}</span>
          </a>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <PublicStatsToggle shortCode={data.shortCode} />
          <div className="flex items-center gap-1.5">
            <CopyButton variant="outline" size="sm" value={display} onCopied={onCopy} />
            <QrButton value={display} filename={`${data.shortCode}.png`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-7 w-56" />
      <Skeleton className="mt-3 h-4 w-72" />
    </div>
  );
}
