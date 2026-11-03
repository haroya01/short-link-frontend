"use client";

import { useEffect, useState } from "react";
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
import { LinksPage } from "@/components/links/links-page";
import { CampaignRows } from "@/components/links/campaigns/campaign-rows";

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
      <SignInEmptyState page reason="campaigns" />
    );
  }

  return (
    <LinksPage className="space-y-6">
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
          <Link href="/campaigns/new" className={buttonVariants({ variant: "default" })}>
            {t("newCampaign")}
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
    </LinksPage>
  );
}

function CampaignList({ items }: { items: CampaignSummary[] }) {
  const t = useTranslations("campaignsApp");
  const locale = useLocale();
  const withNumbers = items.some((c) => typeof c.humanClicks === "number");
  const rows = items.map((c) => ({
    key: c.id,
    href: `/campaigns/${c.id}`,
    label: c.name,
    meta: (
      <>
        <CampaignStatusBadge status={c.status} /> {formatPeriod(c.startsAt, c.endedAt ?? c.endsAt, locale)} ·{" "}
        {t("batchCount", { count: c.batchCount })}
      </>
    ),
    clicks: c.humanClicks ?? null,
    quantity: c.totalQuantity ?? 0,
  }));
  if (withNumbers) return <CampaignRows rows={rows} />;
  return (
    <ul data-testid="campaign-rows" className="space-y-4">
      {rows.map((row) => (
        <li key={row.key} className="relative">
          <p data-testid="campaign-row-name" className="truncate text-[14px] text-slate-900 dark:text-slate-100">
            <Link
              href={row.href}
              className="focus-ring rounded-sm font-medium decoration-slate-300 underline-offset-4 after:absolute after:inset-0 hover:underline dark:decoration-slate-600"
            >
              {row.label}
            </Link>
          </p>
          <p className="mt-0.5 truncate text-[12px] text-slate-500 dark:text-slate-400">{row.meta}</p>
        </li>
      ))}
    </ul>
  );
}

function CampaignListSkeleton() {
  return (
    <ul className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i}>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-1.5 h-3 w-64" />
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
