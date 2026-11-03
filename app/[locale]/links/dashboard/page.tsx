"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import type { MyLinksFilters } from "@/lib/api";
import { cn } from "@/lib/utils";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LinksTable, type LiveBump } from "@/components/links/table";
import { MobileComposer } from "@/components/links/mobile-composer";
import { ShortenPanel, type ShortenedEntry } from "@/components/links/shorten/shorten-panel";
import { useSharedUrl } from "@/lib/use-shared-url";
import { BulkImportDialog } from "@/components/links/bulk-import-dialog";
import { MyLinksFiltersPanel, MyLinksFiltersToggle } from "@/components/links/my-links-filters";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { useToast } from "@/components/ui/toast";
import { LinksPage } from "@/components/links/links-page";

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
  const [urlFiltersRead, setUrlFiltersRead] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const expiry = params.get("expiry");
    const sort = params.get("sort");
    if (expiry === "EXPIRING_SOON") setFilters((f) => ({ ...f, expiry, after: undefined }));
    if (sort === "humanClickCount" || sort === "clickCount")
      setFilters((f) => ({ ...f, sort: "humanClickCount", dir: params.get("dir") === "asc" ? "asc" : "desc", after: undefined }));
    if (expiry || sort) history.replaceState(history.state, "", window.location.pathname + window.location.hash);
    setUrlFiltersRead(true);
  }, []);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [made, setMade] = useState<ShortenedEntry[] | null>(null);
  const sharedUrl = useSharedUrl();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const favorites = useLinkFavorites();

  const enabled = ready && authenticated;
  const linksQuery = useMyLinks(filters, { enabled: enabled && urlFiltersRead && !favoritesOnly });
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
  const loading = !ready || !urlFiltersRead || (favoritesOnly ? favorites.isLoading : linksQuery.isPending);
  const listError = favoritesOnly ? favorites.error : linksQuery.error;
  const error = listError ? t("loadFailed") : null;
  const account = overviewQuery.data;

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
  const firstRun = !loading && !error && !favoritesOnly && !hasActiveFilter && items.length === 0;

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
      <SignInEmptyState page reason="links" />
    );
  }

  return (
    <LinksPage className="space-y-4 max-sm:pb-16">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
            {t("title")}
          </h1>
          <p className="mt-1 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            {account && <span>{t("subtitleCount", { count: account.totalLinks })}</span>}
            {!firstRun && account && account.expiringLinks > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFavoritesOnly(false);
                  setFilters((f) => ({ ...f, expiry: "EXPIRING_SOON", after: undefined }));
                }}
                className="focus-ring rounded-sm font-medium text-amber-700 underline decoration-amber-300 underline-offset-4 hover:decoration-amber-500 dark:text-amber-400 dark:decoration-amber-500/50"
              >
                {t("expiringSoon", { count: account.expiringLinks })}
              </button>
            )}
            <button type="button" onClick={() => setBulkOpen(true)} className="focus-ring rounded-sm underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:decoration-slate-600 dark:hover:text-slate-100 sm:hidden">{t("bulkImport.button")}</button>
          </p>
        </div>
        <Button variant="outline" className="hidden sm:inline-flex" onClick={() => setBulkOpen(true)}>
          {t("bulkImport.button")}
        </Button>
      </div>

      {/* 로그인한 사람의 홈 — 단축 칸이 맨 위(폰은 엄지 자리의 하단 입력 바가 같은 일을 한다). */}
      <div className="hidden pb-2 pt-1 sm:block">
        <ShortenPanel
          authenticated={authenticated || !ready}
          ready={ready}
          results={made}
          onResultsChange={setMade}
          initialUrl={sharedUrl ?? undefined}
          onCreated={() => void invalidateLinks()}
        />
      </div>

      <BulkImportDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onImported={() => void invalidateLinks()}
      />
      <MobileComposer hidden={selecting} initialUrl={sharedUrl ?? undefined} onCreated={() => void invalidateLinks()} />

      {firstRun ? (
        <EmptyState title={t("firstRunTitle")} />
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                <Input
                  type="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  aria-label={t("searchPlaceholder")}
                  className="pl-9 pr-11 [&::-webkit-search-cancel-button]:appearance-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label={t("searchClear")}
                    className="focus-ring absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  >
                    <X aria-hidden className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800" role="group" aria-label={t("libraryViews")}>
                  {[false, true].map((fav) => (
                    <button
                      key={String(fav)}
                      type="button"
                      aria-pressed={favoritesOnly === fav}
                      onClick={() => { setFavoritesOnly(fav); if (!fav) setOrdering(false); }}
                      className={cn(
                        "focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                        favoritesOnly === fav
                          ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                      )}
                    >
                      {fav ? t("favorite.filter") : t("allLinks")}
                    </button>
                  ))}
                </div>
                {favoritesOnly && favorites.items.length > 1 && <Button variant="ghost" className="min-h-10" onClick={() => setOrdering((value) => !value)} aria-expanded={ordering}>{ordering ? t("favorite.orderDone") : t("favorite.orderTitle")}</Button>}
                <MyLinksFiltersToggle filters={filters} onChange={setFilters} open={filtersOpen} onOpenChange={setFiltersOpen} />
              </div>
            </div>
            {filtersOpen && <MyLinksFiltersPanel filters={filters} onChange={setFilters} tagOptions={tagOptions} />}
            {ordering && favoritesOnly && <FavoriteOrder items={favorites.items} busy={favorites.busy} onReorder={(codes) => void reorderFavorites(codes)} />}


          </div>

          {!favoritesOnly && favorites.error && !loading && !error && <ErrorState message={t("favorite.loadFailed")} onRetry={() => void favorites.refetch()} />}
          {loading ? (
            <LoadingList />
          ) : error ? (
            <ErrorState message={error} onRetry={() => { void favorites.refetch(); if (!favoritesOnly) void linksQuery.refetch(); }} />
          ) : displayItems.length === 0 && query.trim() ? (
            <EmptyState
              title={t("noResultQuery", { query: query.trim() })}
              action={<TextAction onClick={() => setQuery("")}>{t("searchClear")}</TextAction>}
            />
          ) : displayItems.length === 0 && hasActiveFilter ? (
            <EmptyState
              title={t("noResultFiltered")}
              action={<TextAction onClick={() => setFilters((f) => ({ size: f.size, sort: f.sort, dir: f.dir }))}>{t("filters.clearAll")}</TextAction>}
            />
          ) : displayItems.length === 0 ? (
            <EmptyState
              title={t("favorite.emptyTitle")}
              action={<TextAction onClick={() => setFavoritesOnly(false)}>{t("allLinks")}</TextAction>}
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
                onSelectingChange={setSelecting}
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
    </LinksPage>
  );
}

function LoadingList() {
  return (
    <div aria-hidden className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-h-[45px] items-center gap-3 border-b border-slate-100 px-3 py-1 dark:border-slate-800 sm:px-4">
        <span className="hidden h-11 w-5 shrink-0 sm:block" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="ml-auto h-3 w-16" />
        <span className="w-10 sm:w-[76px]" />
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 py-2 pl-3 pr-1.5 sm:px-4 sm:py-2.5">
            <span className="hidden h-11 w-5 shrink-0 sm:block" />
            <div className="min-w-0 flex-1 py-1 sm:py-0.5">
              <div className="flex h-[22px] items-center">
                <Skeleton className="h-3.5 w-32 sm:w-44" />
              </div>
              <div className="mt-0.5 flex h-5 items-center">
                <Skeleton className="h-3 w-24 sm:w-36" />
              </div>
            </div>
            <Skeleton className="h-5 w-12 shrink-0 sm:hidden md:block md:w-14" />
            <div className="min-w-[4.5rem] shrink-0">
              <div className="flex h-[22px] items-center justify-end">
                <Skeleton className="h-3.5 w-10" />
              </div>
              <div className="flex h-[18px] items-center justify-end">
                <Skeleton className="h-2.5 w-12" />
              </div>
            </div>
            <span className="h-8 w-8 shrink-0" />
            <span className="hidden h-11 w-11 shrink-0 sm:block" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TextAction({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring touch-target -mx-1 rounded-md px-1 py-0.5 text-[14px] font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:text-slate-100 dark:decoration-slate-600 dark:hover:decoration-slate-400"
    >
      {children}
    </button>
  );
}
