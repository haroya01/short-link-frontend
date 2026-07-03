"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Activity, Link2, MousePointerClick, Users } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { ApiError, getAdminHealthMetrics, getAdminOverview } from "@/lib/api";
import { AdminAccessToken } from "@/components/admin/access-token";
import { AdminDeepStats } from "@/components/admin/deep-stats";
import { AdminLinkMetrics } from "@/components/admin/link-metrics";
import { AdminRequestMetrics } from "@/components/admin/request-metrics";
import { AdminRouteMetrics } from "@/components/admin/route-metrics";
import { AdminTopLinksTable, AdminTopUsersTable } from "@/components/admin/top-tables";
import { Section } from "@/components/common/section";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/utils";
import type { AdminHealthMetrics, AdminOverview } from "@/types";

export default function AdminPage() {
  const t = useTranslations("admin");
  const { ready, authenticated, isAdmin } = useAuth();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [health, setHealth] = useState<AdminHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getAdminOverview(), getAdminHealthMetrics()])
      .then(([d, h]) => {
        if (!cancelled) {
          setData(d);
          setHealth(h);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          // 401/403 means the client believed the user was admin but the backend disagrees —
          // expired token, role just revoked, or a tampered local claim. Either way, surface
          // the same 404 the unauthenticated path uses so we never leak "admin exists" to
          // someone whose access was just rejected by the server.
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            notFound();
          } else {
            setError(err instanceof Error ? err.message : "load failed");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, isAdmin, tick, t]);

  // Security: the admin surface exists only for ADMIN-role users. Anyone else — anonymous or
  // signed-in non-admin — must see the standard 404, never a "sign in required" or "admin only"
  // message. Leaking the existence of an admin route gives attackers a target to spray
  // credentials against; rendering 404 makes the route indistinguishable from any made-up path.
  // The auth check runs client-side (useAuth hits /me), so we keep the skeleton until `ready`
  // resolves to avoid a flash-of-404 for legitimate admins on slow networks.
  if (ready && (!authenticated || !isAdmin)) {
    notFound();
  }

  if (loading) {
    return (
      <div className="container max-w-6xl space-y-5 py-10">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-2xl py-10">
        <ErrorState message={error} onRetry={() => setTick((n) => n + 1)} />
      </div>
    );
  }

  if (!data) return null;

  const trendData = mergeTrends(data);

  return (
    <div className="container max-w-6xl space-y-5 py-10">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-tagline text-slate-500 dark:text-slate-400">
          {t("label")}
        </p>
        <h2 className="mt-1 text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">{t("title")}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
        <nav className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/users"
            className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Users className="h-3.5 w-3.5 text-accent-600" />
            {t("browse.usersTab")}
          </Link>
          <Link
            href="/admin/links"
            className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Link2 className="h-3.5 w-3.5 text-accent-600" />
            {t("browse.linksTab")}
          </Link>
        </nav>
      </div>

      <AdminAccessToken />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi
          label={t("kpi.users")}
          value={formatNumber(data.totals?.users ?? 0)}
          sub={t("kpi.delta7d", { count: data.newUsers7d ?? 0 })}
          icon={Users}
        />
        <Kpi
          label={t("kpi.links")}
          value={formatNumber(data.totals?.links ?? 0)}
          sub={t("kpi.delta7d", { count: data.newLinks7d ?? 0 })}
          icon={Link2}
        />
        <Kpi
          label={t("kpi.clicks")}
          value={formatNumber(data.totals?.clicks ?? 0)}
          sub={t("kpi.delta7d", { count: formatNumber(data.clicks7d ?? 0) })}
          icon={MousePointerClick}
          accent
        />
        <Kpi
          label={t("kpi.anonymousRatio")}
          value={`${((data.anonymousLinkRatio ?? 0) * 100).toFixed(1)}%`}
          sub={t("kpi.ofAllLinks")}
          icon={Activity}
        />
        <Kpi
          label={t("kpi.expiredRatio")}
          value={`${((data.expiredLinkRatio ?? 0) * 100).toFixed(1)}%`}
          sub={t("kpi.ofAllLinks")}
          icon={Activity}
        />
        <Kpi
          label={t("kpi.clicklessRatio")}
          value={`${((data.clicklessLinkRatio ?? 0) * 100).toFixed(1)}%`}
          sub={t("kpi.ofAllLinks")}
          icon={Activity}
          muted
        />
      </div>

      <Section title={t("section.trend.title")} description={t("section.trend.desc")}>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(v: string) => v.slice(5)}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {/* Three series share one accent — clicks (the lead metric) carries brand-600,
                  links + signups lean on slate so the chart reads as brand-anchored rather than
                  rainbow-coded. Distinguishable by hue weight, not unrelated palettes. */}
              <Line
                type="monotone"
                dataKey="signups"
                stroke="#94a3b8"
                strokeWidth={1.5}
                dot={false}
                name={t("trend.signups")}
              />
              <Line
                type="monotone"
                dataKey="links"
                stroke="#334155"
                strokeWidth={1.5}
                dot={false}
                name={t("trend.links")}
              />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#059669"
                strokeWidth={1.5}
                dot={false}
                name={t("trend.clicks")}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section
          title={t("section.topUsersByLinks.title")}
          description={t("section.topUsersByLinks.desc")}
        >
          <AdminTopUsersTable
            variant="links"
            initialItems={data.topUsersByLinks ?? []}
            initialTotal={data.topUsersByLinksTotal ?? 0}
          />
        </Section>
        <Section
          title={t("section.topUsersByClicks.title")}
          description={t("section.topUsersByClicks.desc")}
        >
          <AdminTopUsersTable
            variant="clicks"
            initialItems={data.topUsersByClicks ?? []}
            initialTotal={data.topUsersByClicksTotal ?? 0}
          />
        </Section>
      </div>

      {health?.redirect && (
        <Section
          title={t("section.redirectPerf.title")}
          description={t("section.redirectPerf.desc")}
        >
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800 sm:grid-cols-4 lg:grid-cols-7">
            <Kpi
              label={t("section.redirectPerf.p50")}
              value={`${(health.redirect.p50Millis ?? 0).toFixed(1)}ms`}
              sub={t("section.redirectPerf.median")}
              icon={Activity}
            />
            <Kpi
              label={t("section.redirectPerf.p95")}
              value={`${(health.redirect.p95Millis ?? 0).toFixed(1)}ms`}
              sub={t("section.redirectPerf.tail")}
              icon={Activity}
              accent
            />
            <Kpi
              label={t("section.redirectPerf.p99")}
              value={`${(health.redirect.p99Millis ?? 0).toFixed(1)}ms`}
              sub={t("section.redirectPerf.outlier")}
              icon={Activity}
            />
            <Kpi
              label={t("section.redirectPerf.total")}
              value={formatNumber(health.redirect.total ?? 0)}
              sub={t("section.redirectPerf.totalSub")}
              icon={MousePointerClick}
            />
            <Kpi
              label={t("section.redirectPerf.notFound")}
              value={formatNumber(health.redirect.notFound ?? 0)}
              sub={t("section.redirectPerf.notFoundSub")}
              icon={Activity}
              muted
            />
            <Kpi
              label={t("section.redirectPerf.expired")}
              value={formatNumber(health.redirect.expired ?? 0)}
              sub={t("section.redirectPerf.expiredSub")}
              icon={Activity}
              muted
            />
            <Kpi
              label={t("section.redirectPerf.preview")}
              value={formatNumber(health.redirect.previews ?? 0)}
              sub={t("section.redirectPerf.previewSub")}
              icon={Activity}
              muted
            />
          </div>
        </Section>
      )}

      <AdminRouteMetrics />

      <AdminLinkMetrics />

      <AdminRequestMetrics />

      <AdminDeepStats />

      <Section title={t("section.topLinks.title")} description={t("section.topLinks.desc")}>
        <AdminTopLinksTable
          initialItems={data.topLinksByClicks ?? []}
          initialTotal={data.topLinksByClicksTotal ?? 0}
        />
      </Section>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  muted,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <span className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${
            accent ? "text-accent-600 dark:text-accent-400" : muted ? "text-slate-500 dark:text-slate-400" : "text-slate-500 dark:text-slate-400"
          }`}
        />
      </div>
      <p className="mt-2 font-mono text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
        {value}
      </p>
      {sub && <p className="mt-1 truncate text-[10px] text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

type TrendRow = { date: string; signups: number; links: number; clicks: number };

function mergeTrends(d: AdminOverview): TrendRow[] {
  // BE returns the daily* arrays as null when a fresh DB has no events yet — iterating
  // {@code for (const p of null)} throws TypeError "undefined is not iterable" and tanks
  // the whole admin page through global-error.tsx (the recent /ko/admin "Application
  // error" reports). Null-coalesce to [] so empty state renders an empty chart rather than
  // crashing the route.
  const map = new Map<string, TrendRow>();
  for (const p of d.dailySignups ?? []) {
    map.set(p.date, { date: p.date, signups: p.count, links: 0, clicks: 0 });
  }
  for (const p of d.dailyLinks ?? []) {
    const row = map.get(p.date) ?? { date: p.date, signups: 0, links: 0, clicks: 0 };
    row.links = p.count;
    map.set(p.date, row);
  }
  for (const p of d.dailyClicks ?? []) {
    const row = map.get(p.date) ?? { date: p.date, signups: 0, links: 0, clicks: 0 };
    row.clicks = p.count;
    map.set(p.date, row);
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
