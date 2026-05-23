"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listCampaigns } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { CampaignOnboarding } from "@/components/campaign-onboarding";
import type { CampaignSummary } from "@/types";

export default function CampaignsPage() {
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
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, reload]);

  if (ready && !authenticated) {
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px]">
          로그인이 필요합니다
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
          QR 캠페인은 로그인된 사용자만 운영할 수 있어요.
        </p>
        <Link href="/login" className="mt-6 inline-block">
          <Button>로그인하러 가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px]">
            QR 캠페인
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {items === null
              ? "오프라인 QR 배포 운영 단위"
              : `${items.length}개의 QR 캠페인.`}
          </p>
        </div>
        {items && items.length > 0 && (
          <Link href="/campaigns/new">
            <Button variant="accent">
              <Plus className="h-4 w-4" aria-hidden /> 새 QR 캠페인
            </Button>
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
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={`/campaigns/${c.id}`}
            className="profile-card group block rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={c.status} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {c.batchCount}개 묶음
              </span>
            </div>
            <h3 className="mt-3 text-sm font-medium leading-snug text-slate-900 line-clamp-2">
              {c.name}
            </h3>
            <p className="mt-2 text-[12px] leading-snug text-slate-500">
              {formatPeriod(c.startsAt, c.endsAt)}
            </p>
            <div className="mt-3 flex items-center justify-end gap-1.5 text-[12px] font-medium text-accent-700 opacity-0 transition-opacity group-hover:opacity-100">
              자세히 <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: CampaignSummary["status"] }) {
  const t = useTranslations("campaignStatus");
  const palette: Record<CampaignSummary["status"], { bg: string; text: string }> = {
    DRAFT: { bg: "bg-slate-100", text: "text-slate-700" },
    ACTIVE: { bg: "bg-accent-50", text: "text-accent-700" },
    ENDED: { bg: "bg-amber-50", text: "text-amber-700" },
    ARCHIVED: { bg: "bg-slate-100", text: "text-slate-500" },
  };
  const { bg, text } = palette[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${bg} ${text}`}
    >
      {t(status)}
    </span>
  );
}

function CampaignListSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
        >
          <Skeleton className="h-4 w-16" />
          <Skeleton className="mt-3 h-5 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </li>
      ))}
    </ul>
  );
}

function formatPeriod(startsAt: string, endsAt: string): string {
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
  return `${fmt.format(new Date(startsAt))} – ${fmt.format(new Date(endsAt))}`;
}
