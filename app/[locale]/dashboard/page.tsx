"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { BarChart3, FileUp, Link2, Plus, QrCode, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import type { MyLinksFilters } from "@/lib/api";
import {
  useInvalidateLinks,
  useMyLinks,
  useTags,
} from "@/lib/api/links.queries";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { LinksTable } from "@/components/links/table";
import { BulkImportDialog } from "@/components/links/bulk-import-dialog";
import { MyLinksFiltersBar } from "@/components/links/my-links-filters";
import { WeeklyInsightsCard } from "@/components/stats/weekly-insights-card";
import { ExpiringSoonBanner } from "@/components/links/expiring-soon-banner";
import { CampaignsEntryCard } from "@/components/campaigns/entry-card";
import { DashboardOnboarding } from "@/components/common/dashboard-onboarding";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { useToast } from "@/components/ui/toast";

export default function DashboardPage() {
  const { authenticated, ready, me } = useAuth();
  const t = useTranslations("dashboard");
  const tAuth = useTranslations("auth");
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<MyLinksFilters>({ size: 50 });
  const [bulkOpen, setBulkOpen] = useState(false);

  const enabled = ready && authenticated;
  const linksQuery = useMyLinks(filters, { enabled });
  const tagsQuery = useTags({ enabled });
  const invalidateLinks = useInvalidateLinks();

  const items = useMemo(
    () => linksQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [linksQuery.data],
  );
  const tagOptions = useMemo(
    () => tagsQuery.data?.map((t) => t.name) ?? [],
    [tagsQuery.data],
  );
  const loading = linksQuery.isLoading;
  const error = linksQuery.error
    ? linksQuery.error instanceof Error
      ? linksQuery.error.message
      : "load failed"
    : null;

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
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("kurl:just-signed-in") !== "1") return;
    sessionStorage.removeItem("kurl:just-signed-in");
    const email = me?.email;
    toast(email ? tAuth("signedInWith", { email }) : tAuth("signedIn"), "success");
  }, [ready, authenticated, me, toast, tAuth]);

  const handleLoadMore = () => {
    void linksQuery.fetchNextPage();
  };

  if (ready && !authenticated) {
    return (
      <div className="container grid min-h-[calc(100vh-3.5rem-3rem)] max-w-2xl place-items-center py-10">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700">
            dashboard
          </p>
          <h1 className="mt-3 text-[26px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[32px]">
            {t("loginRequired")}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
            {t("loginRequiredDesc")}
          </p>
          <div className="mt-6 grid gap-2 text-[13px] text-slate-600 sm:grid-cols-3">
            <AuthBenefit icon={Link2} label={t("loginRequiredBenefits.links")} />
            <AuthBenefit icon={BarChart3} label={t("loginRequiredBenefits.stats")} />
            <AuthBenefit icon={QrCode} label={t("loginRequiredBenefits.campaigns")} />
          </div>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <Link href="/login">
              <Button className="w-full sm:w-auto">{t("goToLogin")}</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full sm:w-auto">
                {t("loginRequiredBack")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl space-y-5 py-10">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px]">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
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

      <CampaignsEntryCard />

      <ExpiringSoonBanner
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
        <ErrorState message={error} onRetry={() => void linksQuery.refetch()} />
      ) : items.length === 0 ? (
        query.trim() || filters.tag || filters.domain || filters.expiry ? (
          <EmptyState title={t("noResultTitle")} description={t("noResultDesc", { query })} />
        ) : (
          <DashboardOnboarding />
        )
      ) : (
        <>
          <LinksTable
            items={items}
            onChanged={() => void invalidateLinks()}
            onTagClick={(tag) => setFilters((f) => ({ ...f, tag, after: undefined }))}
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
    </div>
  );
}

function AuthBenefit({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-white text-accent-700 shadow-sm">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="mt-2 leading-snug">{label}</p>
    </div>
  );
}

function LoadingTable({ t }: { t: (k: string) => string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
