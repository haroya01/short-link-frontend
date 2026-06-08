"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Document, Page, pdfjs } from "react-pdf";

// pdfjs worker — Next.js / Vercel 에서도 동작하도록 unpkg cdn 사용. 자체 호스팅 worker 도 가능하나
// dependency 버전 동기화가 번거롭다.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type QrBoxFraction = { x: number; y: number; size: number };

const MIN_SIZE = 0.05;
const MAX_SIZE = 0.5;

/**
 * PDF 첫 페이지를 캔버스에 렌더하고, 그 위에 드래그/리사이즈 가능한 QR 박스 오버레이. 박스 좌표는 페이지 크기에 대한 fraction (0–1) 으로 들고
 * 다님 — 미리보기 픽셀과 실제 PDF point 사이의 변환이 단순해진다.
 */
export function PdfPreview({
  file,
  box,
  onBoxChange,
  qrDataUrl,
}: {
  file: File;
  box: QrBoxFraction;
  onBoxChange: (b: QrBoxFraction) => void;
  qrDataUrl: string | null;
}) {
  const t = useTranslations("campaignApp.posterBuilder");
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [pageHeight, setPageHeight] = useState<number>(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerWidth(el.clientWidth);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const onLoadSuccess = useCallback(
    (page: { width: number; height: number }) => {
      if (containerWidth === 0) return;
      const scale = containerWidth / page.width;
      setPageHeight(page.height * scale);
    },
    [containerWidth],
  );

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <Document file={file} loading={null}>
        <Page
          pageNumber={1}
          width={containerWidth || undefined}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          onLoadSuccess={onLoadSuccess}
        />
      </Document>
      {pageHeight > 0 && (
        <DraggableBox
          containerWidth={containerWidth}
          containerHeight={pageHeight}
          box={box}
          onBoxChange={onBoxChange}
          qrDataUrl={qrDataUrl}
        />
      )}
    </div>
  );
}

function DraggableBox({
  containerWidth,
  containerHeight,
  box,
  onBoxChange,
  qrDataUrl,
}: {
  containerWidth: number;
  containerHeight: number;
  box: QrBoxFraction;
  onBoxChange: (b: QrBoxFraction) => void;
  qrDataUrl: string | null;
}) {
  const t = useTranslations("campaignApp.posterBuilder");
  // QR 정사각이므로 px 크기 = page width × box.size. (가로 기준 fraction.)
  const sizePx = box.size * containerWidth;
  const leftPx = box.x * containerWidth;
  const topPx = box.y * containerHeight;

  const dragging = useRef<{ mode: "move" | "resize"; startX: number; startY: number } | null>(
    null,
  );

  function onMoveStart(e: React.PointerEvent) {
    if ((e.target as HTMLElement).dataset.handle === "resize") return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = { mode: "move", startX: e.clientX - leftPx, startY: e.clientY - topPx };
  }

  function onResizeStart(e: React.PointerEvent) {
    e.stopPropagation();
    (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = { mode: "resize", startX: e.clientX, startY: e.clientY };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragging.current;
    if (!drag) return;
    if (drag.mode === "move") {
      const nextLeftPx = clamp(e.clientX - drag.startX, 0, containerWidth - sizePx);
      const nextTopPx = clamp(e.clientY - drag.startY, 0, containerHeight - sizePx);
      onBoxChange({
        x: nextLeftPx / containerWidth,
        y: nextTopPx / containerHeight,
        size: box.size,
      });
    } else {
      // resize from bottom-right corner. e.clientX 는 viewport 좌표, 박스 left 도 viewport 기준으로
      // 환산해서 거리를 잡아야 한다. 박스 div 의 getBoundingClientRect().left 가 그 viewport left.
      const boxRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const nextSizePx = clamp(
        e.clientX - boxRect.left,
        MIN_SIZE * containerWidth,
        Math.min(containerWidth - leftPx, containerHeight - topPx, MAX_SIZE * containerWidth),
      );
      onBoxChange({ x: box.x, y: box.y, size: nextSizePx / containerWidth });
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    dragging.current = null;
  }

  return (
    <div
      role="group"
      aria-label={t("boxAria")}
      onPointerDown={onMoveStart}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: "absolute",
        left: leftPx,
        top: topPx,
        width: sizePx,
        height: sizePx,
        cursor: dragging.current?.mode === "resize" ? "nwse-resize" : "move",
        background: qrDataUrl ? "white" : "rgba(5, 150, 105, 0.18)",
        border: "2px solid rgba(5, 150, 105, 0.85)",
        borderRadius: 4,
        touchAction: "none",
      }}
    >
      {qrDataUrl ? (
        // 실제 QR 이미지를 박스 안에 그대로 박아 사용자에게 합성 결과를 즉시 보여준다.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrDataUrl}
          alt={t("qrPreviewAlt")}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      ) : (
        <div
          className="grid h-full w-full place-items-center text-[11px] font-medium uppercase tracking-wider text-accent-700 dark:text-accent-400"
          style={{ pointerEvents: "none" }}
        >
          QR
        </div>
      )}
      <div
        data-handle="resize"
        onPointerDown={onResizeStart}
        style={{
          position: "absolute",
          right: -6,
          bottom: -6,
          width: 14,
          height: 14,
          borderRadius: 999,
          background: "white",
          border: "2px solid #059669",
          cursor: "nwse-resize",
          touchAction: "none",
        }}
      />
    </div>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}
