"use client";

import { useEffect, useMemo, useState } from "react";
import { FileUp, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listMyLinks } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { LinksTable } from "@/components/links-table";
import { BulkImportDialog } from "@/components/bulk-import-dialog";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import type { MyLink } from "@/types";

export default function DashboardPage() {
  const { authenticated, ready } = useAuth();
  const t = useTranslations("dashboard");
  const [items, setItems] = useState<MyLink[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [reload, setReload] = useState(0);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listMyLinks()
      .then((data) => {
        if (!cancelled) setItems(data.items);
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
  }, [ready, authenticated, reload]);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (i) => i.originalUrl.toLowerCase().includes(q) || i.shortCode.toLowerCase().includes(q),
    );
  }, [items, query]);

  if (ready && !authenticated) {
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{t("loginRequired")}</h1>
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
          <h1 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
            {t("label")}
          </h1>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {t("title")}
          </h2>
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

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
        />
      </div>

      {loading ? (
        <LoadingTable t={t} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
      ) : items && items.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          action={
            <Link href="/">
              <Button>{t("emptyCta")}</Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("noResultTitle")}
          description={t("noResultDesc", { query })}
        />
      ) : (
        <LinksTable items={filtered} onChanged={() => setReload((n) => n + 1)} />
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
            <TH>{t("table.createdAt")}</TH>
            <TH>{t("table.expiresAt")}</TH>
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
              <TD>
                <Skeleton className="h-4 w-20" />
              </TD>
              <TD>
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
