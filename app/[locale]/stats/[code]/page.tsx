"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { ApiError, getStats } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { useToast } from "@/components/ui/toast";
import type { LinkStats } from "@/types";
import { HeaderSkeleton } from "./_components/header";
import { StatsBody } from "./_components/stats-body";

export default function StatsPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const t = useTranslations("stats");
  const tResult = useTranslations("result");
  const { authenticated, ready } = useAuth();
  const { toast } = useToast();
  const code = params.code;

  const [data, setData] = useState<LinkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
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

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setLoading(false);
      return;
    }
    if (!code) return;
    let cancelled = false;
    // Only the first fetch shows the loading skeleton; subsequent refreshes (e.g., the live-click
    // feed bumping `tick` on every incoming SSE event) update silently in the background so the
    // already-rendered page — including LiveClickFeed's accumulated items — doesn't unmount.
    const isInitial = data === null;
    if (isInitial) setLoading(true);
    setError(null);
    getStats(code)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setData(null);
            setError(null);
          } else {
            setError(err instanceof Error ? err.message : "load failed");
          }
        }
      })
      .finally(() => {
        if (!cancelled && isInitial) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // data omitted from deps on purpose — only auth/code/tick should trigger refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, code, tick]);

  if (ready && !authenticated) {
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px]">
          {t("loginRequired")}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{t("loginRequiredDesc")}</p>
        <Link href="/login" className="mt-6 inline-block">
          <Button>{t("backToDashboard")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl space-y-5 py-10">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("back")}
      </button>

      {loading ? (
        <HeaderSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setTick((n) => n + 1)} />
      ) : !data ? (
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
          onTick={() => setTick((n) => n + 1)}
          shortCodeLabel={t("shortCode")}
        />
      )}
    </div>
  );
}
