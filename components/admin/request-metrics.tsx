"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Eye, Search } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import {
  getRequestOutcomes,
  getRequestRouteAggregates,
  getRequestRows,
} from "@/lib/api";
import {
  MOCK_OUTCOME_DISTRIBUTION,
  MOCK_RAW_ROWS,
  MOCK_ROUTE_AGGREGATES,
} from "@/lib/admin-request-metrics-mock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/common/section";
import { cn, formatNumber } from "@/lib/utils";
import type {
  AdminOutcomeDistribution,
  AdminRequestMetricsWindow,
  AdminRequestRawRow,
  AdminRouteAggregate,
} from "@/types";

const WINDOWS: AdminRequestMetricsWindow[] = ["1h", "24h", "7d"];

/**
 * Reads from the new {@code request_metrics} table (every finished request, persisted async).
 * Three sub-sections share one window selector:
 *
 * <ol>
 *   <li><b>Routes</b> — per-route count / p50 / p95 / p99 / error rate + status & outcome
 *       breakdown. Same shape as the legacy {@link AdminRouteMetrics} but driven by raw rows
 *       instead of the Micrometer timer ring.
 *   <li><b>Outcomes by shortCode</b> — paste a code, get the redirect / not_found / expired /
 *       blocked split. Answers "why this short URL is bouncing for users" without grepping logs.
 *   <li><b>Recent rows</b> — paged raw drill-down for incident triage.
 * </ol>
 *
 * <p>If any of these come back empty (fresh deploy, no traffic yet), the "show sample" toggle
 * loads {@link MOCK_ROUTE_AGGREGATES} etc. so the operator can see what the section will look
 * like before flipping back to live data. The mocks live in code, not behind a env flag — that
 * way the toggle is visible during a real incident too if someone wants a layout reference.
 */
export function AdminRequestMetrics() {
  const t = useTranslations("admin");
  const fmt = useFormatter();
  const [windowSel, setWindowSel] = useState<AdminRequestMetricsWindow>("1h");
  const [showMock, setShowMock] = useState(false);

  return (
    <Section
      title={t("section.requestMetrics.title")}
      description={t("section.requestMetrics.desc")}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
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
              data-testid={`request-metrics-window-${w}`}
            >
              {t(`section.requestMetrics.window.${w}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowMock((v) => !v)}
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
            showMock
              ? "bg-amber-100 dark:bg-amber-500/15 text-amber-900 ring-1 ring-amber-300"
              : "border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50",
          )}
          data-testid="request-metrics-mock-toggle"
        >
          <Eye className="h-3 w-3" />
          {showMock
            ? t("section.requestMetrics.mockOn")
            : t("section.requestMetrics.mockOff")}
        </button>
      </div>

      <div className="space-y-6">
        <RouteAggregates window={windowSel} showMock={showMock} t={t} />
        <OutcomeLookup window={windowSel} showMock={showMock} t={t} />
        <RecentRows window={windowSel} showMock={showMock} t={t} fmt={fmt} />
      </div>
    </Section>
  );
}

function RouteAggregates({
  window,
  showMock,
  t,
}: {
  window: AdminRequestMetricsWindow;
  showMock: boolean;
  t: ReturnType<typeof useTranslations<"admin">>;
}) {
  const [rows, setRows] = useState<AdminRouteAggregate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showMock) {
      setRows(MOCK_ROUTE_AGGREGATES);
      setError(null);
      return;
    }
    let cancelled = false;
    setRows(null);
    setError(null);
    getRequestRouteAggregates(window)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "load failed");
      });
    return () => {
      cancelled = true;
    };
  }, [window, showMock]);

  return (
    <Sub title={t("section.requestMetrics.routes.title")}>
      {error ? (
        <Empty msg={error} />
      ) : rows === null ? (
        <Empty msg={t("loading")} />
      ) : rows.length === 0 ? (
        <Empty msg={t("section.requestMetrics.routes.empty")} />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <RouteAggregateCard key={`${r.method} ${r.route}`} row={r} t={t} />
          ))}
        </div>
      )}
    </Sub>
  );
}

function RouteAggregateCard({
  row,
  t,
}: {
  row: AdminRouteAggregate;
  t: ReturnType<typeof useTranslations<"admin">>;
}) {
  const highError = row.errorRate >= 0.05;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3" data-testid="request-route-card">
      <div className="flex items-center gap-2">
        <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-700 dark:text-slate-300">
          {row.method}
        </span>
        <span className="truncate font-mono text-[12px] text-slate-900 dark:text-slate-100" title={row.route}>
          {row.route}
        </span>
        <span className="ml-auto shrink-0 font-mono text-sm tabular-nums text-slate-900 dark:text-slate-100">
          {formatNumber(row.count)}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-[11px]">
        <MetricStat label="p50" value={row.p50.toFixed(1)} />
        <MetricStat label="p95" value={row.p95.toFixed(1)} />
        <MetricStat label="p99" value={row.p99.toFixed(1)} />
        <MetricStat
          label={t("section.requestMetrics.routes.err")}
          value={`${(row.errorRate * 100).toFixed(2)}%`}
          emphasized={highError}
          icon={highError ? <AlertTriangle className="h-3 w-3" /> : null}
        />
      </div>
      {Object.keys(row.outcomeDistribution).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.entries(row.outcomeDistribution).map(([outcome, count]) => (
            <span
              key={outcome}
              className="inline-flex items-center gap-1 rounded-full bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-300"
            >
              <span className="font-medium">{outcome}</span>
              <span className="tabular-nums text-slate-400 dark:text-slate-500">{formatNumber(count)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function OutcomeLookup({
  window,
  showMock,
  t,
}: {
  window: AdminRequestMetricsWindow;
  showMock: boolean;
  t: ReturnType<typeof useTranslations<"admin">>;
}) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<AdminOutcomeDistribution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showMock) return;
    // Showing the mock = pin the sample distribution so the user can see what the column reads
    // like. Clearing the toggle drops back to whatever the last live lookup produced.
    setResult(MOCK_OUTCOME_DISTRIBUTION);
    setError(null);
  }, [showMock, window]);

  async function lookup() {
    const code = input.trim();
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const r = await getRequestOutcomes(code, window);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sub title={t("section.requestMetrics.outcomes.title")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup();
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("section.requestMetrics.outcomes.placeholder")}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Button type="submit" size="sm" disabled={loading || !input.trim()}>
          {loading ? "…" : t("section.requestMetrics.outcomes.lookup")}
        </Button>
      </form>

      {error && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{error}</p>}
      {result && (
        <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[12px] text-slate-900 dark:text-slate-100">/{result.shortCode}</span>
            <span className="font-mono text-sm tabular-nums text-slate-900 dark:text-slate-100">
              {formatNumber(result.total)}
            </span>
          </div>
          {Object.keys(result.outcomes).length > 0 ? (
            <div className="mt-2 space-y-1">
              {Object.entries(result.outcomes).map(([outcome, count]) => {
                const pct = result.total > 0 ? count / result.total : 0;
                return (
                  <div key={outcome} className="flex items-center gap-2 text-[11px]">
                    <span className="w-24 shrink-0 truncate font-medium text-slate-700 dark:text-slate-300">{outcome}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-accent-500"
                        style={{ width: `${(pct * 100).toFixed(1)}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {(pct * 100).toFixed(1)}%
                    </span>
                    <span className="w-10 shrink-0 text-right tabular-nums font-mono text-slate-500 dark:text-slate-400">
                      {formatNumber(count)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              {t("section.requestMetrics.outcomes.empty")}
            </p>
          )}
        </div>
      )}
    </Sub>
  );
}

