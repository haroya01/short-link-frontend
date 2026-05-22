"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  BarChart3,
  Download,
  FileText,
  PackageOpen,
  Pencil,
  PlayCircle,
  QrCode,
  Repeat,
  StopCircle,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  archiveCampaign,
  campaignBatchesCsvUrl,
  endCampaignNow,
  getCampaign,
  listCampaignBatches,
  reapplyCampaignPolicy,
} from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { useToast } from "@/components/ui/toast";
import { BatchEditDialog } from "@/components/batch-edit-dialog";
import { BatchDeleteDialog } from "@/components/batch-delete-dialog";
import { QrDownloadDialog } from "@/components/qr-download-dialog";
import type { CampaignBatch, CampaignDetail, CampaignStatus } from "@/types";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = Number(id);
  const { authenticated, ready } = useAuth();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [batches, setBatches] = useState<CampaignBatch[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [pending, setPending] = useState(false);

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
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, campaignId, reload]);

  if (ready && !authenticated) {
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px]">
          로그인이 필요합니다
        </h1>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> QR 캠페인 목록
      </Link>

      {loading ? (
        <DetailSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
      ) : campaign ? (
        <>
          <Header
            campaign={campaign}
            pending={pending}
            onEndNow={async () => {
              if (!confirm("이 QR 캠페인을 지금 종료하시겠습니까?\n인쇄된 QR 에 종료 정책이 즉시 적용됩니다."))
                return;
              setPending(true);
              try {
                await endCampaignNow(campaign.id);
                toast("QR 캠페인이 종료됐어요", "success");
                setReload((n) => n + 1);
              } catch (e) {
                toast(e instanceof Error ? e.message : "종료 실패", "error");
              } finally {
                setPending(false);
              }
            }}
            onReapply={async () => {
              setPending(true);
              try {
                await reapplyCampaignPolicy(campaign.id);
                toast("종료 정책을 다시 적용했어요", "success");
                setReload((n) => n + 1);
              } catch (e) {
                toast(e instanceof Error ? e.message : "재적용 실패", "error");
              } finally {
                setPending(false);
              }
            }}
            onArchive={async () => {
              if (
                !confirm(
                  "이 QR 캠페인을 보관합니다.\n목록에서 숨겨지지만 데이터는 그대로 유지됩니다.",
                )
              )
                return;
              setPending(true);
              try {
                await archiveCampaign(campaign.id);
                toast("QR 캠페인을 보관했어요", "success");
                setReload((n) => n + 1);
              } catch (e) {
                toast(e instanceof Error ? e.message : "보관 실패", "error");
              } finally {
                setPending(false);
              }
            }}
          />

          <PolicySummary campaign={campaign} />

          {(batches ?? []).length > 0 && (
            <PrepareSection campaignId={campaign.id} batchCount={(batches ?? []).length} />
          )}

          <BatchSection
            campaignId={campaign.id}
            campaignStatus={campaign.status}
            batches={batches ?? []}
            onChanged={() => setReload((n) => n + 1)}
          />
        </>
      ) : null}
    </div>
  );
}

