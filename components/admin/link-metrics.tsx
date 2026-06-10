"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { getAdminLinkMetrics } from "@/lib/api";
import { Section } from "@/components/common/section";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";
import type { AdminLinkMetric, AdminLinkMetricsSort, AdminLinkMetricsWindow } from "@/types";

type SortKey = "windowed" | "p50" | "p95" | "p99" | "errorRate" | "total";

const WINDOWS: AdminLinkMetricsWindow[] = ["1h", "24h", "7d", "all"];
const SORTS: AdminLinkMetricsSort[] = ["count", "latency", "error"];
const HIGH_ERROR_THRESHOLD = 0.05;

/**
 * Per-short_code performance breakdown — sister panel to {@link AdminRouteMetrics}, but keyed
 * by a single shortened link instead of an HTTP route. Backend ring buffer is bounded LRU
 * (top ~500 active codes) so cold links are intentionally hidden — the operator's question is
 * always "which of my links is currently slow / erroring" rather than a global census.
 *
 * Window chip switches the slice (1h / 24h / 7d / all). The backend's sort hint controls the
 * initial ordering of the response, but we also let the user re-sort client-side by clicking a
 * column header — same UX as {@link AdminRouteMetrics}. Top-5 by the active sort key get a
 * subtle bold treatment; rows with `errorRate >= 5%` are flagged with a slate-900 warning chip
 * (no standalone reds — brand-safe palette).
 *
 * Row toggle opens an outcome breakdown so the operator can see "redirect 800 · not_found 30 ·
 * blocked 5" rather than just the headline error rate.
 */
