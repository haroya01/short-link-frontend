"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { ApiError, getAdminLinkDetail } from "@/lib/api";
import { ErrorState } from "@/components/common/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import type { AdminLinkDetail } from "@/types";
import { DetailStats } from "./_components/detail-stats";
import { MetaCard } from "./_components/meta-card";

export default function AdminLinkDetailPage() {
  const t = useTranslations("admin");
  const params = useParams<{ code: string }>();
  const code = params.code;
  const { ready, authenticated, isAdmin } = useAuth();

  const [data, setData] = useState<AdminLinkDetail | null>(null);
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
    getAdminLinkDetail(code)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (cancelled) return;
        // 401/403 = the client thought it was admin but the backend disagrees — surface the same
        // hard 404 the rest of the admin surface uses so the route never leaks.
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
  }, [ready, authenticated, isAdmin, code, tick]);

  // Admin surface is invisible to non-admins: keep the skeleton until `ready`, then a hard 404 for
  // anyone anonymous or non-admin — never a login bounce or an "admin only" hint.
  if (!ready) return null;
  if (!authenticated || !isAdmin) notFound();

  return (
    <main className="container max-w-6xl space-y-5 py-10">
      <Link
        href="/admin/links"
        className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("detail.back")}
      </Link>

      {loading ? (
        <div className="space-y-5">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => setTick((n) => n + 1)} />
      ) : data ? (
        <>
          <MetaCard meta={data.meta} />
          <DetailStats stats={data.stats} />
        </>
      ) : null}
    </main>
  );
}
