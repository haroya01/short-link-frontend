"use client";

import { useEffect, useState } from "react";
import { FileUp, Plus, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listMyLinks, listTags, type MyLinksFilters } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { LinksTable } from "@/components/links-table";
import { BulkImportDialog } from "@/components/bulk-import-dialog";
import { MyLinksFiltersBar } from "@/components/my-links-filters";
import { WeeklyInsightsCard } from "@/components/weekly-insights-card";
import { ExpiringSoonBanner } from "@/components/expiring-soon-banner";
import { DashboardOnboarding } from "@/components/dashboard-onboarding";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { useToast } from "@/components/ui/toast";
import type { MyLink } from "@/types";

export default function DashboardPage() {
  const { authenticated, ready, me } = useAuth();
  const t = useTranslations("dashboard");
  const tAuth = useTranslations("auth");
  const { toast } = useToast();
  const [items, setItems] = useState<MyLink[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<MyLinksFilters>({ size: 50 });
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [reload, setReload] = useState(0);
  const [bulkOpen, setBulkOpen] = useState(false);

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

  useEffect(() => {
    if (!ready || !authenticated) return;
    listTags()
      .then((tags) => setTagOptions(tags.map((t) => t.name)))
      .catch(() => {});
  }, [ready, authenticated]);

  // Welcome toast set by /auth/callback after a successful sign-in. Read once and clear so the
  // toast only fires on the post-OAuth landing — page reloads or in-app navigation stay silent.
  useEffect(() => {
    if (!ready || !authenticated) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("kurl:just-signed-in") !== "1") return;
    sessionStorage.removeItem("kurl:just-signed-in");
    const email = me?.email;
    toast(email ? tAuth("signedInWith", { email }) : tAuth("signedIn"), "success");
  }, [ready, authenticated, me, toast, tAuth]);

  // First-page fetch — always starts at the cursorless top. Refires on filter / search /
  // reload changes and resets the accumulated list so old rows don't bleed across filter switches.
  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listMyLinks({ ...filters, after: undefined })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, reload, filters]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await listMyLinks({ ...filters, after: nextCursor });
      setItems((prev) => [...(prev ?? []), ...data.items]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      toast(err instanceof Error ? err.message : "load failed", "error");
    } finally {
      setLoadingMore(false);
    }
  }

  if (ready && !authenticated) {
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold tracking-headline text-slate-900">{t("loginRequired")}</h1>
        <p className="mt-2 text-sm text-slate-500">{t("loginRequiredDesc")}</p>
        <Link href="/login" className="mt-6 inline-block">
          <Button>{t("goToLogin")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl space-y-5 py-10">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-headline text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("subtitle", { count: items?.length ?? 0 })}
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
        onImported={() => setReload((n) => n + 1)}
      />

      <ExpiringSoonBanner
        reloadKey={reload}
        onShowAll={() => setFilters((f) => ({ ...f, expiry: "EXPIRING_SOON", page: 1 }))}
      />

      <WeeklyInsightsCard />

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
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
              className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <MyLinksFiltersBar
          filters={filters}
          onChange={setFilters}
          tagOptions={tagOptions}
        />
      </div>

      {loading ? (
        <LoadingTable t={t} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
      ) : items && items.length === 0 ? (
        query.trim() || filters.tag || filters.domain || filters.expiry ? (
          <EmptyState title={t("noResultTitle")} description={t("noResultDesc", { query })} />
        ) : (
          <DashboardOnboarding />
        )
      ) : (
        <>
          <LinksTable
            items={items ?? []}
            onChanged={() => setReload((n) => n + 1)}
            onTagClick={(tag) => setFilters((f) => ({ ...f, tag, after: undefined }))}
          />
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? t("loadingMore") : t("loadMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LoadingTable({ t }: { t: (k: string) => string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
  );
}
