"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { getAdminRouteMetrics } from "@/lib/api";
import { Section } from "@/components/common/section";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";
import type { AdminRouteMetric, AdminRouteMetricsWindow } from "@/types";

type SortKey = "count" | "p50" | "p95" | "p99" | "errorRate";

const WINDOWS: AdminRouteMetricsWindow[] = ["1h", "24h", "7d", "all"];

/**
 * Route-level breakdown of `http.server.requests`. The existing health-metrics section sums
 * everything together so a single hot endpoint can be hidden behind a fleet of cheap GETs;
 * this table surfaces (uri, method) so admins can pinpoint which route is slow or erroring.
 *
 * v2 adds:
 * - **Time window selector** (1h / 24h / 7d / all) backed by an in-memory ring buffer on the
 *   backend — drill into "what's happening right now" vs "since process start". Windows under
 *   "all" hide p50 because the ring snapshots only retain worst-minute p95/p99.
 * - **Status distribution row** under each route (collapsed by default). Click ▶ to see the
 *   raw 200 / 4xx / 5xx breakdown so a 404 storm doesn't masquerade as a healthy spike in
 *   request volume.
 *
 * Sort defaults to count desc. Header click cycles asc/desc on the chosen key. Top-5 by the
 * active sort key get a subtle bold treatment, and any route with error rate >= 5% is flagged
 * with a slate-900 warning chip — staying within the brand-safe palette (no standalone reds).
 */