export function AdminLinkMetrics() {
  const t = useTranslations("admin");
  const [rows, setRows] = useState<AdminLinkMetric[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("windowed");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [windowSel, setWindowSel] = useState<AdminLinkMetricsWindow>("24h");
  const [serverSort, setServerSort] = useState<AdminLinkMetricsSort>("count");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    getAdminLinkMetrics(windowSel, serverSort)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "load failed");
      });
    return () => {
      cancelled = true;
    };
  }, [windowSel, serverSort]);

  const sorted = useMemo(() => {
    if (!rows) return [];
    const get = (r: AdminLinkMetric): number => {
      switch (sortKey) {
        case "windowed":
          return r.windowedRedirects;
        case "total":
          return r.totalRedirects;
        case "p50":
          return r.p50Millis;
        case "p95":
          return r.p95Millis;
        case "p99":
          return r.p99Millis;
        case "errorRate":
          return r.errorRate;
      }
    };
    const copy = [...rows];
    copy.sort((a, b) => (sortDir === "desc" ? get(b) - get(a) : get(a) - get(b)));
    return copy;
  }, [rows, sortKey, sortDir]);

  const topFiveIds = useMemo(() => {
    return new Set(sorted.slice(0, 5).map((r) => r.shortCode));
  }, [sorted]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <Section title={t("section.linkMetrics.title")} description={t("section.linkMetrics.desc")}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("section.linkMetrics.windowSort")}
          </span>
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindowSel(w)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                windowSel === w
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50",
              )}
              data-testid={`link-metrics-window-${w}`}
            >
              {t(`section.linkMetrics.window.${w}`)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("section.linkMetrics.sortLabel")}
          </span>
          {SORTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setServerSort(s)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                serverSort === s
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50",
              )}
              data-testid={`link-metrics-sort-${s}`}
            >
              {t(`section.linkMetrics.sort.${s}`)}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{error}</p>
      ) : !rows ? (
        <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          {t("section.linkMetrics.empty")}
        </p>
      ) : (
        <>
          {/* Mobile card list — 11 columns don't survive a phone viewport. Each card stacks the
              identity row (shortCode + window count), origin / owner meta, metric strip
              (p95 / p99 / err), and the optional outcome breakdown under an inline disclosure. */}
          <div className="space-y-2 sm:hidden">
            {sorted.map((r) => {
              const id = r.shortCode;
              const hot = topFiveIds.has(id);
              const highError = r.errorRate >= HIGH_ERROR_THRESHOLD;
              const isExpanded = expanded.has(id);
              const hasOutcomes =
                r.outcomeCounts && Object.keys(r.outcomeCounts).length > 0;
              return (
                <div
                  key={id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
                  data-testid="link-metric-card"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "truncate font-mono text-[12px]",
                        hot && "font-semibold text-slate-900 dark:text-slate-100",
                      )}
                    >
                      /{r.shortCode}
                    </span>
                    <span className="ml-auto inline-flex shrink-0 items-baseline gap-1 text-sm tabular-nums">
                      <span className={cn("font-mono", hot && "font-semibold text-slate-900 dark:text-slate-100")}>
                        {formatNumber(r.windowedRedirects)}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        /{formatNumber(r.totalRedirects)}
                      </span>
                    </span>
                  </div>
                  {r.originalUrl && (
                    <p
                      className="mt-2 truncate text-xs text-slate-600 dark:text-slate-300"
                      title={r.originalUrl ?? undefined}
                    >
                      → {r.originalUrl}
                    </p>
                  )}
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="truncate">
                      {r.ownerEmail ?? t("section.linkMetrics.noOwner")}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatRelative(r.lastRedirectAt)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <LinkStat
                      label={t("section.linkMetrics.cols.p95")}
                      value={`${r.p95Millis}`}
                    />
                    <LinkStat
                      label={t("section.linkMetrics.cols.p99")}
                      value={`${r.p99Millis}`}
                    />
                    <LinkStat
                      label={t("section.linkMetrics.cols.errorRate")}
                      value={`${(r.errorRate * 100).toFixed(2)}%`}
                      emphasized={highError}
                      icon={highError ? <AlertTriangle className="h-3 w-3" /> : null}
                    />
                  </div>
                  {hasOutcomes && (
                    <button
                      type="button"
                      onClick={() => {
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return next;
                        });
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                      {t("section.linkMetrics.outcomes")}
                    </button>
                  )}
                  {isExpanded && hasOutcomes && (
                    <div className="mt-2 rounded-md bg-slate-50 dark:bg-slate-800/50 p-2">
                      <OutcomeBreakdown
                        counts={r.outcomeCounts}
                        total={r.windowedRedirects}
                        t={t}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden sm:block">
        <Table>
          <THead>
            <TR>
              <TH className="w-6" />
              <TH>{t("section.linkMetrics.cols.shortCode")}</TH>
              <TH className="max-w-[260px]">{t("section.linkMetrics.cols.original")}</TH>
              <TH>{t("section.linkMetrics.cols.owner")}</TH>
              <SortableHeader
                label={t("section.linkMetrics.cols.windowed")}
                active={sortKey === "windowed"}
                dir={sortDir}
                onClick={() => handleSort("windowed")}
              />
              <SortableHeader
                label={t("section.linkMetrics.cols.total")}
                active={sortKey === "total"}
                dir={sortDir}
                onClick={() => handleSort("total")}
              />
              <SortableHeader
                label={t("section.linkMetrics.cols.p50")}
                active={sortKey === "p50"}
                dir={sortDir}
                onClick={() => handleSort("p50")}
              />
              <SortableHeader
                label={t("section.linkMetrics.cols.p95")}
                active={sortKey === "p95"}
                dir={sortDir}
                onClick={() => handleSort("p95")}
              />
              <SortableHeader
                label={t("section.linkMetrics.cols.p99")}
                active={sortKey === "p99"}
                dir={sortDir}
                onClick={() => handleSort("p99")}
              />
              <SortableHeader
                label={t("section.linkMetrics.cols.errorRate")}
                active={sortKey === "errorRate"}
                dir={sortDir}
                onClick={() => handleSort("errorRate")}
              />
              <TH className="text-right">{t("section.linkMetrics.cols.lastAt")}</TH>
            </TR>
          </THead>
          <TBody>
            {sorted.map((r) => {
              const id = r.shortCode;
              const hot = topFiveIds.has(id);
              const highError = r.errorRate >= HIGH_ERROR_THRESHOLD;
              const isExpanded = expanded.has(id);
              const hasOutcomes =
                r.outcomeCounts && Object.keys(r.outcomeCounts).length > 0;
              return (
                <Fragment key={id}>
                  <TR data-testid="link-metric-row">
                    <TD>
                      {hasOutcomes && (
                        <button
                          type="button"
                          onClick={() => {
                            setExpanded((prev) => {
                              const next = new Set(prev);
                              if (next.has(id)) next.delete(id);
                              else next.add(id);
                              return next;
                            });
                          }}
                          aria-label={
                            isExpanded
                              ? t("section.linkMetrics.collapseOutcomes")
                              : t("section.linkMetrics.expandOutcomes")
                          }
                          className="rounded p-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                          data-testid="link-metric-toggle"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </TD>
                    <TD
                      className={cn(
                        "font-mono text-[12px]",
                        hot && "font-semibold text-slate-900 dark:text-slate-100",
                      )}
                    >
                      /{r.shortCode}
                    </TD>
                    <TD
                      className="max-w-[260px] truncate text-xs text-slate-600 dark:text-slate-300"
                      title={r.originalUrl ?? undefined}
                    >
                      {r.originalUrl ?? (
                        <span className="text-slate-400 dark:text-slate-500">
                          {t("section.linkMetrics.noOriginal")}
                        </span>
                      )}
                    </TD>
                    <TD className="text-xs text-slate-500 dark:text-slate-400">
                      {r.ownerEmail ?? t("section.linkMetrics.noOwner")}
                    </TD>
                    <TD
                      className={cn(
                        "text-right tabular-nums font-mono",
                        hot && "font-semibold",
                      )}
                    >
                      {formatNumber(r.windowedRedirects)}
                    </TD>
                    <TD className="text-right tabular-nums font-mono text-slate-500 dark:text-slate-400">
                      {formatNumber(r.totalRedirects)}
                    </TD>
                    <TD className="text-right tabular-nums font-mono text-slate-600 dark:text-slate-300">
                      {r.p50Millis}
                    </TD>
                    <TD className="text-right tabular-nums font-mono text-slate-600 dark:text-slate-300">
                      {r.p95Millis}
                    </TD>
                    <TD className="text-right tabular-nums font-mono text-slate-600 dark:text-slate-300">
                      {r.p99Millis}
                    </TD>
                    <TD className="text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums",
                          highError ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-600 dark:text-slate-300",
                        )}
                        data-testid={highError ? "link-metric-high-error" : undefined}
                      >
                        {highError && (
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        )}
                        {(r.errorRate * 100).toFixed(2)}%
                      </span>
                    </TD>
                    <TD className="text-right text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      {formatRelative(r.lastRedirectAt)}
                    </TD>
                  </TR>
                  {isExpanded && hasOutcomes && (
                    <TR data-testid="link-metric-outcomes" className="bg-slate-50 dark:bg-slate-800/50">
                      <TD />
                      <TD colSpan={10} className="py-2">
                        <OutcomeBreakdown
                          counts={r.outcomeCounts}
                          total={r.windowedRedirects}
                          t={t}
                        />
                      </TD>
                    </TR>
                  )}
                </Fragment>
              );
            })}
          </TBody>
        </Table>
          </div>
        </>
      )}
    </Section>
  );
}

function LinkStat({
  label,
  value,
  emphasized,
  icon,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="truncate text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-0.5 inline-flex items-center gap-1 font-mono tabular-nums",
          emphasized ? "rounded bg-slate-900 dark:bg-white px-1 text-white dark:text-slate-900" : "text-slate-700 dark:text-slate-300",
        )}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <TH className="text-right">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-slate-900 dark:hover:text-slate-100",
          active ? "text-accent-700 dark:text-accent-400" : "text-slate-500 dark:text-slate-400",
        )}
      >
        {label}
        {active &&
          (dir === "desc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          ))}
      </button>
    </TH>
  );
}

