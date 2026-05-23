"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getCampaign, listCampaignBatches } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import type { CampaignBatch, CampaignDetail } from "@/types";

type Layout = {
  cols: number;
  rows: number;
  label: string;
  hint: string;
};

const LAYOUTS: Layout[] = [
  { cols: 3, rows: 4, label: "12개 (3×4)", hint: "넉넉 · 명함 크기" },
  { cols: 4, rows: 5, label: "20개 (4×5)", hint: "표준" },
  { cols: 5, rows: 6, label: "30개 (5×6)", hint: "빽빽 · 작은 라벨" },
];

/**
 * A4 QR sheet — 학교 행사 / 사내 공지처럼 인쇄소 안 거치는 사용자가 오려서 쓸 수 있게 caja 단위로 정리. 브라우저 인쇄 (Cmd+P → PDF 저장)
 * 의도. 백엔드 PDF 라이브러리 안 들어옴 — v2 (포스터 합성) 의 인프라를 v1.5 에 끌어오지 않는다.
 *
 * <p>기본은 *batch 마다 한 칸* 모드. 모든 batch 가 한 페이지 (또는 페이지들) 에 나열되고, 각 칸에는 QR + 라벨 (batch 이름). page-per-batch
 * 옵션을 켜면 batch 마다 한 페이지를 자기 QR 로 가득 채움 (50장 학교 행사처럼 같은 묶음을 여러 장 인쇄할 때).
 */
export default function PrintSheetPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = Number(id);
  const { authenticated, ready } = useAuth();

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [batches, setBatches] = useState<CampaignBatch[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [layout, setLayout] = useState<Layout>(LAYOUTS[1]);
  const [showLabel, setShowLabel] = useState(true);
  const [showCutMarks, setShowCutMarks] = useState(true);
  const [pagePerBatch, setPagePerBatch] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated || !Number.isFinite(campaignId)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
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
  }, [ready, authenticated, campaignId]);

  const pages = useMemo(
    () => buildPages(batches ?? [], layout, pagePerBatch),
    [batches, layout, pagePerBatch],
  );

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
    <>
      {/* 화면 전용 헤더 + 옵션 — 인쇄 시 숨김 */}
      <div className="container max-w-5xl space-y-4 py-8 screen-only">
        <Link
          href={`/campaigns/${campaignId}`}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> QR 캠페인으로
        </Link>

        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px]">
              A4 QR 시트
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? (
                <Skeleton className="inline-block h-4 w-40" />
              ) : campaign ? (
                <>
                  <span className="font-medium text-slate-700">{campaign.name}</span> · 브라우저 인쇄로
                  PDF 저장 (Cmd/Ctrl + P).
                </>
              ) : null}
            </p>
          </div>
          <Button variant="accent" onClick={() => window.print()} disabled={loading || !!error}>
            <Printer className="h-4 w-4" aria-hidden /> 인쇄
          </Button>
        </div>

        <OptionsBar
          layout={layout}
          onLayoutChange={setLayout}
          showLabel={showLabel}
          onShowLabelChange={setShowLabel}
          showCutMarks={showCutMarks}
          onShowCutMarksChange={setShowCutMarks}
          pagePerBatch={pagePerBatch}
          onPagePerBatchChange={setPagePerBatch}
        />

        {loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : (batches ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-[13px] text-slate-500">
            인쇄할 배포 묶음이 없어요. 묶음을 먼저 추가하세요.
          </div>
        ) : null}
      </div>

      {/* 인쇄 영역 — A4 페이지들 */}
      {!loading && !error && (batches ?? []).length > 0 && (
        <div className="print-area">
          {pages.map((pageCells, pageIdx) => (
            <Sheet
              key={pageIdx}
              cells={pageCells}
              cols={layout.cols}
              rows={layout.rows}
              showLabel={showLabel}
              showCutMarks={showCutMarks}
            />
          ))}
        </div>
      )}

      <PrintStyles />
    </>
  );
}

