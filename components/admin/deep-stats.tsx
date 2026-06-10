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
import { Section } from "@/components/common/section";
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
      <div className="mb-3 inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
        {(["DAU", "WAU", "MAU"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              "rounded px-3 py-1 text-xs font-mono transition",
              period === p ? "bg-accent-700 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50",
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
        <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{t("loading")}</p>
      ) : (data.rows ?? []).length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{t("section.cohort.empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                <th className="px-2 py-1.5 text-left font-medium text-slate-500 dark:text-slate-400">
                  {t("section.cohort.cohortCol")}
                </th>
                <th className="px-2 py-1.5 text-right font-medium text-slate-500 dark:text-slate-400">
                  {t("section.cohort.sizeCol")}
                </th>
                {Array.from({ length: data.weeks }).map((_, i) => (
                  <th key={i} className="px-2 py-1.5 text-center font-mono font-medium text-slate-500 dark:text-slate-400">
                    +{i}w
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.rows ?? []).map((row) => (
                <tr key={row.cohortWeek} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {row.cohortWeek}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {row.size}
                  </td>
                  {Array.from({ length: data.weeks }).map((_, i) => {
                    const cell = (row.cells ?? []).find((c) => c.weekOffset === i);
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
  const [reloadTick, setReloadTick] = useState(0);
  const [levelFilter, setLevelFilter] = useState<"ALL" | "ERROR" | "WARN">("ALL");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getAdminRecentErrors(100)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData([]));
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const filtered = (data ?? []).filter((e) => {
    if (levelFilter !== "ALL" && e.level !== levelFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.message ?? "").toLowerCase().includes(q) ||
      (e.exceptionClass ?? "").toLowerCase().includes(q) ||
      (e.logger ?? "").toLowerCase().includes(q) ||
      (e.taskName ?? "").toLowerCase().includes(q) ||
      (e.requestUri ?? "").toLowerCase().includes(q)
    );
  });

  const toggle = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <Section
      title={t("section.recentErrors.title")}
      description={t("section.recentErrors.desc")}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
          {(["ALL", "ERROR", "WARN"] as const).map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => setLevelFilter(lv)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[11px] transition",
                levelFilter === lv
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50",
              )}
            >
              {lv === "ALL" ? t("section.recentErrors.filter.all") : lv}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("section.recentErrors.searchPlaceholder")}
          className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 font-mono text-[11px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setReloadTick((n) => n + 1)}
          className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 font-mono text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          {t("section.recentErrors.reload")}
        </button>
      </div>

      {!data ? (
        <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{t("loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-xs text-emerald-600 dark:text-emerald-400">
          {data.length === 0
            ? t("section.recentErrors.empty")
            : t("section.recentErrors.emptyFiltered")}
        </p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((e, i) => {
            const ts = e.timestamp ?? e.occurredAt ?? "";
            const isOpen = expanded.has(i);
            return (
              <div
                key={i}
                className={cn(
                  "rounded-md border bg-white dark:bg-slate-900 text-xs",
                  e.level === "ERROR" ? "border-slate-300 dark:border-slate-700" : "border-slate-200 dark:border-slate-800",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full",
                      e.level === "ERROR" ? "bg-slate-900" : "bg-amber-500",
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                      e.level === "ERROR"
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                        : "bg-amber-100 dark:bg-amber-500/15 text-amber-800",
                    )}
                  >
                    {e.level}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300" title={ts}>
                        {formatAbsolute(ts)}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        ({formatRelative(ts, t)})
                      </span>
                      {e.exceptionClass && (
                        <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">
                          {shortClassName(e.exceptionClass)}
                        </span>
                      )}
                      {e.taskName && (
                        <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                          task={e.taskName}
                        </span>
                      )}
                      {e.requestMethod && e.requestUri && (
                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                          {e.requestMethod} {e.requestUri}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 break-all font-mono text-[11px] text-slate-800 dark:text-slate-200">
                      {e.message}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      {e.logger}
                    </p>
                  </div>
                  <span className="mt-0.5 shrink-0 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 px-3 py-2 text-[11px]">
                    <DetailGrid e={e} t={t} />
                    {e.causeChain && e.causeChain.length > 0 && (
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {t("section.recentErrors.detail.causeChain")}
                        </p>
                        <ol className="mt-1 space-y-0.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {e.causeChain.map((c, idx) => (
                            <li key={idx} className="break-all">
                              {idx + 1}. {c}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {e.stackTrace && (
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t("section.recentErrors.detail.stackTrace")}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(e.stackTrace ?? "");
                            }}
                            className="rounded border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            {t("section.recentErrors.detail.copy")}
                          </button>
                        </div>
                        <pre className="mt-1 max-h-60 overflow-auto rounded bg-slate-50 dark:bg-slate-800/50 p-2 font-mono text-[10px] leading-snug text-slate-800 dark:text-slate-200">
                          {e.stackTrace}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function DetailGrid({ e, t }: { e: AdminRecentError; t: T }) {
  const rows: { label: string; value: string | null | undefined }[] = [
    { label: t("section.recentErrors.detail.thread"), value: e.thread },
    { label: t("section.recentErrors.detail.requestId"), value: e.requestId },
    { label: t("section.recentErrors.detail.userId"), value: e.userId },
    { label: t("section.recentErrors.detail.clientIp"), value: e.clientIp },
    {
      label: t("section.recentErrors.detail.exception"),
      value: e.exceptionClass
        ? `${e.exceptionClass}${e.exceptionMessage ? ": " + e.exceptionMessage : ""}`
        : null,
    },
  ];
  const present = rows.filter((r) => r.value);
  if (present.length === 0) return null;
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 font-mono">
      {present.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{r.label}</dt>
          <dd className="break-all text-[11px] text-slate-800 dark:text-slate-200">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function shortClassName(fqcn: string): string {
  const idx = fqcn.lastIndexOf(".");
  return idx === -1 ? fqcn : fqcn.substring(idx + 1);
}

function formatAbsolute(iso: string): string {
  if (!iso) return "—";
  // Use the operator's local timezone — admin viewer is always a human, not a parser. ISO output
  // (yyyy-mm-dd HH:mm:ss) keeps the column scannable and grep-friendly.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.replace("T", " ").slice(0, 19);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatRelative(iso: string, t: T): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 5) return t("section.recentErrors.relative.justNow");
  if (seconds < 60) return t("section.recentErrors.relative.secAgo", { n: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("section.recentErrors.relative.minAgo", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("section.recentErrors.relative.hourAgo", { n: hours });
  const days = Math.floor(hours / 24);
  return t("section.recentErrors.relative.dayAgo", { n: days });
}
