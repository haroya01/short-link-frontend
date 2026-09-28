"use client";

import { useEffect, useState, type ComponentType } from "react";
import { ArrowRight, ExternalLink, Pencil, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { CopyButton } from "@/components/common/copy-button";
import { ShareButton } from "@/components/common/share-button";
import { QrButton } from "@/components/links/qr/button";
import { Sparkline } from "@/components/links/stats/sparkline";
import { Link } from "@/i18n/navigation";
import { cn, formatNumber } from "@/lib/utils";

export type SheetLink = {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  name?: string;
  /** Human clicks per day, oldest → today (owner's timezone). */
  clicksLast7d?: number[];
  total?: number;
};

type Actions = {
  favorite?: boolean;
  favoriteDisabled?: boolean;
  onToggleFavorite?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

/**
 * The phone's way into one link: its numbers at a glance, then copy · share · QR in the thumb
 * zone, then the full stats page. `created` is the same sheet right after shortening.
 */
export function LinkSheet({
  link,
  created = false,
  onClose,
  actions,
}: {
  link: SheetLink | null;
  created?: boolean;
  onClose: () => void;
  actions?: Actions;
}) {
  const t = useTranslations("linkSheet");
  const [shown, setShown] = useState<SheetLink | null>(link);
  useEffect(() => {
    if (link) setShown(link);
  }, [link]);

  const series = shown?.clicksLast7d ?? null;
  const today = series ? series[series.length - 1] ?? 0 : 0;
  const week = series ? series.reduce((a, b) => a + b, 0) : 0;

  return (
    <BottomSheet open={link !== null} onClose={onClose} label={shown?.name ?? shown?.shortUrl ?? ""}>
      {shown && (
        <div className="space-y-5 pb-1">
          <div className="min-w-0">
            {created && (
              <p className="mb-1 text-[13px] font-medium text-accent-700 dark:text-accent-400">{t("created")}</p>
            )}
            {shown.name && (
              <p className="truncate text-[17px] font-semibold text-slate-900 dark:text-slate-100">{shown.name}</p>
            )}
            <p className="mt-1 truncate font-mono text-[15px] font-semibold text-accent-700 dark:text-accent-400">
              {shown.shortUrl.replace(/^https?:\/\//, "")}
            </p>
            <p className="mt-0.5 truncate text-[13px] text-slate-500 dark:text-slate-400" title={shown.originalUrl}>
              {shown.originalUrl}
            </p>
          </div>

          {series && (
            <div className="flex items-end justify-between gap-4 border-y border-slate-100 py-3 dark:border-slate-800">
              <dl className="flex gap-6">
                <Figure label={t("today")} value={today} />
                <Figure label={t("week")} value={week} />
                {shown.total !== undefined && <Figure label={t("total")} value={shown.total} />}
              </dl>
              <Sparkline values={series} width={80} height={32} className="shrink-0 text-accent-600 dark:text-accent-400" />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="[&>button]:w-full">
              <CopyButton size="lg" variant="accent" label={t("copy")} value={shown.shortUrl} />
            </div>
            <div className="[&>button]:w-full">
              <ShareButton url={shown.shortUrl} title={shown.name ?? shown.shortUrl} variant="outline" size="lg" />
            </div>
            <QrButton url={shown.shortUrl} size="lg" />
          </div>

          <Link
            href={`/stats/${shown.shortCode}`}
            className="focus-ring flex min-h-11 items-center justify-between rounded-lg text-[15px] font-medium text-slate-900 dark:text-slate-100"
          >
            {t("openStats")}
            <ArrowRight aria-hidden className="h-4 w-4 text-slate-400" />
          </Link>

          {actions && (
            <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
              {actions.onToggleFavorite && (
                <SheetRow
                  icon={Star}
                  label={actions.favorite ? t("unfavorite") : t("favorite")}
                  disabled={actions.favoriteDisabled}
                  onSelect={actions.onToggleFavorite}
                />
              )}
              <SheetRow icon={ExternalLink} label={t("openOriginal")} href={shown.originalUrl} />
              {actions.onEdit && <SheetRow icon={Pencil} label={t("edit")} onSelect={actions.onEdit} />}
              {actions.onDelete && <SheetRow icon={Trash2} label={t("delete")} destructive onSelect={actions.onDelete} />}
            </ul>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[12px] text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-[20px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {formatNumber(value)}
      </dd>
    </div>
  );
}

function SheetRow({
  icon: Icon,
  label,
  href,
  onSelect,
  destructive,
  disabled,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const cls = cn(
    "focus-ring flex min-h-12 w-full items-center gap-3 rounded-md text-left text-[15px] disabled:opacity-50",
    destructive ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200",
  );
  const body = (
    <>
      <Icon className={cn("h-4 w-4 shrink-0", destructive ? "" : "text-slate-500 dark:text-slate-400")} />
      {label}
    </>
  );
  return (
    <li>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className={cls}>
          {body}
        </a>
      ) : (
        <button type="button" onClick={onSelect} disabled={disabled} className={cls}>
          {body}
        </button>
      )}
    </li>
  );
}