function OptionsBar({
  layout,
  onLayoutChange,
  showLabel,
  onShowLabelChange,
  showCutMarks,
  onShowCutMarksChange,
  pagePerBatch,
  onPagePerBatchChange,
}: {
  layout: Layout;
  onLayoutChange: (v: Layout) => void;
  showLabel: boolean;
  onShowLabelChange: (v: boolean) => void;
  showCutMarks: boolean;
  onShowCutMarksChange: (v: boolean) => void;
  pagePerBatch: boolean;
  onPagePerBatchChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="space-y-1.5">
        <p className="text-[12px] font-medium text-slate-700">한 페이지에</p>
        <div className="grid grid-cols-3 gap-1.5">
          {LAYOUTS.map((l) => (
            <button
              key={l.label}
              type="button"
              onClick={() => onLayoutChange(l)}
              className={
                "flex flex-col rounded-xl border px-3 py-2 text-left transition-colors " +
                (layout.label === l.label
                  ? "border-accent-600 bg-accent-50 text-accent-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
              }
            >
              <span className="text-[12px] font-medium">{l.label}</span>
              <span className="mt-0.5 text-[10px] leading-tight text-slate-500">{l.hint}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Toggle label="라벨 표시" checked={showLabel} onChange={onShowLabelChange} />
        <Toggle label="잘림선" checked={showCutMarks} onChange={onShowCutMarksChange} />
        <Toggle
          label="묶음당 한 페이지 (같은 QR 가득)"
          checked={pagePerBatch}
          onChange={onPagePerBatchChange}
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-accent-600 focus:ring-accent-500"
      />
      <span className="text-[12px] text-slate-700">{label}</span>
    </label>
  );
}

type Cell = { url: string; label: string };

function buildPages(
  batches: CampaignBatch[],
  layout: Layout,
  pagePerBatch: boolean,
): Cell[][] {
  if (batches.length === 0) return [];
  const cellsPerPage = layout.cols * layout.rows;
  if (pagePerBatch) {
    return batches.map((b) =>
      Array.from({ length: cellsPerPage }, () => ({ url: b.shortUrl, label: b.name })),
    );
  }
  const cells: Cell[] = batches.map((b) => ({ url: b.shortUrl, label: b.name }));
  const pages: Cell[][] = [];
  for (let i = 0; i < cells.length; i += cellsPerPage) {
    pages.push(cells.slice(i, i + cellsPerPage));
  }
  return pages;
}

function Sheet({
  cells,
  cols,
  rows,
  showLabel,
  showCutMarks,
}: {
  cells: Cell[];
  cols: number;
  rows: number;
  showLabel: boolean;
  showCutMarks: boolean;
}) {
  const slots = cols * rows;
  return (
    <div className="print-sheet">
      <div
        className="print-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {Array.from({ length: slots }, (_, i) => {
          const cell = cells[i];
          return (
            <div
              key={i}
              className={"print-cell " + (showCutMarks ? "with-cut-marks" : "")}
            >
              {cell ? (
                <>
                  <CellQr url={cell.url} />
                  {showLabel && <span className="cell-label">{cell.label}</span>}
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CellQr({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 1, width: 512 }),
      )
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);
  if (!dataUrl) {
    return <div className="cell-qr-placeholder" aria-hidden />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="" className="cell-qr" />;
}

function PrintStyles() {
  return (
    <style jsx global>{`
      @page {
        size: A4;
        margin: 10mm;
      }

      .print-area {
        background: #f1f5f9;
        padding: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      .print-sheet {
        width: 190mm;
        height: 277mm;
        background: white;
        box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
        page-break-after: always;
        break-after: page;
        padding: 0;
        box-sizing: border-box;
      }

      .print-sheet:last-child {
        page-break-after: auto;
        break-after: auto;
      }

      .print-grid {
        width: 100%;
        height: 100%;
        display: grid;
        gap: 0;
      }

      .print-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4mm;
        gap: 2mm;
        box-sizing: border-box;
        min-width: 0;
        min-height: 0;
      }

      .print-cell.with-cut-marks {
        border: 1px dashed #cbd5e1;
      }

      .cell-qr {
        width: auto;
        height: auto;
        max-width: 100%;
        max-height: 100%;
        flex: 1 1 auto;
        object-fit: contain;
        min-height: 0;
      }

      .cell-qr-placeholder {
        flex: 1 1 auto;
        width: 100%;
        background: #f1f5f9;
        border-radius: 4px;
        min-height: 0;
      }

      .cell-label {
        font-size: 9pt;
        line-height: 1.2;
        color: #0f172a;
        text-align: center;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      @media print {
        body,
        html {
          background: white;
        }
        .screen-only {
          display: none !important;
        }
        .print-area {
          background: white;
          padding: 0;
          gap: 0;
        }
        .print-sheet {
          width: 100%;
          height: 100vh;
          box-shadow: none;
        }
        .print-cell.with-cut-marks {
          border-color: #94a3b8;
        }
      }
    `}</style>
  );
}
