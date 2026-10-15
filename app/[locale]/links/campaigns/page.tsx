"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Plus, QrCode } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listCampaigns } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { CampaignOnboarding } from "@/components/links/campaigns/onboarding";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import type { CampaignSummary } from "@/types";
import { CampaignStatusBadge } from "@/components/links/campaign-status-badge";

export default function CampaignsPage() {
  const t = useTranslations("campaignsApp");
  const { authenticated, ready } = useAuth();
  const [items, setItems] = useState<CampaignSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listCampaigns()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch(() => {
        if (!cancelled) setError(t("loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, reload, t]);

  if (ready && !authenticated) {
    return (
      <SignInEmptyState page reason="campaigns" icon={QrCode} />
    );
  }

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-4 sm:items-end">
        <div>
          <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
            {t("title")}
          </h1>
          {(items === null || items.length > 0) && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {items === null ? t("subtitleLoading") : t("subtitleCount", { count: items.length })}
            </p>
          )}
        </div>
        {items && (
          <Link href="/campaigns/new" className={buttonVariants({ variant: "accent" })}>
            <Plus className="h-4 w-4" aria-hidden /> {t("newCampaign")}
          </Link>
        )}
      </div>

      {loading ? (
        <CampaignListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
      ) : items && items.length === 0 ? (
        <CampaignOnboarding />
      ) : (
        <CampaignList items={items ?? []} />
      )}
    </div>
  );
}

function CampaignList({ items }: { items: CampaignSummary[] }) {
  const t = useTranslations("campaignsApp");
  const locale = useLocale();
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={`/campaigns/${c.id}`}
            className="profile-card group block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <CampaignStatusBadge status={c.status} />
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {t("batchCount", { count: c.batchCount })}
              </span>
            </div>
            <h3 className="mt-3 text-sm font-medium leading-snug text-slate-900 dark:text-slate-100 line-clamp-2">
              {c.name}
            </h3>
            <p className="mt-2 text-[12px] leading-snug text-slate-500 dark:text-slate-400">
              {formatPeriod(c.startsAt, c.endsAt, locale)}
            </p>
            <div className="mt-3 flex items-center justify-end gap-1.5 text-[12px] font-medium text-accent-700 dark:text-accent-400 opacity-0 transition-opacity group-hover:opacity-100">
              {t("details")} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CampaignListSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4"
        >
          <Skeleton className="h-4 w-16" />
          <Skeleton className="mt-3 h-5 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </li>
      ))}
    </ul>
  );
}

function formatPeriod(startsAt: string, endsAt: string, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
  return `${fmt.format(new Date(startsAt))} – ${fmt.format(new Date(endsAt))}`;
}
