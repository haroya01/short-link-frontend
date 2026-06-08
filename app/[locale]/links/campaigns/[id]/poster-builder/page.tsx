"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, FileUp, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { getCampaign, listCampaignBatches } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import type { CampaignBatch, CampaignDetail } from "@/types";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// react-pdf 가 worker / canvas 의존성 때문에 SSR 에서 깨짐. dynamic + ssr:false 로 클라이언트 전용.
const PdfPreview = dynamic(() => import("./pdf-preview").then((m) => m.PdfPreview), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[1/1.414] w-full rounded-lg" />,
});

type QrBoxFraction = { x: number; y: number; size: number };

const DEFAULT_BOX: QrBoxFraction = { x: 0.7, y: 0.7, size: 0.2 };

/**
 * Poster builder — 사용자가 자기 PDF 포스터를 업로드하고, QR 박스 한 개의 위치/크기를 자유롭게 정한다. "합성" 누르면 캠페인의 모든 batch 마다 PDF
 * 페이지를 복제해 각 batch QR 을 박은 N-페이지 합본 PDF 를 다운로드. 인쇄소에 통째로 발주하는 흐름.
 *
 * <p>v1.5 의 단순한 인쇄 자산 (A4 시트) 과 별개로, 사용자가 *자기 디자인* 을 가져온 경우 QR 만 자동 박아주는 도구. Canva mini 가 아니라 *좌표
 * 합성기*. 디자인 작업은 사용자 책임 (Canva / Illustrator).
 */
