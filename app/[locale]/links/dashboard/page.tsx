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
import { useLinkFavorites } from "@/lib/use-link-favorites";
import { useAccountClickStream } from "@/hooks/use-account-click-stream";
import { useQuery } from "@tanstack/react-query";
import { getLinkOverview } from "@/lib/api/link-library";
import { filterFavoriteLinks } from "@/lib/link-library-view";
import { FavoriteOrder } from "@/components/links/favorite-order";
import {
  useInvalidateLinks,
  useMyLinks,
  useTags,
} from "@/lib/api/links.queries";
import { Link } from "@/i18n/navigation";
import { StatsMorphLink } from "@/components/links/stats-morph-link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { LinksTable, type LiveBump } from "@/components/links/table";
import { BulkImportDialog } from "@/components/links/bulk-import-dialog";
import { MyLinksFiltersBar } from "@/components/links/my-links-filters";
import { WeeklyInsightsCard } from "@/components/links/stats/weekly-insights-card";
import { ExpiringSoonBanner } from "@/components/links/expiring-soon-banner";
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
  const [ordering, setOrdering] = useState(false);
  const favorites = useLinkFavorites();

  const enabled = ready && authenticated;
  const linksQuery = useMyLinks(filters, { enabled: enabled && !favoritesOnly });
  const overviewQuery = useQuery({ queryKey: ["links", "overview", me?.id], queryFn: ({ signal }) => getLinkOverview(signal), enabled: enabled && me?.id != null });

  // 클릭이 도착하는 순간 — 계정 스트림이 실어오는 클릭을 행별 가산분으로 쌓아 표를 깨운다.
  // 봇 클릭은 조용히 무시(통계 표면과 동일한 신뢰 계약).
  const [liveByCode, setLiveByCode] = useState<Record<string, LiveBump>>({});
  useAccountClickStream({
    enabled,
    onClick: (click) => {
      if (click.bot) return;
      setLiveByCode((prev) => {
        const cur = prev[click.shortCode];
        return {
          ...prev,
          [click.shortCode]: { extra: (cur?.extra ?? 0) + 1, seq: (cur?.seq ?? 0) + 1 },
        };
      });
    },
  });
  const tagsQuery = useTags({ enabled });
  const invalidateLinks = useInvalidateLinks();

  const items = useMemo(
    () => linksQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [linksQuery.data],
  );

  // 서버 재조회가 도착하면 실값에 수렴 — 가산분(extra)만 접고, seq(라이브 닷·이 세션에 살아있던
  // 흔적)는 남긴다. 접지 않으면 재조회분과 이중 계산된다.
  useEffect(() => {
    setLiveByCode((prev) => {
      const entries = Object.entries(prev).filter(([, v]) => v.extra > 0);
      if (entries.length === 0) return prev;
      const next = { ...prev };
      for (const [code, v] of entries) next[code] = { extra: 0, seq: v.seq };
      return next;
    });
  }, [linksQuery.data, favorites.items]);
  const displayItems = useMemo(() => favoritesOnly ? filterFavoriteLinks(favorites.items, { ...filters, q: query }) : items, [favoritesOnly, favorites.items, filters, query, items]);
  const tagOptions = useMemo(
    () => tagsQuery.data?.map((t) => t.name) ?? [],
    [tagsQuery.data],
  );
  const loading = !ready || (favoritesOnly ? favorites.isLoading : linksQuery.isLoading);
  const listError = favoritesOnly ? favorites.error : linksQuery.error;
  const error = listError ? t("loadFailed") : null;
  const account = overviewQuery.data;
  const top = account?.topLinks[0];
  const ops: DashboardOps | null = account ? { totalClicks: account.humanClicks, clicks7d: account.clicks7d, zeroClickLinks: account.zeroClickLinks, expiringLinks: account.expiringLinks, topLink: top ? { ...top, clickCount: top.humanClickCount ?? top.clickCount, clicks7d: (top.clicksLast7d ?? []).reduce((sum, n) => sum + n, 0) } : null } : null;

  async function toggleFavorite(code: string) {
    try { await favorites.toggle(code); } catch { toast(t("favorite.saveFailed"), "error"); }
  }
  async function reorderFavorites(codes: string[]) {
    try { await favorites.reorder(codes); } catch { toast(t("favorite.saveFailed"), "error"); }
  }

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
  const firstRun = account?.totalLinks === 0 && !hasActiveFilter && !favoritesOnly;

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
    <div className="container max-w-5xl space-y-4 py-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {account ? t("subtitle", { count: account.totalLinks }) : t("librarySubtitle")}
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
          {overviewQuery.isLoading ? <DashboardOpsSkeleton /> : overviewQuery.error ? <ErrorState message={t("overviewFailed")} onRetry={() => void overviewQuery.refetch()} /> : ops ? <DashboardOpsPanel ops={ops} /> : null}
          {account && <p className="text-xs text-slate-500 dark:text-slate-400">{t("accountScope", { tz: account.timezone, total: formatNumber(account.totalClicks) })}</p>}

          <ExpiringSoonBanner count={account?.expiringLinks ?? 0} onShowAll={() => {
            setFavoritesOnly(false);
            setFilters((f) => ({ ...f, expiry: "EXPIRING_SOON", after: undefined }));
          }} />

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
                  className="focus-ring absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("libraryViews")}>
              <Button variant={!favoritesOnly ? "accent" : "outline"} className="min-h-11" onClick={() => { setFavoritesOnly(false); setOrdering(false); }} aria-pressed={!favoritesOnly}>{t("allLinks")}</Button>
              <Button variant={favoritesOnly ? "accent" : "outline"} className="min-h-11" onClick={() => setFavoritesOnly(true)} aria-pressed={favoritesOnly}><Star className="h-4 w-4" />{t("favorite.filter")} {favorites.items.length > 0 ? `(${favorites.items.length})` : ""}</Button>
              {favoritesOnly && favorites.items.length > 1 && <Button variant="ghost" className="min-h-11" onClick={() => setOrdering((value) => !value)} aria-expanded={ordering}>{ordering ? t("favorite.orderDone") : t("favorite.orderTitle")}</Button>}
            </div>
            {favoritesOnly && <p className="text-xs text-slate-500 dark:text-slate-400">{t("favorite.syncedHint")}</p>}
            {ordering && favoritesOnly && <FavoriteOrder items={favorites.items} busy={favorites.busy} onReorder={(codes) => void reorderFavorites(codes)} />}
            <MyLinksFiltersBar filters={filters} onChange={setFilters} tagOptions={tagOptions} />


          </div>

          {!favoritesOnly && favorites.error && <ErrorState message={t("favorite.loadFailed")} onRetry={() => void favorites.refetch()} />}
          {loading ? (
            <LoadingTable t={t} />
          ) : error ? (
            <ErrorState message={error} onRetry={() => { if (favoritesOnly) void favorites.refetch(); else void linksQuery.refetch(); }} />
          ) : displayItems.length === 0 && (!favoritesOnly || hasActiveFilter) ? (
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
                key={favoritesOnly ? "favorites" : "all"}
                items={displayItems}
                sortKey={filters.sort ?? "createdAt"}
                sortDir={filters.dir ?? "desc"}
                onSortChange={(sort, dir) =>
                  setFilters((f) => ({ ...f, sort, dir, after: undefined }))
                }
                onChanged={() => void invalidateLinks()}
                onTagClick={(tag) => setFilters((f) => ({ ...f, tag, after: undefined }))}
                isFavorite={favorites.isFavorite}
                onToggleFavorite={(code) => void toggleFavorite(code)}
                favoritesDisabled={favorites.busy || favorites.isLoading || !!favorites.error}
                sortingDisabled={favoritesOnly}
                liveByCode={liveByCode}
              />
              {!favoritesOnly && linksQuery.hasNextPage && (
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
  topLink: {
    shortCode: string;
    note?: string | null;
    shortUrl: string;
    originalUrl: string;
    clickCount: number;
    clicks7d: number;
  } | null;
};

function DashboardOpsPanel({ ops }: { ops: DashboardOps }) {
  const t = useTranslations("dashboard.ops");
  const top = ops.topLink;
  return <section className="space-y-3">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <OpsMetric icon={MousePointerClick} label={t("totalClicks")} value={formatNumber(ops.totalClicks)} hint={t("totalClicksHint")} />
      <OpsMetric icon={TrendingUp} label={t("weekClicks")} value={formatNumber(ops.clicks7d)} hint={t("weekClicksHint")} />
      <OpsMetric icon={Link2} label={t("zeroClick")} value={formatNumber(ops.zeroClickLinks)} hint={t("zeroClickHint")} />
      <OpsMetric icon={Clock3} label={t("expiring")} value={formatNumber(ops.expiringLinks)} hint={ops.expiringLinks > 0 ? t("expiringReview") : t("expiringClear")} />
    </div>
    {top && <div className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900 sm:flex sm:gap-x-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("topLink")}</p>
      <StatsMorphLink shortCode={top.shortCode} className="col-start-1 row-start-2 min-w-0 break-words text-sm font-semibold text-slate-900 dark:text-slate-100 sm:flex-1 sm:truncate" data-vt-link-scope><span data-vt-link-code>{top.note || `/${top.shortCode}`}</span></StatsMorphLink>
      <span className="col-start-2 row-start-1 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">{formatNumber(top.clickCount)} {t("clicks")}</span>
      <div className="col-start-2 row-start-2"><CopyButton size="sm" variant="ghost" label={t("copy")} value={top.shortUrl} /></div>
    </div>}
  </section>;
}

function DashboardOpsSkeleton() {
  return <section className="space-y-3" aria-hidden><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}</div><Skeleton className="h-14 rounded-lg" /></section>;
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
  return <div className="min-w-0 rounded-2xl border border-slate-200 px-3 py-3 dark:border-slate-800" title={hint}>
    <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"><Icon className="hidden h-3.5 w-3.5 shrink-0 sm:block" />{label}</p>
    <p className="mt-2 font-mono text-2xl font-semibold leading-none tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
    <span className="sr-only">{hint}</span>
  </div>;
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
