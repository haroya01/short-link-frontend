"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import {
  getAdminActiveUsers,
  getAdminCohort,
  getAdminLifecycle,
  getAdminRecentErrors,
} from "@/lib/api";
import { Section } from "@/components/section";
import { cn } from "@/lib/utils";
import type {
  AdminActiveUsers,
  AdminCohort,
  AdminLifecycle,
  AdminRecentError,
} from "@/types";

/**
 * Deep analytics that go beyond the overview KPIs: lifecycle (clicks-after-creation curve),
 * active users (DAU/WAU/MAU toggle), cohort retention heatmap, and recent app errors. Backend
 * endpoints already exist (#72/#73 admin Phase 2/3); this component just visualises them.
 */
export function AdminDeepStats() {
  const t = useTranslations("admin");
  return (
    <div className="space-y-5">
      <ActiveUsersSection t={t} />
      <LifecycleSection t={t} />
      <CohortSection t={t} />
      <RecentErrorsSection t={t} />
    </div>
  );
}

type T = ReturnType<typeof useTranslations<"admin">>;

function ActiveUsersSection({ t }: { t: T }) {
  const [period, setPeriod] = useState<"DAU" | "WAU" | "MAU">("DAU");
  const [data, setData] = useState<AdminActiveUsers | null>(null);
  useEffect(() => {
    let cancelled = false;
    getAdminActiveUsers(period).then((d) => !cancelled && setData(d)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <Section title={t("section.activeUsers.title")} description={t("section.activeUsers.desc")}>
      <div className="mb-3 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white p-0.5">
        {(["DAU", "WAU", "MAU"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              "rounded px-3 py-1 text-xs font-mono transition",
              period === p ? "bg-accent-600 text-white" : "text-slate-600 hover:bg-slate-50",
            )}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data?.buckets ?? []}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="bucket"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12 }}
            />
            <Bar dataKey="active" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Section>
  );
}

function LifecycleSection({ t }: { t: T }) {
  const [data, setData] = useState<AdminLifecycle | null>(null);
  useEffect(() => {
    getAdminLifecycle(30).then(setData).catch(() => {});
  }, []);

  return (
    <Section title={t("section.lifecycle.title")} description={t("section.lifecycle.desc")}>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data?.days ?? []}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              label={{ value: "day", fontSize: 10, fill: "#94a3b8", position: "insideBottom" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke="#059669"
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Section>
  );
}

function CohortSection({ t }: { t: T }) {
  const [data, setData] = useState<AdminCohort | null>(null);
  useEffect(() => {
    getAdminCohort(8).then(setData).catch(() => {});
  }, []);

  return (
    <Section title={t("section.cohort.title")} description={t("section.cohort.desc")}>
      {!data ? (
        <p className="py-8 text-center text-xs text-slate-500">{t("loading")}</p>
      ) : data.rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500">{t("section.cohort.empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                <th className="px-2 py-1.5 text-left font-medium text-slate-500">
                  {t("section.cohort.cohortCol")}
                </th>
                <th className="px-2 py-1.5 text-right font-medium text-slate-500">
                  {t("section.cohort.sizeCol")}
                </th>
                {Array.from({ length: data.weeks }).map((_, i) => (
                  <th key={i} className="px-2 py-1.5 text-center font-mono font-medium text-slate-500">
                    +{i}w
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.cohortWeek} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono text-[11px] text-slate-700">
                    {row.cohortWeek}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-slate-700">
                    {row.size}
                  </td>
                  {Array.from({ length: data.weeks }).map((_, i) => {
                    const cell = row.cells.find((c) => c.weekOffset === i);
                    if (!cell) return <td key={i} />;
                    const intensity = Math.min(1, cell.ratio);
                    return (
                      <td
                        key={i}
                        className="px-2 py-1.5 text-center font-mono tabular-nums"
                        style={{
                          backgroundColor: `rgba(14, 165, 233, ${intensity * 0.5})`,
                          color: intensity > 0.5 ? "#fff" : "#0f172a",
                        }}
                        title={`active=${cell.active}, ratio=${(cell.ratio * 100).toFixed(1)}%`}
                      >
                        {(cell.ratio * 100).toFixed(0)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function RecentErrorsSection({ t }: { t: T }) {
  const [data, setData] = useState<AdminRecentError[] | null>(null);
  useEffect(() => {
    getAdminRecentErrors(20).then(setData).catch(() => {});
  }, []);

  return (
    <Section title={t("section.recentErrors.title")} description={t("section.recentErrors.desc")}>
      {!data ? (
        <p className="py-8 text-center text-xs text-slate-500">{t("loading")}</p>
      ) : data.length === 0 ? (
        <p className="py-8 text-center text-xs text-emerald-600">
          {t("section.recentErrors.empty")}
        </p>
      ) : (
        <div className="space-y-1.5">
          {data.map((e, i) => (
            <div
              key={i}
              className={cn(
                "rounded-md border px-3 py-2 text-xs",
                e.level === "ERROR"
                  ? "border-red-200 bg-red-50"
                  : "border-amber-200 bg-amber-50",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                    e.level === "ERROR" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700",
                  )}
                >
                  {e.level}
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {e.occurredAt.replace("T", " ").slice(0, 19)}
                </span>
                <span className="truncate font-mono text-[10px] text-slate-500">
                  {e.logger.split(".").pop()}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 break-all font-mono text-[11px] text-slate-700">
                {e.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
