"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { getAdminRouteMetrics } from "@/lib/api";
import { Section } from "@/components/section";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";
import type { AdminRouteMetric } from "@/types";

type SortKey = "count" | "p50" | "p95" | "p99" | "errorRate";

/**
 * Route-level breakdown of `http.server.requests`. The existing health-metrics section sums
 * everything together so a single hot endpoint can be hidden behind a fleet of cheap GETs;
 * this table surfaces (uri, method) so admins can pinpoint which route is slow or erroring.
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

  useEffect(() => {
    let cancelled = false;
    getAdminRouteMetrics()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "load failed");
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <Section
      title={t("section.routeMetrics.title")}
      description={t("section.routeMetrics.desc")}
    >
      {error ? (
        <p className="py-8 text-center text-xs text-slate-500">{error}</p>
      ) : !rows ? (
        <p className="py-8 text-center text-xs text-slate-500">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500">
          {t("section.routeMetrics.empty")}
        </p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{t("section.routeMetrics.cols.uri")}</TH>
              <TH className="w-20">{t("section.routeMetrics.cols.method")}</TH>
              <SortableHeader
                label={t("section.routeMetrics.cols.count")}
                active={sortKey === "count"}
                dir={sortDir}
                onClick={() => handleSort("count")}
              />
              <SortableHeader
                label={t("section.routeMetrics.cols.p50")}
                active={sortKey === "p50"}
                dir={sortDir}
                onClick={() => handleSort("p50")}
              />
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
              return (
                <TR key={id} data-testid="route-metric-row">
                  <TD
                    className={cn(
                      "max-w-[280px] truncate font-mono text-[12px]",
                      hot && "font-semibold text-slate-900",
                    )}
                  >
                    {r.uri}
                  </TD>
                  <TD>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-700">
                      {r.method}
                    </span>
                  </TD>
                  <TD className={cn("text-right tabular-nums font-mono", hot && "font-semibold")}>
                    {formatNumber(r.count)}
                  </TD>
                  <TD className="text-right tabular-nums font-mono text-slate-600">
                    {r.p50Millis.toFixed(1)}
                  </TD>
                  <TD className="text-right tabular-nums font-mono text-slate-600">
                    {r.p95Millis.toFixed(1)}
                  </TD>
                  <TD className="text-right tabular-nums font-mono text-slate-600">
                    {r.p99Millis.toFixed(1)}
                  </TD>
                  <TD className="text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums",
                        highError ? "bg-slate-900 text-white" : "text-slate-600",
                      )}
                      data-testid={highError ? "route-metric-high-error" : undefined}
                    >
                      {highError && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
                      {(r.errorRate * 100).toFixed(2)}%
                    </span>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </Section>
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
          "inline-flex items-center gap-1 transition-colors hover:text-slate-900",
          active ? "text-accent-700" : "text-slate-500",
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
