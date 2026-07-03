"use client";

import { useEffect, useState } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { Lock, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApiError, getAdminLinks } from "@/lib/api";
import { PageControls } from "@/components/admin/page-controls";
import { ErrorState } from "@/components/common/error-state";
import { Section } from "@/components/common/section";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { cn, formatDate, formatNumber, truncateMiddle } from "@/lib/utils";
import type { AdminLinkRow, AdminLinkSort, AdminLinkStatus } from "@/types";

const PAGE_SIZE = 20;
const SORT_OPTIONS: AdminLinkSort[] = ["recent", "clicks"];

// Exported so the admin link-detail page renders the same status badge from one source of truth.
export const STATUS_STYLES: Record<AdminLinkStatus, string> = {
  ACTIVE: "bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300",
  EXPIRED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  LIMIT_REACHED: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
};

export const STATUS_KEY: Record<AdminLinkStatus, string> = {
  ACTIVE: "active",
  EXPIRED: "expired",
  LIMIT_REACHED: "limitReached",
};

export function LinkBrowser() {
  const t = useTranslations("admin");
  const searchParams = useSearchParams();
  const ownerIdParam = searchParams.get("ownerId");
  const ownerId =
    ownerIdParam && Number.isFinite(Number(ownerIdParam)) ? Number(ownerIdParam) : undefined;

  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<AdminLinkSort>("recent");
  const [items, setItems] = useState<AdminLinkRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // A change in the owner filter is a different result set — restart at the first page.
  useEffect(() => {
    setPage(0);
  }, [ownerId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAdminLinks({ q: query || undefined, ownerId, sort, page, size: PAGE_SIZE })
      .then((data) => {
        if (!cancelled) {
          setItems(data.items);
          setTotal(data.total);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          notFound();
        } else {
          setError(err instanceof Error ? err.message : "load failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, ownerId, sort, page, tick]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const initialLoading = loading && items.length === 0;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setQuery(term.trim());
  }

  // A new sort is a different result ordering — restart at the first page.
  function pickSort(next: AdminLinkSort) {
    setPage(0);
    setSort(next);
  }

  return (
    <Section title={t("browse.links.title")} description={t("browse.links.subtitle")}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form onSubmit={submitSearch} className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={t("browse.links.searchPlaceholder")}
              aria-label={t("browse.search")}
              className="pl-9"
            />
          </form>
          <div className="flex gap-1.5">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => pickSort(s)}
                className={cn(
                  "focus-ring rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  sort === s
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                )}
              >
                {t(`browse.links.sort.${s}`)}
              </button>
            ))}
          </div>
          {ownerId != null && (
            <Link
              href="/admin/links"
              className="focus-ring inline-flex items-center gap-1.5 self-start rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-slate-900"
            >
              {t("browse.links.ownerFilter", { id: ownerId })}
              <X className="h-3.5 w-3.5" aria-label={t("browse.links.clearFilter")} />
            </Link>
          )}
        </div>

        {error ? (
          <ErrorState message={error} onRetry={() => setTick((n) => n + 1)} />
        ) : initialLoading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {t("browse.links.noResults")}
          </p>
        ) : (
          <div className={cn("space-y-3 transition-opacity", loading && "opacity-60")}>
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>{t("browse.links.col.code")}</TH>
                    <TH>{t("browse.links.col.destination")}</TH>
                    <TH>{t("browse.links.col.owner")}</TH>
                    <TH className="text-right">{t("browse.links.col.clicks")}</TH>
                    <TH>{t("browse.links.col.status")}</TH>
                    <TH>{t("browse.links.col.created")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {items.map((l) => (
                    <TR key={l.shortCode}>
                      <TD>
                        <span className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/admin/links/${l.shortCode}`}
                            className="font-mono text-sm font-medium text-slate-900 hover:underline dark:text-slate-100"
                          >
                            /{l.shortCode}
                          </Link>
                          {l.passwordProtected && (
                            <Lock
                              className="h-3 w-3 text-slate-400"
                              aria-label={t("browse.links.locked")}
                            />
                          )}
                        </span>
                      </TD>
                      <TD className="max-w-[22rem] text-xs text-slate-500 dark:text-slate-400">
                        <a
                          href={l.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="hover:underline"
                          title={l.originalUrl}
                        >
                          {truncateMiddle(l.originalUrl, 56)}
                        </a>
                      </TD>
                      <TD className="text-xs text-slate-500 dark:text-slate-400">
                        {l.ownerId != null ? (
                          <Link
                            href={`/admin/links?ownerId=${l.ownerId}`}
                            className="text-accent-700 hover:underline dark:text-accent-400"
                          >
                            {l.ownerEmail ?? t("table.anonymous")}
                          </Link>
                        ) : (
                          t("table.anonymous")
                        )}
                      </TD>
                      <TD className="text-right tabular-nums font-medium">
                        {formatNumber(l.clickCount)}
                      </TD>
                      <TD>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            STATUS_STYLES[l.status],
                          )}
                        >
                          {t(`browse.links.status.${STATUS_KEY[l.status]}`)}
                        </span>
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(l.createdAt)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <PageControls page={page} totalPages={totalPages} loading={loading} onPage={setPage} />
            )}
          </div>
        )}
      </div>
    </Section>
  );
}
