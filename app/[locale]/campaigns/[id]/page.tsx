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
  Layers,
  PlayCircle,
  Printer,
  Repeat,
  StopCircle,
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
  updateCampaign,
} from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { useToast } from "@/components/ui/toast";
import { BatchEditDialog } from "@/components/batch-edit-dialog";
import { BatchDeleteDialog } from "@/components/batch-delete-dialog";
import { QrDownloadDialog } from "@/components/qr-download-dialog";
import { BatchCard } from "./_components/batch-card";
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

          <PolicySummary campaign={campaign} onChanged={() => setReload((n) => n + 1)} />

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
          <Link href={`/campaigns/${campaignId}/print-sheet`}>
            <Button variant="outline">
              <Printer className="h-4 w-4" aria-hidden /> A4 시트
            </Button>
          </Link>
          <Link href={`/campaigns/${campaignId}/poster-builder`}>
            <Button variant="outline">
              <Layers className="h-4 w-4" aria-hidden /> 포스터에 QR
            </Button>
          </Link>
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

function PolicySummary({
  campaign,
  onChanged,
}: {
  campaign: CampaignDetail;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const action = campaign.postEndAction;
  const label =
    action === "KEEP"
      ? "그대로 유지"
      : action === "EXPIRE"
        ? "만료 페이지로"
        : "다른 페이지로 자동 전환";
  const editable = campaign.status !== "ARCHIVED";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(campaign.postEndMessage ?? "");
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(campaign.postEndMessage ?? "");
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      const trimmed = draft.trim();
      await updateCampaign(campaign.id, {
        postEndMessage: trimmed.length > 0 ? trimmed : "",
      });
      toast(
        campaign.status === "ENDED"
          ? "메시지를 저장했어요. '종료 정책 재적용' 을 누르면 인쇄된 QR 에도 반영돼요."
          : "만료 페이지 메시지를 저장했어요",
        "success",
      );
      setEditing(false);
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "저장 실패", "error");
    } finally {
      setSaving(false);
    }
  }

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
      {action === "EXPIRE" && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              만료 페이지 메시지
            </p>
            {editable && !editing && (
              <button
                type="button"
                onClick={startEdit}
                className="text-[12px] font-medium text-accent-700 hover:underline"
              >
                {campaign.postEndMessage ? "수정" : "추가"}
              </button>
            )}
          </div>
          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="예: 캠페인이 종료됐어요. 다음 이벤트는 12월에 만나요."
                className="block w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-100"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] tabular-nums text-slate-500">
                  {draft.length}/500
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    취소
                  </Button>
                  <Button type="button" variant="accent" onClick={save} disabled={saving}>
                    {saving ? "저장 중..." : "저장"}
                  </Button>
                </div>
              </div>
            </div>
          ) : campaign.postEndMessage ? (
            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">
              {campaign.postEndMessage}
            </p>
          ) : (
            <p className="mt-2 text-[12px] italic text-slate-500">
              메시지를 비워두면 기본 안내문이 표시됩니다.
            </p>
          )}
        </div>
      )}
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