export default function PosterBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = Number(id);
  const { authenticated, ready } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("campaignApp.posterBuilder");

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [batches, setBatches] = useState<CampaignBatch[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pageWidthPt, setPageWidthPt] = useState<number | null>(null);
  const [pageHeightPt, setPageHeightPt] = useState<number | null>(null);
  const [box, setBox] = useState<QrBoxFraction>(DEFAULT_BOX);
  const [composing, setComposing] = useState(false);

  // 첫 batch 의 QR 을 미리보기에 박는다. 박스 위치/크기 조절 시 사용자가 *실제 결과물* 을
  // 즉시 본다 (이전엔 박스 안에 "QR" 글자만 있어서 합성하기 전까지 결과를 못 봤음). batch 가
  // 아직 없는 사용자는 generic kurl.me 로 placeholder QR 미리보기.
  const previewShortUrl =
    batches === null ? null : (batches[0]?.shortUrl ?? "https://kurl.me");
  const previewBatchCount = batches?.length ?? 0;
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!previewShortUrl) {
      setPreviewQrDataUrl(null);
      return;
    }
    let cancelled = false;
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(previewShortUrl, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 512,
        }),
      )
      .then((url) => {
        if (!cancelled) setPreviewQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPreviewQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [previewShortUrl]);

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
        if (!cancelled) setError(err instanceof Error ? err.message : t("loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, campaignId, t]);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) {
        setPdfFile(null);
        setPdfBytes(null);
        setPageWidthPt(null);
        setPageHeightPt(null);
        return;
      }
      if (file.type !== "application/pdf") {
        toast(t("pdfOnly"), "error");
        return;
      }
      const buf = await file.arrayBuffer();
      try {
        const { PDFDocument } = await import("pdf-lib");
        const doc = await PDFDocument.load(buf);
        const page = doc.getPage(0);
        const { width, height } = page.getSize();
        setPdfFile(file);
        setPdfBytes(buf);
        setPageWidthPt(width);
        setPageHeightPt(height);
        setBox(DEFAULT_BOX);
      } catch {
        toast(t("pdfReadFailed"), "error");
      }
    },
    [toast, t],
  );

  async function compose() {
    if (!pdfBytes || !pageWidthPt || !pageHeightPt || !batches || batches.length === 0) return;
    setComposing(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const source = await PDFDocument.load(pdfBytes);
      const out = await PDFDocument.create();
      // 박스의 PDF 좌표 (pdf-lib 은 좌하단 원점, 미리보기 박스는 좌상단 기준이라 y 뒤집기).
      const boxWidthPt = box.size * pageWidthPt;
      const boxHeightPt = boxWidthPt; // QR 정사각
      const boxLeftPt = box.x * pageWidthPt;
      const boxTopPt = box.y * pageHeightPt;
      const boxBottomPt = pageHeightPt - boxTopPt - boxHeightPt;

      // QR 픽셀 크기 — 인쇄용 200dpi 기준 (pt = 1/72 inch, 200dpi → 200/72 px per pt)
      const qrPx = Math.max(256, Math.round(boxWidthPt * (200 / 72)));

      const { default: QRCode } = await import("qrcode");

      for (const batch of batches) {
        const [page] = await out.copyPages(source, [0]);
        const pngDataUrl = await QRCode.toDataURL(batch.shortUrl, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: qrPx,
        });
        const pngBytes = dataUrlToBytes(pngDataUrl);
        const qrImage = await out.embedPng(pngBytes);
        page.drawImage(qrImage, {
          x: boxLeftPt,
          y: boxBottomPt,
          width: boxWidthPt,
          height: boxHeightPt,
        });
        out.addPage(page);
      }

      const bytes = await out.save();
      // pdf-lib 의 Uint8Array 결과를 그대로 Blob 에 넣으면 환경에 따라 BlobPart 추론이 깨질 수 있어
      // ArrayBuffer view 로 좁혀서 전달.
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const filename = `${(campaign?.name ?? "campaign").replace(/[^A-Za-z0-9가-힣._-]/g, "_")}-posters.pdf`;
      triggerDownload(url, filename);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast(t("composed", { count: batches.length }), "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : t("composeFailed"), "error");
    } finally {
      setComposing(false);
    }
  }

  const batchCount = batches?.length ?? 0;
  const canCompose = !!pdfBytes && batchCount > 0 && !composing;

  if (ready && !authenticated) {
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 dark:text-slate-100 sm:text-[30px]">
          {t("loginRequired")}
        </h1>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <Link
        href={`/campaigns/${campaignId}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t("backToCampaign")}
      </Link>

      <div>
        <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 dark:text-slate-100 sm:text-[30px]">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {loading ? (
            <Skeleton className="inline-block h-4 w-48" />
          ) : campaign ? (
            <>
              {t.rich("introCampaign", {
                name: () => <span className="font-medium text-slate-700 dark:text-slate-300">{campaign.name}</span>,
                count: batchCount,
              })}
            </>
          ) : null}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 px-4 py-3 text-[12px] leading-snug text-slate-600 dark:text-slate-300">
        {t("toolHint")}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {!pdfFile ? (
            <DropZone onPick={handleFile} />
          ) : (
            <PreviewWithBox
              file={pdfFile}
              box={box}
              onBoxChange={setBox}
              onRemove={() => handleFile(null)}
              qrDataUrl={previewQrDataUrl}
              batchCount={previewBatchCount}
            />
          )}
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("targetLabel")}
            </p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              {t.rich("targetSummary", {
                count: batchCount,
                pages: batchCount,
                strong: (chunks) => (
                  <span className="font-medium text-slate-900 dark:text-slate-100">{chunks}</span>
                ),
              })}
            </p>
            {batchCount === 0 && (
              <p className="mt-2 text-[11px] text-rose-600">
                {t("noBatchesHint")}
              </p>
            )}
          </div>

          <Button
            variant="accent"
            onClick={compose}
            disabled={!canCompose}
            className="w-full"
          >
            <Download className="h-4 w-4" aria-hidden />
            {composing ? t("composing") : t("download", { count: batchCount })}
          </Button>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            {t("notSavedHint")}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function DropZone({ onPick }: { onPick: (file: File) => void }) {
  const t = useTranslations("campaignApp.posterBuilder");
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);
  return (
    <label
      onDragEnter={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onPick(file);
      }}
      className={
        "flex aspect-[1/1.414] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white dark:bg-slate-900 text-center transition-colors " +
        (hover ? "border-accent-500 bg-accent-50/40 dark:bg-accent-500/10" : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50")
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          // reset value so re-selecting the same file fires onChange again
          if (inputRef.current) inputRef.current.value = "";
        }}
        className="sr-only"
      />
      <FileUp className="h-8 w-8 text-slate-400 dark:text-slate-500" aria-hidden />
      <p className="mt-3 text-sm font-medium text-slate-900 dark:text-slate-100">{t("dropTitle")}</p>
      <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{t("dropSubtitle")}</p>
    </label>
  );
}

function PreviewWithBox({
  file,
  box,
  onBoxChange,
  onRemove,
  qrDataUrl,
  batchCount,
}: {
  file: File;
  box: QrBoxFraction;
  onBoxChange: (b: QrBoxFraction) => void;
  onRemove: () => void;
  qrDataUrl: string | null;
  batchCount: number;
}) {
  const t = useTranslations("campaignApp.posterBuilder");
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[12px] text-slate-500 dark:text-slate-400">
        <span className="truncate font-mono">{file.name}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("removePdf")}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> {t("otherPdf")}
        </button>
      </div>
      <PdfPreview file={file} box={box} onBoxChange={onBoxChange} qrDataUrl={qrDataUrl} />
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        {t("dragHint")}
        {batchCount > 1 && (
          <>
            {" "}
            {t("previewFirstBatch", { count: batchCount })}
          </>
        )}
        {batchCount === 0 && (
          <>
            {" "}
            {t("previewPlaceholder")}
          </>
        )}
      </p>
    </div>
  );
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