function OutcomeBreakdown({
  counts,
  total,
  t,
}: {
  counts: Record<string, number>;
  total: number;
  t: (k: string) => string;
}) {
  // Sort by count desc so the dominant outcome shows up first — operators care most about
  // "what's the biggest slice" rather than alphabetical order.
  const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);
  return (
    <div className="flex flex-wrap items-center gap-2 px-1 text-[11px]">
      <span className="text-slate-500 dark:text-slate-400">{t("section.linkMetrics.outcomes")}</span>
      {entries.map(([outcome, count]) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        const isError =
          outcome === "not_found" ||
          outcome === "expired" ||
          outcome === "view_limit" ||
          outcome === "blocked" ||
          outcome === "error";
        const isWarn = outcome === "password_required";
        const labelKey = `section.linkMetrics.outcome.${outcome}`;
        const label = safeT(t, labelKey, outcome);
        return (
          <span
            key={outcome}
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
              isError
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                : isWarn
                  ? "border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
            )}
            data-testid={`outcome-pill-${outcome}`}
          >
            <span className="font-semibold">{label}</span>
            <span className="font-mono tabular-nums">
              {formatNumber(count)} · {pct.toFixed(1)}%
            </span>
          </span>
        );
      })}
    </div>
  );
}

// next-intl throws when a key is missing — for {@code outcome} pills we'd rather show the
// raw label than crash the whole panel, since the backend can introduce new outcomes in
// principle.
function safeT(t: (k: string) => string, key: string, fallback: string): string {
  try {
    const v = t(key);
    if (v && v !== key) return v;
    return fallback;
  } catch {
    return fallback;
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
