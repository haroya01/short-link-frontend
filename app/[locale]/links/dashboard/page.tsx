"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  BarChart3,
  Clock3,
  FileUp,
  Link2,
  MousePointerClick,
  Plus,
  QrCode,
  Search,
  Star,
  TrendingUp,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import type { MyLinksFilters } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import { readStorageString, removeStorageItem } from "@/lib/storage-json";
import { pinFavoritesFirst, useLinkFavorites } from "@/lib/use-link-favorites";
import type { MyLink } from "@/types";
import {
  useInvalidateLinks,
  useMyLinks,
  useTags,
} from "@/lib/api/links.queries";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { LinksTable } from "@/components/links/table";
import { BulkImportDialog } from "@/components/links/bulk-import-dialog";
import { MyLinksFiltersBar } from "@/components/links/my-links-filters";
import { WeeklyInsightsCard } from "@/components/links/stats/weekly-insights-card";
import { ExpiringSoonBanner } from "@/components/links/expiring-soon-banner";
import { CampaignsEntryCard } from "@/components/links/campaigns/entry-card";
import { LinksAuthGate } from "@/components/links/auth-gate";
import { DashboardOnboarding } from "@/components/common/dashboard-onboarding";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { useToast } from "@/components/ui/toast";
import { CopyButton } from "@/components/common/copy-button";

