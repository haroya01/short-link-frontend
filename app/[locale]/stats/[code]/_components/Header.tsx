import { ExternalLink } from "lucide-react";
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

/** Top-of-page card showing the short URL, copy/QR/public-stats controls, and a link out. */
export function Header({ data, shortUrl, shortCodeLabel, onCopy }: Props) {
  const display = shortUrl || `/${data.shortCode}`;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <a
          href={display}
          target="_blank"
          rel="noreferrer"
          aria-label={shortCodeLabel}
          className="group block truncate font-mono text-lg font-semibold text-slate-900 hover:text-accent-700 hover:underline"
        >
          /{data.shortCode}
        </a>
        <a
          href={display}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-slate-500 hover:text-slate-900 hover:underline"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate">{display}</span>
        </a>
      </div>
      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
        <PublicStatsToggle shortCode={data.shortCode} />
        <div className="flex items-center gap-1">
          <CopyButton variant="outline" size="sm" value={display} onCopied={onCopy} />
          <QrButton value={display} filename={`${data.shortCode}.png`} />
        </div>
      </div>
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-2 h-6 w-48" />
      <Skeleton className="mt-2 h-3 w-72" />
    </div>
  );
}
