"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useLinkStats } from "@/lib/api/stats.queries";
import { useLinkDetail } from "@/lib/api/links.queries";
import { usePacedRefresh } from "@/hooks/use-paced-refresh";
import { Link } from "@/i18n/navigation";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { StatsBackLink } from "./_components/back-button";
import { StatsSkeleton } from "./_components/stats-skeleton";
import { StatsBody } from "./_components/stats-body";
import { LinksPage } from "@/components/links/links-page";

const FULL_REPORT_MIN_INTERVAL_MS = 60_000;

export default function StatsPage() {
  const params = useParams<{ code: string }>();
  const t = useTranslations("stats");
  const { authenticated, ready } = useAuth();
  const code = params.code;

  const [shortUrl, setShortUrl] = useState<string>(() =>
    process.env.NEXT_PUBLIC_API_BASE ? `${process.env.NEXT_PUBLIC_API_BASE.replace(/\/$/, "")}/${code}` : "",
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Short codes live on the backend host (kurl.me/{code}), not on the frontend (app.kurl.me).
      // API_BASE points at the backend, which is what we display + share. Fallback to the page
      // origin only for local dev where everything runs on one host.
      const base =
        process.env.NEXT_PUBLIC_API_BASE ??
        `${window.location.protocol}//${window.location.host}`;
      setShortUrl(`${base.replace(/\/$/, "")}/${code}`);
    }
  }, [code]);

  const { data, error, isLoading, refetch, dataUpdatedAt } = useLinkStats(code, {
    enabled: ready && authenticated && !!code,
  });
  useLinkDetail(ready && authenticated ? code : undefined);

  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);
  const refreshNow = useCallback(() => {
    void refetchRef.current({ cancelRefetch: false });
  }, []);
  const markStale = usePacedRefresh(refreshNow, dataUpdatedAt, FULL_REPORT_MIN_INTERVAL_MS);

  // Hold the skeleton through the auth bootstrap too: a disabled query reports isLoading=false with
  // data=undefined, which would otherwise fall through to the "not found" empty state on first paint.
  const loading = !ready || isLoading;

  // 404 = link doesn't exist (or not owned). Map to the empty state, not an error toast.
  const notFound = error instanceof ApiError && error.status === 404;
  const realError = Boolean(error) && !notFound;

  if (ready && !authenticated) {
    return (
      <SignInEmptyState page reason="stats" />
    );
  }

  return (
    <LinksPage className="space-y-5">
      <StatsBackLink />

      {loading ? (
        <StatsSkeleton shortCode={code} />
      ) : realError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : notFound || !data ? (
        <EmptyState
          title={t("notFound")}
          description={t("notFoundDesc")}
          action={
            <Link href="/dashboard" className="focus-ring rounded-sm text-[15px] font-medium text-accent-700 underline-offset-4 hover:underline dark:text-accent-400">
              {t("backToDashboard")}
            </Link>
          }
        />
      ) : (
        <StatsBody
          data={data}
          shortUrl={shortUrl}
          onLiveClick={markStale}
          onChanged={refreshNow}
          shortCodeLabel={t("shortCode")}
        />
      )}
    </LinksPage>
  );
}
