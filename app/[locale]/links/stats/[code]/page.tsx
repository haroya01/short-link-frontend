"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useLinkStats } from "@/lib/api/stats.queries";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { LinksAuthGate } from "@/components/links/auth-gate";
import { useToast } from "@/components/ui/toast";
import { HeaderSkeleton } from "./_components/header";
import { StatsBody } from "./_components/stats-body";

// The live click feed fires one SSE tick per click (no backend batching). Refetching the heavy
// stats aggregation on every tick floods a busy link, so collapse ticks into at most one refetch
// per window.
const STATS_REFETCH_THROTTLE_MS = 5000;

export default function StatsPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("stats");
  const tResult = useTranslations("result");
  const { authenticated, ready } = useAuth();
  const { toast } = useToast();
  const code = params.code;

  const [shortUrl, setShortUrl] = useState<string>("");

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

  const { data, error, isLoading, refetch } = useLinkStats(code, {
    enabled: ready && authenticated && !!code,
  });

  // Throttle SSE-driven refetches to one per window. Read refetch from a ref so handleTick keeps a
  // stable identity (it feeds the EventSource hook, which should not tear down on re-render), and
  // pass cancelRefetch:false so an in-flight request isn't cancelled mid-burst — the backend runs
  // the full aggregation regardless, and cancelling only stalls the displayed numbers.
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);
  const tickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTick = useCallback(() => {
    if (tickTimer.current) return;
    tickTimer.current = setTimeout(() => {
      tickTimer.current = null;
      void refetchRef.current({ cancelRefetch: false });
    }, STATS_REFETCH_THROTTLE_MS);
  }, []);
  useEffect(
    () => () => {
      if (tickTimer.current) clearTimeout(tickTimer.current);
    },
    [],
  );

  // Hold the skeleton through the auth bootstrap too: a disabled query reports isLoading=false with
  // data=undefined, which would otherwise fall through to the "not found" empty state on first paint.
  const loading = !ready || isLoading;

  // 404 = link doesn't exist (or not owned). Map to the empty state, not an error toast.
  const notFound = error instanceof ApiError && error.status === 404;
  const realError =
    error && !notFound ? (error instanceof Error ? error.message : "load failed") : null;

  if (ready && !authenticated) {
    return (
      <LinksAuthGate
        eyebrow="stats"
        title={t("loginRequired")}
        description={t("loginRequiredDesc")}
      />
    );
  }

  return (
    <div className="container max-w-6xl space-y-5 py-10">
      <button
        onClick={() => {
          // Direct entry (no in-app history) leaves router.back() a no-op — fall back to the link
          // dashboard so the button always goes somewhere.
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
          } else {
            router.push(`/${locale}/dashboard`);
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("back")}
      </button>

      {loading ? (
        <HeaderSkeleton />
      ) : realError ? (
        <ErrorState message={realError} onRetry={() => refetch()} />
      ) : notFound || !data ? (
        <EmptyState
          title={t("notFound")}
          description={t("notFoundDesc")}
          action={
            <Link href="/dashboard">
              <Button variant="outline">{t("backToDashboard")}</Button>
            </Link>
          }
        />
      ) : (
        <StatsBody
          data={data}
          shortUrl={shortUrl}
          onCopy={() => toast(tResult("copied"), "success")}
          onTick={handleTick}
          shortCodeLabel={t("shortCode")}
        />
      )}
    </div>
  );
}
