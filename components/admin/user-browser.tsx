"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApiError, getAdminUsers } from "@/lib/api";
import { PageControls } from "@/components/admin/page-controls";
import { ErrorState } from "@/components/common/error-state";
import { Section } from "@/components/common/section";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { AdminUserRole, AdminUserRow } from "@/types";

const PAGE_SIZE = 20;
const ROLE_FILTERS: Array<AdminUserRole | "ALL"> = ["ALL", "USER", "ADMIN"];

export function UserBrowser() {
  const t = useTranslations("admin");
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<AdminUserRole | "ALL">("ALL");
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAdminUsers({
      q: query || undefined,
      role: role === "ALL" ? undefined : role,
      page,
      size: PAGE_SIZE,
    })
      .then((data) => {
        if (!cancelled) {
          setItems(data.items);
          setTotal(data.total);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        // 401/403 = client thought it was admin but the server disagrees → same hard 404 the
        // route uses for non-admins, so its existence never leaks.
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
  }, [query, role, page, tick]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const initialLoading = loading && items.length === 0;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setQuery(term.trim());
  }

  function pickRole(next: AdminUserRole | "ALL") {
    setPage(0);
    setRole(next);
  }

  return (
    <Section title={t("browse.users.title")} description={t("browse.users.subtitle")}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form onSubmit={submitSearch} className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={t("browse.users.searchPlaceholder")}
              aria-label={t("browse.search")}
              className="pl-9"
            />
          </form>
          <div className="flex gap-1.5">
            {ROLE_FILTERS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => pickRole(r)}
                className={cn(
                  "focus-ring rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  role === r
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                )}
              >
                {t(`browse.users.role.${r === "ALL" ? "all" : r === "USER" ? "user" : "admin"}`)}
              </button>
            ))}
          </div>
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
            {t("browse.users.noResults")}
          </p>
        ) : (
          <div className={cn("space-y-3 transition-opacity", loading && "opacity-60")}>
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>{t("browse.users.col.user")}</TH>
                    <TH>{t("browse.users.col.role")}</TH>
                    <TH>{t("browse.users.col.tier")}</TH>
                    <TH className="text-right">{t("browse.users.col.links")}</TH>
                    <TH>{t("browse.users.col.joined")}</TH>
                    <TH>{t("browse.users.col.status")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {items.map((u) => (
                    <TR key={u.id}>
                      <TD>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{u.email}</div>
                        {u.username && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">@{u.username}</div>
                        )}
                      </TD>
                      <TD>
                        <RoleBadge
                          role={u.role}
                          label={t(`browse.users.role.${u.role === "ADMIN" ? "admin" : "user"}`)}
                        />
                      </TD>
                      <TD className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {u.tier}
                      </TD>
                      <TD className="text-right tabular-nums">
                        {u.linkCount > 0 ? (
                          <Link
                            href={`/admin/links?ownerId=${u.id}`}
                            className="font-medium text-accent-700 hover:underline dark:text-accent-400"
                          >
                            {formatNumber(u.linkCount)}
                          </Link>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">0</span>
                        )}
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(u.createdAt)}
                      </TD>
                      <TD>
                        {u.deleted ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {t("browse.users.deleted")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent-600" />
                            {t("browse.users.active")}
                          </span>
                        )}
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

function RoleBadge({ role, label }: { role: AdminUserRole; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        role === "ADMIN"
          ? "bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      )}
    >
      {label}
    </span>
  );
}
