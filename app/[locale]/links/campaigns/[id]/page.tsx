"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Archive, ArrowLeft, CircleStop, ExternalLink, Pencil, QrCode, RotateCcw, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { useApiErrorMessage } from "@/lib/error-messages";
import {
  archiveCampaign,
  campaignBatchesCsvUrl,
  endCampaignNow,
  getCampaign,
  getCampaignStats,
  listCampaignBatches,
  reapplyCampaignPolicy,
  requestBlob,
} from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/use-confirm";
import { BatchEditDialog } from "@/components/links/batch-edit-dialog";
import { BatchDeleteDialog } from "@/components/links/batch-delete-dialog";
import { QrDownloadDialog } from "@/components/links/qr/download-dialog";
import { ActionMenu, type ActionMenuItem } from "@/components/common/action-menu";
import { EmptyState } from "@/components/common/empty-state";
import { STAT_HEADING } from "@/components/links/stats/stat-sections";
import { CampaignRows } from "@/components/links/campaigns/campaign-rows";
import { CampaignSettingsDialog } from "@/components/links/campaigns/campaign-settings-dialog";
import { KpiRow } from "@/components/links/campaigns/stats-cards";
import { useSectionLoad } from "@/hooks/use-section-load";
import { cn, formatNumber } from "@/lib/utils";
import type { CampaignBatch, CampaignDetail, CampaignStats, CampaignStatus } from "@/types";
import { CampaignStatusBadge } from "@/components/links/campaign-status-badge";
import { LinksPage } from "@/components/links/links-page";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = Number(id);
  const { authenticated, ready } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("campaignApp.detail");
  const errorMessage = useApiErrorMessage();
  const [confirm, confirmDialog] = useConfirm();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [batches, setBatches] = useState<CampaignBatch[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [pending, setPending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const enabled = ready && authenticated && Number.isFinite(campaignId);
  const stats = useSectionLoad(enabled, useCallback(() => getCampaignStats(campaignId), [campaignId]), reload);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !Number.isFinite(campaignId)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getCampaign(campaignId), listCampaignBatches(campaignId)])
      .then(([c, bs]) => {
        if (cancelled) return;
        setCampaign(c);
        setBatches(bs);
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
  }, [ready, authenticated, campaignId, reload, t]);

  if (ready && !authenticated) {
    return <SignInEmptyState page reason="campaigns" />;
  }

  async function run(action: () => Promise<unknown>, done: string, failed: string) {
    setPending(true);
    try {
      await action();
      toast(done, "success");
      setReload((n) => n + 1);
    } catch (e) {
      toast(errorMessage(e, failed), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <LinksPage className="space-y-10">
      <Link
        href="/campaigns"
        className="touch-target focus-ring inline-flex items-center gap-1.5 rounded-sm text-[12px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t("backToList")}
      </Link>

      {campaign ? (
        <>
          <div className="space-y-6">
            <Header
              campaign={campaign}
              pending={pending}
              onSettings={() => setSettingsOpen(true)}
              onEndNow={async () => {
                if (!(await confirm({ title: t("confirmEnd"), description: t("confirmEndDesc"), destructive: true }))) return;
                await run(() => endCampaignNow(campaign.id), t("ended"), t("endFailed"));
              }}
              onReapply={() => run(() => reapplyCampaignPolicy(campaign.id), t("reapplied"), t("reapplyFailed"))}
              onArchive={async () => {
                if (!(await confirm({ title: t("confirmArchive"), description: t("confirmArchiveDesc") }))) return;
                await run(() => archiveCampaign(campaign.id), t("archived"), t("archiveFailed"));
              }}
            />
            {(batches ?? []).length > 0 &&
              (stats.data ? (
                <KpiRow stats={stats.data} batchCount={campaign.batchCount} />
              ) : stats.failed ? (
                <ErrorState message={t("statsFailed")} onRetry={stats.retry} />
              ) : null)}
          </div>

          <BatchSection
            campaignId={campaign.id}
            campaignStatus={campaign.status}
            batches={batches ?? []}
            stats={stats.data}
            onChanged={() => setReload((n) => n + 1)}
          />

          {(batches ?? []).length > 0 && <PrepareSection campaignId={campaign.id} />}

          <PolicySection campaign={campaign} />

          <CampaignSettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            campaign={campaign}
            onSaved={() => setReload((n) => n + 1)}
          />
        </>
      ) : loading ? (
        <DetailSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
      ) : null}
      {confirmDialog}
    </LinksPage>
  );
}

function Header({
  campaign,
  pending,
  onSettings,
  onEndNow,
  onReapply,
  onArchive,
}: {
  campaign: CampaignDetail;
  pending: boolean;
  onSettings: () => void;
  onEndNow: () => void;
  onReapply: () => void;
  onArchive: () => void;
}) {
  const t = useTranslations("campaignApp.detail");
  const locale = useLocale();
  const items: ActionMenuItem[] = [
    ...(campaign.status === "ACTIVE" ? [{ label: t("actions.endNow"), icon: CircleStop, onSelect: onEndNow, disabled: pending }] : []),
    ...(campaign.status === "ENDED" ? [{ label: t("actions.reapply"), icon: RotateCcw, onSelect: onReapply, disabled: pending }] : []),
    ...(campaign.status !== "ARCHIVED" ? [{ label: t("actions.archive"), icon: Archive, onSelect: onArchive, disabled: pending }] : []),
  ];
  return (
    <header className="space-y-3">
      <div className="flex items-center gap-2">
        <CampaignStatusBadge status={campaign.status} />
        <span className="text-[12px] text-slate-500 dark:text-slate-400">
          {formatPeriod(campaign.startsAt, campaign.endedAt ?? campaign.endsAt, locale)}
        </span>
      </div>
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
          {campaign.name}
        </h1>
        <div className="flex items-center gap-2">
          <Link href={`/campaigns/${campaign.id}/stats`} className={buttonVariants({ variant: "outline" })}>
            {t("actions.stats")}
          </Link>
          {campaign.status !== "ARCHIVED" && (
            <Button variant="outline" onClick={onSettings}>
              {t("settings.open")}
            </Button>
          )}
          {items.length > 0 && (
            <ActionMenu label={t("actions.more")} items={items} triggerVariant="outline" triggerClassName="h-10 w-10" />
          )}
        </div>
      </div>
    </header>
  );
}

function BatchSection({
  campaignId,
  campaignStatus,
  batches,
  stats,
  onChanged,
}: {
  campaignId: number;
  campaignStatus: CampaignStatus;
  batches: CampaignBatch[];
  stats: CampaignStats | null;
  onChanged: () => void;
}) {
  const terminal = campaignStatus === "ENDED" || campaignStatus === "ARCHIVED";
  const t = useTranslations("campaignApp.detail");
  const tRow = useTranslations("campaignApp.batchCard");
  const [editing, setEditing] = useState<CampaignBatch | null>(null);
  const [deleting, setDeleting] = useState<CampaignBatch | null>(null);
  const [qrFor, setQrFor] = useState<CampaignBatch | null>(null);
  const clicks = new Map(stats?.byBatch.map((b) => [b.batchId, b.clicks]) ?? []);
  const addLink = (variant: "default" | "outline") => (
    <Link href={`/campaigns/${campaignId}/batches/new`} className={buttonVariants({ variant, size: "sm" })}>
      {t("batches.add")}
    </Link>
  );
  return (
    <section aria-labelledby="campaign-batches">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="campaign-batches" className={STAT_HEADING}>
          {t("batches.title")}
        </h2>
        {!terminal && batches.length > 0 && addLink("outline")}
      </div>

      {batches.length === 0 ? (
        <EmptyState title={t("batches.emptyTitle")} className="border-t-0 pt-1" action={terminal ? undefined : addLink("default")} />
      ) : (
        <CampaignRows
          total={stats?.totalClicks}
          rows={batches.map((b) => ({
            key: b.id,
            label: b.name,
            meta: [b.distributorName, b.areaLabel, tRow("quantityUnit", { count: formatNumber(b.quantity) }), `/${b.shortCode}`]
              .filter(Boolean)
              .join(" · "),
            clicks: stats ? (clicks.get(b.id) ?? 0) : null,
            quantity: b.quantity,
            action: (
              <ActionMenu
                label={tRow("menu", { name: b.name })}
                triggerClassName="h-9 w-9 text-slate-500 dark:text-slate-400"
                items={[
                  { label: tRow("qr"), icon: QrCode, onSelect: () => setQrFor(b) },
                  { label: tRow("open"), icon: ExternalLink, href: b.shortUrl },
                  ...(terminal
                    ? []
                    : [
                        { label: tRow("edit"), icon: Pencil, onSelect: () => setEditing(b) },
                        { label: tRow("delete"), icon: Trash2, onSelect: () => setDeleting(b), destructive: true },
                      ]),
                ]}
              />
            ),
          }))}
        />
      )}

      <QrDownloadDialog
        open={qrFor !== null}
        onOpenChange={(v) => !v && setQrFor(null)}
        target={qrFor ? { kind: "single", campaignId, batchId: qrFor.id, batchName: qrFor.name } : null}
      />
      <BatchEditDialog
        open={editing !== null}
        onOpenChange={(v) => !v && setEditing(null)}
        batch={editing}
        campaignId={campaignId}
        onUpdated={() => {
          setEditing(null);
          onChanged();
        }}
      />
      <BatchDeleteDialog
        open={deleting !== null}
        onOpenChange={(v) => !v && setDeleting(null)}
        batch={deleting}
        campaignId={campaignId}
        onDeleted={() => {
          setDeleting(null);
          onChanged();
        }}
      />
    </section>
  );
}

function PrepareSection({ campaignId }: { campaignId: number }) {
  const [zipDialogOpen, setZipDialogOpen] = useState(false);
  const [csvPending, setCsvPending] = useState(false);
  const t = useTranslations("campaignApp.detail");
  const errorMessage = useApiErrorMessage();
  const { toast } = useToast();

  // CSV 는 인증(Bearer)이 필요한 엔드포인트라 raw 앵커 내비게이션(헤더 없음)은 401. QR ZIP 과 같은
  // requestBlob(인증 fetch → blob) 경로로 받아 다운로드를 트리거한다.
  async function downloadCsv() {
    if (csvPending) return;
    setCsvPending(true);
    try {
      const { blob, filename } = await requestBlob(campaignBatchesCsvUrl(campaignId), {
        method: "GET",
      });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename ?? `campaign-${campaignId}-batches.csv`;
      a.rel = "noopener";
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (e) {
      toast(errorMessage(e, t("csvFailed")), "error");
    } finally {
      setCsvPending(false);
    }
  }

  return (
    <section aria-labelledby="campaign-prepare">
      <h2 id="campaign-prepare" className={STAT_HEADING}>
        {t("prepare.title")}
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => setZipDialogOpen(true)}>
          {t("prepare.qrZip")}
        </Button>
        <Button variant="outline" onClick={downloadCsv} disabled={csvPending}>
          {t("prepare.batchCsv")}
        </Button>
        <Link href={`/campaigns/${campaignId}/print-sheet`} className={buttonVariants({ variant: "outline" })}>
          {t("prepare.printSheet")}
        </Link>
        <Link href={`/campaigns/${campaignId}/poster-builder`} className={buttonVariants({ variant: "outline" })}>
          {t("prepare.posterBuilder")}
        </Link>
      </div>
      <QrDownloadDialog open={zipDialogOpen} onOpenChange={setZipDialogOpen} target={{ kind: "zip", campaignId }} />
    </section>
  );
}

function PolicySection({ campaign }: { campaign: CampaignDetail }) {
  const t = useTranslations("campaignApp.detail");
  const action = campaign.postEndAction;
  const label = action === "KEEP" ? t("policy.keep") : action === "EXPIRE" ? t("policy.expire") : t("policy.redirect");
  const rows: [string, string, boolean?][] = [[t("policy.title"), label]];
  if (action === "EXPIRE") {
    rows.push([t("policy.messageLabel"), campaign.postEndMessage ?? t("policy.defaultMessageHint"), !campaign.postEndMessage]);
  }
  if (action === "REDIRECT" && campaign.postEndDestinationUrl) rows.push([t("policy.redirectLabel"), campaign.postEndDestinationUrl]);
  if (campaign.defaultDestinationUrl) rows.push([t("policy.defaultDestination"), campaign.defaultDestinationUrl]);
  return (
    <section aria-labelledby="campaign-policy">
      <h2 id="campaign-policy" className={STAT_HEADING}>
        {t("policy.heading")}
      </h2>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-[max-content_minmax(0,1fr)]">
        {rows.map(([term, value, muted]) => (
          <div key={term} className="contents">
            <dt className="text-slate-500 dark:text-slate-400">{term}</dt>
            <dd
              className={cn(
                "mb-2 min-w-0 whitespace-pre-wrap break-words sm:mb-0",
                muted ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100",
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function formatPeriod(startsAt: string, endsAt: string, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  });
  return `${fmt.format(new Date(startsAt))} – ${fmt.format(new Date(endsAt))}`;
}