export function AdminRouteMetrics() {
  const t = useTranslations("admin");
  const [rows, setRows] = useState<AdminRouteMetric[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [windowSel, setWindowSel] = useState<AdminRouteMetricsWindow>("1h");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    getAdminRouteMetrics(windowSel)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "load failed");
      });
    return () => {
      cancelled = true;
    };
  }, [windowSel]);

  const sorted = useMemo(() => {
    if (!rows) return [];
    const get = (r: AdminRouteMetric): number => {
      switch (sortKey) {
        case "count":
          return r.count;
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
    return new Set(sorted.slice(0, 5).map((r) => `${r.method} ${r.uri}`));
  }, [sorted]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const showP50 = windowSel === "all"; // ring buffer doesn't retain p50

  return (
    <Section
      title={t("section.routeMetrics.title")}
      description={t("section.routeMetrics.desc")}
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
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
            data-testid={`route-metrics-window-${w}`}
          >
            {t(`section.routeMetrics.window.${w}`)}
          </button>
        ))}
      </div>
      {error ? (
        <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{error}</p>
      ) : !rows ? (
        <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          {t("section.routeMetrics.empty")}
        </p>
      ) : (
        <>
          {/* Mobile cards — 8-column table is unreadable on a phone. The card carries the same
              fields stacked: route header → count + p95/p99/err in one row → optional status
              distribution under an inline disclosure. Desktop keeps the full table. */}
          <div className="space-y-2 sm:hidden">
            {sorted.map((r) => {
              const id = `${r.method} ${r.uri}`;
              const hot = topFiveIds.has(id);
              const highError = r.errorRate >= 0.05;
              const isExpanded = expanded.has(id);
              const hasDist =
                r.statusDistribution && Object.keys(r.statusDistribution).length > 0;
              return (
                <div
                  key={id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
                  data-testid="route-metric-card"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-700 dark:text-slate-300">
                      {r.method}
                    </span>
                    <span
                      className={cn(
                        "truncate font-mono text-[12px]",
                        hot && "font-semibold text-slate-900 dark:text-slate-100",
                      )}
                      title={r.uri}
                    >
                      {r.uri}
                    </span>
                    <span
                      className={cn(
                        "ml-auto shrink-0 font-mono text-sm tabular-nums",
                        hot && "font-semibold text-slate-900 dark:text-slate-100",
                      )}
                    >
                      {formatNumber(r.count)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-[11px]">
                    {showP50 && (
                      <Stat label={t("section.routeMetrics.cols.p50")} value={r.p50Millis.toFixed(1)} />
                    )}
                    <Stat label={t("section.routeMetrics.cols.p95")} value={r.p95Millis.toFixed(1)} />
                    <Stat label={t("section.routeMetrics.cols.p99")} value={r.p99Millis.toFixed(1)} />
                    <Stat
                      label={t("section.routeMetrics.cols.errorRate")}
                      value={`${(r.errorRate * 100).toFixed(2)}%`}
                      emphasized={highError}
                      icon={highError ? <AlertTriangle className="h-3 w-3" /> : null}
                    />
                  </div>
                  {hasDist && (
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
                      aria-label={
                        isExpanded
                          ? t("section.routeMetrics.collapseStatusDist")
                          : t("section.routeMetrics.expandStatusDist")
                      }
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                      {t("section.routeMetrics.statusDist")}
                    </button>
                  )}
                  {isExpanded && hasDist && (
                    <div className="mt-2 rounded-md bg-slate-50 dark:bg-slate-800/50 p-2">
                      <StatusDistribution dist={r.statusDistribution} total={r.count} t={t} />
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
              <TH>{t("section.routeMetrics.cols.uri")}</TH>
              <TH className="w-20">{t("section.routeMetrics.cols.method")}</TH>
              <SortableHeader
                label={t("section.routeMetrics.cols.count")}
                active={sortKey === "count"}
                dir={sortDir}
                onClick={() => handleSort("count")}
              />
              {showP50 && (
                <SortableHeader
                  label={t("section.routeMetrics.cols.p50")}
                  active={sortKey === "p50"}
                  dir={sortDir}
                  onClick={() => handleSort("p50")}
                />
              )}
              <SortableHeader
                label={t("section.routeMetrics.cols.p95")}
                active={sortKey === "p95"}
                dir={sortDir}
                onClick={() => handleSort("p95")}
              />
              <SortableHeader
                label={t("section.routeMetrics.cols.p99")}
                active={sortKey === "p99"}
                dir={sortDir}
                onClick={() => handleSort("p99")}
              />
              <SortableHeader
                label={t("section.routeMetrics.cols.errorRate")}
                active={sortKey === "errorRate"}
                dir={sortDir}
                onClick={() => handleSort("errorRate")}
              />
            </TR>
          </THead>
          <TBody>
            {sorted.map((r) => {
              const id = `${r.method} ${r.uri}`;
              const hot = topFiveIds.has(id);
              const highError = r.errorRate >= 0.05;
              const isExpanded = expanded.has(id);
              const hasDist =
                r.statusDistribution && Object.keys(r.statusDistribution).length > 0;
              return (
                <Fragment key={id}>
                  <TR data-testid="route-metric-row">
                    <TD>
                      {hasDist && (
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
                              ? t("section.routeMetrics.collapseStatusDist")
                              : t("section.routeMetrics.expandStatusDist")
                          }
                          className="rounded p-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                          data-testid="route-metric-toggle"
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
                        "max-w-[280px] truncate font-mono text-[12px]",
                        hot && "font-semibold text-slate-900 dark:text-slate-100",
                      )}
                    >
                      {r.uri}
                    </TD>
                    <TD>
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-700 dark:text-slate-300">
                        {r.method}
                      </span>
                    </TD>
                    <TD
                      className={cn(
                        "text-right tabular-nums font-mono",
                        hot && "font-semibold",
                      )}
                    >
                      {formatNumber(r.count)}
                    </TD>
                    {showP50 && (
                      <TD className="text-right tabular-nums font-mono text-slate-600 dark:text-slate-300">
                        {r.p50Millis.toFixed(1)}
                      </TD>
                    )}
                    <TD className="text-right tabular-nums font-mono text-slate-600 dark:text-slate-300">
                      {r.p95Millis.toFixed(1)}
                    </TD>
                    <TD className="text-right tabular-nums font-mono text-slate-600 dark:text-slate-300">
                      {r.p99Millis.toFixed(1)}
                    </TD>
                    <TD className="text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums",
                          highError ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "text-slate-600 dark:text-slate-300",
                        )}
                        data-testid={highError ? "route-metric-high-error" : undefined}
                      >
                        {highError && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
                        {(r.errorRate * 100).toFixed(2)}%
                      </span>
                    </TD>
                  </TR>
                  {isExpanded && hasDist && (
                    <TR
                      data-testid="route-metric-distribution"
                      className="bg-slate-50 dark:bg-slate-800/50"
                    >
                      <TD />
                      <TD colSpan={showP50 ? 7 : 6} className="py-2">
                        <StatusDistribution
                          dist={r.statusDistribution}
                          total={r.count}
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

function Stat({
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

function StatusDistribution({
  dist,
  total,
  t,
}: {
  dist: Record<string, number>;
  total: number;
  t: (k: string) => string;
}) {
  const entries = Object.entries(dist).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="flex flex-wrap items-center gap-2 px-1 text-[11px]">
      <span className="text-slate-500 dark:text-slate-400">{t("section.routeMetrics.statusDist")}</span>
      {entries.map(([status, count]) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        const first = status.charAt(0);
        const isError = first === "5";
        const isClient = first === "4";
        return (
          <span
            key={status}
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono",
              isError
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                : isClient
                  ? "border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
            )}
            data-testid={`status-pill-${status}`}
          >
            <span className="font-semibold">{status}</span>
            <span className="tabular-nums">
              {formatNumber(count)} · {pct.toFixed(1)}%
            </span>
          </span>
        );
      })}
    </div>
  );
}