export default function DashboardPage() {
  const { authenticated, ready, me } = useAuth();
  const t = useTranslations("dashboard");
  const tAuth = useTranslations("auth");
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<MyLinksFilters>({
    size: 50,
    sort: "createdAt",
    dir: "desc",
  });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const favorites = useLinkFavorites();

  const enabled = ready && authenticated;
  const linksQuery = useMyLinks(filters, { enabled });
  const tagsQuery = useTags({ enabled });
  const invalidateLinks = useInvalidateLinks();

  const items = useMemo(
    () => linksQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [linksQuery.data],
  );
  // 즐겨찾기를 맨 위로 고정(그 외 서버 정렬은 보존). 서버 페이지네이션이라 고정·필터는 현재
  // 로드된 페이지 범위 안에서만 동작한다.
  const displayItems = useMemo(() => {
    const pinned = pinFavoritesFirst(items, favorites.codes, (l) => l.shortCode);
    return favoritesOnly ? pinned.filter((l) => favorites.codes.has(l.shortCode)) : pinned;
  }, [items, favorites.codes, favoritesOnly]);
  const tagOptions = useMemo(
    () => tagsQuery.data?.map((t) => t.name) ?? [],
    [tagsQuery.data],
  );
  const loading = !ready || linksQuery.isLoading;
  const error = linksQuery.error
    ? linksQuery.error instanceof Error
      ? linksQuery.error.message
      : "load failed"
    : null;
  const ops = useMemo(() => buildDashboardOps(items), [items]);

  // A search or filter is narrowing the list — the zero-result state then means "nothing matched",
  // not "no links yet", so we keep the search + filter chrome up (so it can be cleared).
  const hasActiveFilter =
    Boolean(query.trim()) ||
    Boolean(filters.q) ||
    Boolean(filters.tag) ||
    Boolean(filters.domain) ||
    Boolean(filters.expiry) ||
    Boolean(filters.createdAfter) ||
    Boolean(filters.createdBefore);
  // First run = a signed-in user who has no links at all and isn't filtering. The whole dashboard
  // collapses to the onboarding panel; the ops/insights/campaign chrome and the search + filter bar
  // only earn their place once there's data to act on (otherwise it reads as an empty SaaS shell).
  const firstRun = !loading && !error && items.length === 0 && !hasActiveFilter;

  // Debounce the search box into the server-side `q` filter so the user doesn't have to wait for
  // each keystroke to round-trip and the query covers the full link set, not just the first page.
  useEffect(() => {
    const id = setTimeout(() => {
      setFilters((f) => {
        const trimmed = query.trim() || undefined;
        if (f.q === trimmed) return f;
        return { ...f, q: trimmed, after: undefined };
      });
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  // Welcome toast set by /auth/callback after a successful sign-in. Read once and clear so the
  // toast only fires on the post-OAuth landing — page reloads or in-app navigation stay silent.
  useEffect(() => {
    if (!ready || !authenticated) return;
    if (readStorageString("kurl:just-signed-in", { session: true }) !== "1") return;
    removeStorageItem("kurl:just-signed-in", { session: true });
    const email = me?.email;
    toast(email ? tAuth("signedInWith", { email }) : tAuth("signedIn"), "success");
  }, [ready, authenticated, me, toast, tAuth]);

  const handleLoadMore = () => {
    void linksQuery.fetchNextPage();
  };

  if (ready && !authenticated) {
    return (
      <LinksAuthGate
        eyebrow="dashboard"
        title={t("loginRequired")}
        description={t("loginRequiredDesc")}
        benefits={[
          { icon: Link2, label: t("loginRequiredBenefits.links") },
          { icon: BarChart3, label: t("loginRequiredBenefits.stats") },
          { icon: QrCode, label: t("loginRequiredBenefits.campaigns") },
        ]}
        next="/dashboard"
      />
    );
  }

  return (
    <div className="container max-w-5xl space-y-5 py-10">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("subtitle", { count: items.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <FileUp className="h-4 w-4" /> {t("bulkImport.button")}
          </Button>
          <Link href="/">
            <Button variant="accent">
              <Plus className="h-4 w-4" /> {t("newLink")}
            </Button>
          </Link>
        </div>
      </div>

      <BulkImportDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onImported={() => void invalidateLinks()}
      />

      {firstRun ? (
        // No links yet, no filter → a single clear next step. The stats, campaign card, weekly
        // insights, search and filters would all be empty shells here, so they wait for real data.
        <DashboardOnboarding />
      ) : (
        <>
          {loading ? (
            <DashboardOpsSkeleton />
          ) : items.length > 0 ? (
            <DashboardOpsPanel ops={ops} />
          ) : null}

          <CampaignsEntryCard />

          <ExpiringSoonBanner
            onShowAll={() =>
              setFilters((f) => ({ ...f, expiry: "EXPIRING_SOON", after: undefined }))
            }
          />

          <WeeklyInsightsCard />

          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9 pr-9"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("clearSearch")}
                  className="focus-ring absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <MyLinksFiltersBar filters={filters} onChange={setFilters} tagOptions={tagOptions} />

            {(favorites.hasAny || favoritesOnly) && (
              <button
                type="button"
                aria-pressed={favoritesOnly}
                onClick={() => setFavoritesOnly((v) => !v)}
                className={cn(
                  "focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                  favoritesOnly
                    ? "border-accent-200 bg-accent-50 text-accent-700 dark:border-accent-500/30 dark:bg-accent-500/10 dark:text-accent-400"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/50",
                )}
              >
                <Star className={cn("h-3.5 w-3.5", favoritesOnly && "fill-current")} />
                {t("favorite.filter")}
              </button>
            )}
          </div>

          {loading ? (
            <LoadingTable t={t} />
          ) : error ? (
            <ErrorState message={error} onRetry={() => void linksQuery.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              title={t("noResultTitle")}
              // With a search term the message quotes it; when only filters (tag/domain/expiry/date)
              // are narrowing the list, the query is empty — use the query-less variant so the copy
              // never reads 'matching ""'.
              description={
                query.trim()
                  ? t("noResultDesc", { query })
                  : t("noResultDescFiltered")
              }
            />
          ) : displayItems.length === 0 ? (
            // 즐겨찾기만 필터가 켜졌지만 현재 페이지에 별표 링크가 없는 경우.
            <EmptyState
              title={t("favorite.emptyTitle")}
              description={t("favorite.emptyDesc")}
            />
          ) : (
            <>
              <LinksTable
                items={displayItems}
                sortKey={filters.sort ?? "createdAt"}
                sortDir={filters.dir ?? "desc"}
                onSortChange={(sort, dir) =>
                  setFilters((f) => ({ ...f, sort, dir, after: undefined }))
                }
                onChanged={() => void invalidateLinks()}
                onTagClick={(tag) => setFilters((f) => ({ ...f, tag, after: undefined }))}
                isFavorite={favorites.isFavorite}
                onToggleFavorite={favorites.toggle}
              />
              {linksQuery.hasNextPage && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={linksQuery.isFetchingNextPage}
                  >
                    {linksQuery.isFetchingNextPage ? t("loadingMore") : t("loadMore")}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

type DashboardOps = {
  totalClicks: number;
  clicks7d: number;
  zeroClickLinks: number;
  expiringLinks: number;
  /** 내 클릭의 중앙값 — "나에게 히트인가"의 기준선(전역 순위 아님). */
  medianClicks: number;
  topLink: {
    shortCode: string;
    shortUrl: string;
    originalUrl: string;
    clickCount: number;
    clicks7d: number;
  } | null;
};

function buildDashboardOps(items: MyLink[]): DashboardOps {
  const now = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  let totalClicks = 0;
  let clicks7d = 0;
  let zeroClickLinks = 0;
  let expiringLinks = 0;
  let topLink: DashboardOps["topLink"] = null;

  for (const item of items) {
    const weekClicks = (item.clicksLast7d ?? []).reduce((sum, n) => sum + n, 0);
    totalClicks += item.clickCount;
    clicks7d += weekClicks;
    if (item.clickCount === 0) zeroClickLinks += 1;
    if (item.expiresAt) {
      const expires = +new Date(item.expiresAt);
      if (Number.isFinite(expires) && expires >= now && expires - now <= threeDays) {
        expiringLinks += 1;
      }
    }
    if (
      !topLink ||
      item.clickCount > topLink.clickCount ||
      (item.clickCount === topLink.clickCount && weekClicks > topLink.clicks7d)
    ) {
      topLink = {
        shortCode: item.shortCode,
        shortUrl: item.shortUrl,
        originalUrl: item.originalUrl,
        clickCount: item.clickCount,
        clicks7d: weekClicks,
      };
    }
  }

  // 자기상대 벤치마크 — 내 링크 클릭의 중앙값(전역 리더보드 X, 허영 대신 "나에게 히트인가").
  const counts = items.map((i) => i.clickCount).sort((a, b) => a - b);
  const medianClicks = counts.length
    ? counts.length % 2 === 1
      ? counts[(counts.length - 1) / 2]
      : (counts[counts.length / 2 - 1] + counts[counts.length / 2]) / 2
    : 0;

  return { totalClicks, clicks7d, zeroClickLinks, expiringLinks, medianClicks, topLink };
}

function DashboardOpsPanel({ ops }: { ops: DashboardOps }) {
  const t = useTranslations("dashboard.ops");
  const topLink = ops.topLink;

  return (
    <section className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <OpsMetric
          icon={MousePointerClick}
          label={t("totalClicks")}
          value={formatNumber(ops.totalClicks)}
          hint={t("totalClicksHint")}
        />
        <OpsMetric
          icon={TrendingUp}
          label={t("weekClicks")}
          value={formatNumber(ops.clicks7d)}
          hint={t("weekClicksHint")}
        />
        <OpsMetric
          icon={Link2}
          label={t("zeroClick")}
          value={formatNumber(ops.zeroClickLinks)}
          hint={ops.zeroClickLinks > 0 ? t("zeroClickReview") : t("zeroClickClear")}
        />
        <OpsMetric
          icon={Clock3}
          label={t("expiring")}
          value={formatNumber(ops.expiringLinks)}
          hint={ops.expiringLinks > 0 ? t("expiringReview") : t("expiringClear")}
        />
      </div>

      <div className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex h-full min-w-0 flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <p className="text-[12px] font-semibold leading-snug text-accent-700 dark:text-accent-400">
                {t("topLink")}
              </p>
              {topLink && ops.medianClicks > 0 && topLink.clickCount / ops.medianClicks >= 2 && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-accent-50 dark:bg-accent-500/10 px-2 py-0.5 text-[11px] font-semibold text-accent-700 dark:text-accent-400">
                  {t("vsMedian", { multiple: (topLink.clickCount / ops.medianClicks).toFixed(1) })}
                </span>
              )}
            </div>
            {topLink && (
              <div className="inline-flex shrink-0 items-baseline gap-1 rounded-full bg-accent-50 dark:bg-accent-500/10 px-2.5 py-1 text-accent-700 dark:text-accent-400">
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {formatNumber(topLink.clickCount)}
                </span>
                <span className="text-[11px] font-medium">{t("clicks")}</span>
              </div>
            )}
          </div>

          {topLink ? (
            <div className="min-w-0 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 px-3 py-3">
              <div className="min-w-0">
                <Link
                  href={`/stats/${topLink.shortCode}`}
                  className="block truncate font-mono text-[17px] font-semibold leading-tight text-slate-900 dark:text-slate-100 hover:underline"
                >
                  /{topLink.shortCode}
                </Link>
                <p className="mt-1 truncate text-xs leading-relaxed text-slate-500 dark:text-slate-400" title={topLink.originalUrl}>
                  {topLink.originalUrl}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t("topLinkEmpty")}</p>
          )}

          {topLink && (
            <div className="mt-auto flex flex-wrap items-center gap-2">
              <CopyButton
                size="sm"
                variant="accent"
                label={t("copy")}
                value={topLink.shortUrl}
              />
              <Link
                href={`/stats/${topLink.shortCode}`}
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                {t("viewStats")}
              </Link>
              <a
                href={topLink.shortUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ size: "sm", variant: "ghost" })}
              >
                {t("open")}
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DashboardOpsSkeleton() {
  return (
    <section className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <Skeleton className="mt-0.5 h-7 w-7 shrink-0 rounded-lg" />
                <div className="min-w-0 space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2.5 w-28" />
                </div>
              </div>
              <Skeleton className="h-6 w-12 shrink-0" />
            </div>
          </div>
        ))}
      </div>
      <div className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex h-full min-w-0 flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="min-w-0 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 px-3 py-3 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
        </div>
      </div>
    </section>
  );
}

function OpsMetric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-50 dark:bg-slate-800/50 text-accent-700 dark:text-accent-400">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-snug text-slate-700 dark:text-slate-300">{label}</p>
            <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{hint}</p>
          </div>
        </div>
        <p className="shrink-0 font-mono text-2xl font-semibold leading-none tabular-nums text-slate-900 dark:text-slate-100">
          {value}
        </p>
      </div>
    </div>
  );
}

function LoadingTable({ t }: { t: (k: string) => string }) {
  return (
    <>
      {/* Mirrors the loaded layout per breakpoint: card skeletons below sm, table skeleton above —
          otherwise mobile flashes a table shape and jumps to cards once data lands. */}
      <div className="space-y-2.5 sm:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <div className="flex items-start gap-2.5">
              <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-7 w-12 shrink-0" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sm:block">
        <Table>
          <THead>
            <TR>
              <TH>{t("table.shortUrl")}</TH>
              <TH>{t("table.originalUrl")}</TH>
              <TH className="hidden md:table-cell">{t("table.createdAt")}</TH>
              <TH className="hidden lg:table-cell">{t("table.expiresAt")}</TH>
              <TH className="text-right">{t("table.clicks")}</TH>
              <TH className="text-right">{t("table.actions")}</TH>
            </TR>
          </THead>
          <TBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TR key={i}>
                <TD>
                  <Skeleton className="h-4 w-28" />
                </TD>
                <TD>
                  <Skeleton className="h-4 w-64" />
                </TD>
                <TD className="hidden md:table-cell">
                  <Skeleton className="h-4 w-20" />
                </TD>
                <TD className="hidden lg:table-cell">
                  <Skeleton className="h-4 w-16" />
                </TD>
                <TD className="text-right">
                  <Skeleton className="ml-auto h-4 w-10" />
                </TD>
                <TD className="text-right">
                  <Skeleton className="ml-auto h-4 w-16" />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}
