"use client";

import { useEffect, useState } from "react";
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
import { useToast } from "@/components/ui/toast";
import { HeaderSkeleton } from "./_components/header";
import { StatsBody } from "./_components/stats-body";

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

  // 404 = link doesn't exist (or not owned). Map to the empty state, not an error toast.
  const notFound = error instanceof ApiError && error.status === 404;
  const realError =
    error && !notFound ? (error instanceof Error ? error.message : "load failed") : null;

  if (ready && !authenticated) {
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 dark:text-slate-100 sm:text-[30px]">
          {t("loginRequired")}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">{t("loginRequiredDesc")}</p>
        <Link href="/login" className="mt-6 inline-block">
          <Button>{t("backToDashboard")}</Button>
        </Link>
      </div>
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
            router.push(`/${locale}/links`);
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("back")}
      </button>

      {isLoading ? (
        <HeaderSkeleton />
      ) : realError ? (
        <ErrorState message={realError} onRetry={() => refetch()} />
      ) : notFound || !data ? (
        <EmptyState
          title={t("notFound")}
          description={t("notFoundDesc")}
          action={
            <Link href="/links">
              <Button variant="outline">{t("backToDashboard")}</Button>
            </Link>
          }
        />
      ) : (
        <StatsBody
          data={data}
          shortUrl={shortUrl}
          onCopy={() => toast(tResult("copied"), "success")}
          onTick={() => refetch()}
          shortCodeLabel={t("shortCode")}
        />
      )}
    </div>
  );
}