function Header({
  campaign,
  pending,
  onEndNow,
  onReapply,
  onArchive,
}: {
  campaign: CampaignDetail;
  pending: boolean;
  onEndNow: () => void;
  onReapply: () => void;
  onArchive: () => void;
}) {
  return (
    <header className="space-y-3">
      <div className="flex items-center gap-2">
        <StatusBadge status={campaign.status} />
        <span className="text-[12px] text-slate-500">
          {formatPeriod(campaign.startsAt, campaign.endsAt)}
        </span>
      </div>
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px]">
          {campaign.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/campaigns/${campaign.id}/stats`}>
            <Button variant="outline">
              <BarChart3 className="h-4 w-4" aria-hidden /> 분석
            </Button>
          </Link>
          {campaign.status === "ACTIVE" && (
            <Button variant="outline" onClick={onEndNow} disabled={pending}>
              <StopCircle className="h-4 w-4" aria-hidden /> 지금 종료
            </Button>
          )}
          {campaign.status === "ENDED" && (
            <Button variant="outline" onClick={onReapply} disabled={pending}>
              <Repeat className="h-4 w-4" aria-hidden /> 종료 정책 재적용
            </Button>
          )}
          {campaign.status !== "ARCHIVED" && (
            <Button variant="outline" onClick={onArchive} disabled={pending}>
              <Archive className="h-4 w-4" aria-hidden /> 보관
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function PrepareSection({
  campaignId,
  batchCount,
}: {
  campaignId: number;
  batchCount: number;
}) {
  const [zipDialogOpen, setZipDialogOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            배포 준비
          </p>
          <h2 className="mt-1 text-sm font-medium text-slate-900">
            인쇄소 · Canva 에 넘길 자산
          </h2>
          <p className="mt-0.5 text-[12px] leading-snug text-slate-500">
            {batchCount}개 묶음의 QR 코드 + 메타 표. 디자인 도구에서 포스터/전단지에 박아 발주합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setZipDialogOpen(true)}>
            <Download className="h-4 w-4" aria-hidden /> QR ZIP
          </Button>
          <a href={campaignBatchesCsvUrl(campaignId)} download>
            <Button variant="outline">
              <FileText className="h-4 w-4" aria-hidden /> Batch CSV
            </Button>
          </a>
        </div>
      </div>
      <QrDownloadDialog
        open={zipDialogOpen}
        onOpenChange={setZipDialogOpen}
        target={{ kind: "zip", campaignId }}
      />
    </section>
  );
}

function PolicySummary({ campaign }: { campaign: CampaignDetail }) {
  const action = campaign.postEndAction;
  const label =
    action === "KEEP"
      ? "그대로 유지"
      : action === "EXPIRE"
        ? "만료 페이지로"
        : "다른 페이지로 자동 전환";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
        종료 후 동작
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {action === "REDIRECT" && campaign.postEndDestinationUrl && (
          <a
            href={campaign.postEndDestinationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-700 hover:underline"
          >
            {campaign.postEndDestinationUrl}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </div>
      {campaign.defaultDestinationUrl && (
        <p className="mt-3 text-[12px] text-slate-500">
          기본 도착 URL · {campaign.defaultDestinationUrl}
        </p>
      )}
    </div>
  );
}

function BatchSection({
  campaignId,
  campaignStatus,
  batches,
  onChanged,
}: {
  campaignId: number;
  campaignStatus: CampaignStatus;
  batches: CampaignBatch[];
  onChanged: () => void;
}) {
  const terminal = campaignStatus === "ENDED" || campaignStatus === "ARCHIVED";
  const [editing, setEditing] = useState<CampaignBatch | null>(null);
  const [deleting, setDeleting] = useState<CampaignBatch | null>(null);
  return (
    <section className="space-y-3">
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-sm font-medium text-slate-900">배포 묶음</h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            QR 한 개를 여러 장 인쇄해서 배포한 한 단위. 배포자·지역별로 나눠야 분석이 의미 있어요.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!terminal && (
            <Link href={`/campaigns/${campaignId}/batches/new`}>
              <Button variant="accent">
                <PlayCircle className="h-4 w-4" aria-hidden /> 배포 묶음 추가
              </Button>
            </Link>
          )}
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
          <PackageOpen className="mx-auto h-6 w-6 text-slate-400" aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-900">
            아직 배포 묶음이 없어요
          </p>
          <p className="mt-1.5 text-[12px] text-slate-500">
            첫 묶음을 추가하면 QR 코드가 즉시 발급됩니다. 인쇄·발주 전에 스캔해서 작동 확인 가능.
          </p>
          {!terminal && (
            <Link href={`/campaigns/${campaignId}/batches/new`} className="mt-4 inline-block">
              <Button variant="accent">첫 배포 묶음 추가</Button>
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {batches.map((b) => (
            <BatchCard
              key={b.id}
              batch={b}
              campaignId={campaignId}
              canModify={!terminal}
              onEdit={() => setEditing(b)}
              onDelete={() => setDeleting(b)}
            />
          ))}
        </ul>
      )}

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

function BatchCard({
  batch,
  campaignId,
  canModify,
  onEdit,
  onDelete,
}: {
  batch: CampaignBatch;
  campaignId: number;
  canModify: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  return (
    <li className="group relative rounded-2xl border border-slate-200 bg-white px-4 py-4">
      {/* Hover-revealed actions — corner cluster (디자인 가이드의 우상단 보조 액션 위치). */}
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={() => setQrDialogOpen(true)}
          aria-label={`${batch.name} QR 다운로드`}
          className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <QrCode className="h-3.5 w-3.5" aria-hidden />
        </button>
        {canModify && (
          <>
            <button
              type="button"
              onClick={onEdit}
              aria-label={`${batch.name} 편집`}
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`${batch.name} 삭제`}
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pr-20">
        <h3 className="text-sm font-medium text-slate-900">{batch.name}</h3>
        <span className="text-[11px] font-medium text-slate-500">
          {batch.quantity.toLocaleString()}장
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500">
        {batch.distributorName && <span>배포자 · {batch.distributorName}</span>}
        {batch.areaLabel && <span>· {batch.areaLabel}</span>}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <a
          href={batch.shortUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-700 hover:underline"
        >
          {batch.shortUrl}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
      <QrDownloadDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        target={{
          kind: "single",
          campaignId,
          batchId: batch.id,
          batchName: batch.name,
        }}
      />
    </li>
  );
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const palette: Record<CampaignStatus, { bg: string; text: string; label: string }> = {
    DRAFT: { bg: "bg-slate-100", text: "text-slate-700", label: "시작 전" },
    ACTIVE: { bg: "bg-accent-50", text: "text-accent-700", label: "운영 중" },
    ENDED: { bg: "bg-amber-50", text: "text-amber-700", label: "종료됨" },
    ARCHIVED: { bg: "bg-slate-100", text: "text-slate-500", label: "보관" },
  };
  const { bg, text, label } = palette[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${bg} ${text}`}
    >
      {label}
    </span>
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

function formatPeriod(startsAt: string, endsAt: string): string {
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
  return `${fmt.format(new Date(startsAt))} – ${fmt.format(new Date(endsAt))}`;
}