function RecentRows({
  window,
  showMock,
  t,
  fmt,
}: {
  window: AdminRequestMetricsWindow;
  showMock: boolean;
  t: ReturnType<typeof useTranslations<"admin">>;
  fmt: ReturnType<typeof useFormatter>;
}) {
  const [rows, setRows] = useState<AdminRequestRawRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showMock) {
      setRows(MOCK_RAW_ROWS);
      setError(null);
      return;
    }
    let cancelled = false;
    setRows(null);
    setError(null);
    const to = new Date();
    const fromMs =
      window === "1h" ? 3_600_000 : window === "24h" ? 86_400_000 : 7 * 86_400_000;
    const from = new Date(to.getTime() - fromMs);
    getRequestRows({
      from: from.toISOString(),
      to: to.toISOString(),
      limit: 50,
    })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "load failed");
      });
    return () => {
      cancelled = true;
    };
  }, [window, showMock]);

  return (
    <Sub title={t("section.requestMetrics.rows.title")}>
      {error ? (
        <Empty msg={error} />
      ) : rows === null ? (
        <Empty msg={t("loading")} />
      ) : rows.length === 0 ? (
        <Empty msg={t("section.requestMetrics.rows.empty")} />
      ) : (
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <RawRow key={`${r.occurredAt}-${i}`} row={r} fmt={fmt} />
          ))}
        </div>
      )}
    </Sub>
  );
}

function RawRow({
  row,
  fmt,
}: {
  row: AdminRequestRawRow;
  fmt: ReturnType<typeof useFormatter>;
}) {
  const outcomeStyle = row.status >= 500 ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : row.status >= 400 ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5"
      data-testid="request-raw-row"
    >
      <span className="shrink-0 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-700 dark:text-slate-300">
        {row.method}
      </span>
      <span className="truncate font-mono text-[11px] text-slate-900 dark:text-slate-100" title={row.route}>
        {row.route}
      </span>
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium",
          outcomeStyle,
        )}
      >
        {row.status}
      </span>
      <span className="hidden shrink-0 truncate text-[10px] text-slate-500 dark:text-slate-400 sm:inline">
        {row.outcome}
      </span>
      <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
        {row.latencyMs}ms
      </span>
      <span
        className="shrink-0 font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500"
        title={row.occurredAt}
      >
        {fmt.relativeTime(new Date(row.occurredAt), { now: new Date() })}
      </span>
    </div>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">{msg}</p>;
}

function MetricStat({
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
