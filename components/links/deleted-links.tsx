"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ApiError, restoreLink } from "@/lib/api";
import { useDeletedLinks } from "@/lib/api/links.queries";
import { dateLocale } from "@/lib/date";
import { useApiErrorMessage } from "@/lib/error-messages";
import { linkDisplayName } from "@/lib/link-library-view";
import { daysUntil } from "@/lib/link-expiry";
import type { DeletedLink } from "@/types";

export function DeletedLinks({ onRestored, onUnavailable }: { onRestored: () => void; onUnavailable: () => void }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const query = useDeletedLinks();
  const [restoring, setRestoring] = useState<ReadonlySet<string>>(new Set());
  const missing = query.error instanceof ApiError && query.error.status === 404;

  useEffect(() => {
    if (missing) onUnavailable();
  }, [missing, onUnavailable]);

  async function restore(item: DeletedLink) {
    setRestoring((prev) => new Set(prev).add(item.shortCode));
    try {
      await restoreLink(item.shortCode);
      toast(t("restored"), "success");
      onRestored();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) onUnavailable();
      toast(errorMessage(err, t("restoreFailed")), "error");
    } finally {
      setRestoring((prev) => {
        const next = new Set(prev);
        next.delete(item.shortCode);
        return next;
      });
    }
  }

  if (query.isPending) return <DeletedSkeleton />;
  if (query.error) return <ErrorState message={t("deletedLoadFailed")} onRetry={() => void query.refetch()} />;

  const items = query.data.pages.flatMap((page) => page.items);
  if (items.length === 0) return <EmptyState title={t("deletedEmpty")} />;

  const when = (iso: string, timeZone?: string) => {
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
    try {
      return new Intl.DateTimeFormat(dateLocale(locale), { ...options, timeZone }).format(new Date(iso));
    } catch {
      return new Intl.DateTimeFormat(dateLocale(locale), options).format(new Date(iso));
    }
  };

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {items.map((item) => (
          <li key={item.shortCode} className="flex items-center gap-3 py-2.5 pl-3 pr-2 sm:px-4">
            <span className="min-w-0 flex-1 py-0.5">
              <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">{linkDisplayName(item)}</span>
              <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-400 sm:text-sm">
                <span className="shrink-0 font-mono">/{item.shortCode}</span>
                <span aria-hidden>·</span>
                <span className="truncate">{t("deletedAt", { when: when(item.deletedAt, item.timezone) })}</span>
              </span>
            </span>
            <span className="shrink-0 whitespace-nowrap text-[13px] tabular-nums text-slate-500 dark:text-slate-400">
              {t("daysLeft", { days: daysUntil(item.purgeAt, { timezone: item.timezone }) })}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={restoring.has(item.shortCode)}
              onClick={() => void restore(item)}
              aria-label={t("restoreLink", { code: item.shortCode })}
            >
              {t("restore")}
            </Button>
          </li>
        ))}
      </ul>
      {query.hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage ? t("loadingMore") : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}

function DeletedSkeleton() {
  return (
    <ul aria-hidden className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-2.5 pl-3 pr-2 sm:px-4">
          <span className="min-w-0 flex-1 py-0.5">
            <span className="flex h-[22px] items-center">
              <Skeleton className="h-3.5 w-32 sm:w-44" />
            </span>
            <span className="mt-0.5 flex h-5 items-center">
              <Skeleton className="h-3 w-40" />
            </span>
          </span>
          <Skeleton className="h-3 w-14 shrink-0" />
          <Skeleton className="h-8 w-20 shrink-0" />
        </li>
      ))}
    </ul>
  );
}
