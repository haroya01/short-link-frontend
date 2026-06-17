"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, Loader2, QrCode, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { truncateMiddle } from "@/lib/utils";

type Props = {
  url?: string;
  value?: string;
  filename?: string;
  /** Override the center logo with a specific image (e.g., the kurl mark for profile QRs). */
  logoSrc?: string;
  /**
   * Show the {@code ?src=qr-…} attribution input. True for short links (user can tag separate
   * placements like {@code poster}, {@code business-card}). False for profile QRs — there's no
   * campaign to attribute and the field just confuses the user. When hidden, the URL still gets
   * a default {@code ?src=qr-profile} hint baked in.
   */
  showSrcInput?: boolean;
  /** Default value for the src hint when {@link showSrcInput} is false. */
  defaultSrcHint?: string;
  /**
   * Renders as a single icon-only button (no "QR" label). Used when slotting into a tight share
   * row where surrounding icons already establish the "copy / open / qr" vocabulary.
   */
  iconOnly?: boolean;
};

type Palette = { id: string; dark: string; light: string };

const PALETTES: Palette[] = [
  { id: "slate", dark: "#0F172A", light: "#FFFFFF" },
  { id: "ink", dark: "#000000", light: "#FFFFFF" },
  { id: "ocean", dark: "#0369A1", light: "#F0F9FF" },
  { id: "forest", dark: "#15803D", light: "#F0FDF4" },
  { id: "rose", dark: "#BE123C", light: "#FFF1F2" },
  { id: "violet", dark: "#6D28D9", light: "#F5F3FF" },
];

/**
 * Apply a {@code ?src=…} hint to the QR target so stats attribute scans separately from regular
 * clicks (referrer is empty for camera scans). The user can override the hint to tag specific
 * placements ({@code poster}, {@code offline-card}, etc) — empty falls back to {@code qr}, and a
 * pre-existing {@code ?src=} on the URL takes priority over both.
 */
function withQrSrc(url: string, hint: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.searchParams.has("src")) return u.toString();
    const cleaned = hint.trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
    u.searchParams.set("src", cleaned ? `qr-${cleaned}` : "qr");
    return u.toString();
  } catch {
    return url;
  }
}

function destinationFaviconUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch {
    return null;
  }
}

export function QrButton({
  url,
  value,
  filename = "qrcode.png",
  logoSrc,
  showSrcInput = true,
  defaultSrcHint = "",
  iconOnly = false,
}: Props) {
  const t = useTranslations("qr");
  const baseUrl = url ?? value ?? "";
  const [open, setOpen] = useState(false);

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!baseUrl}
          aria-label={t("triggerAria")}
          title={t("triggerAria")}
          className="grid h-8 w-8 place-items-center rounded-md text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50"
        >
          <QrCode className="h-3.5 w-3.5" />
        </button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={!baseUrl}>
          <QrCode className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">QR</span>
        </Button>
      )}
      {open && (
        <QrModal
          baseUrl={baseUrl}
          filename={filename}
          logoSrc={logoSrc}
          showSrcInput={showSrcInput}
          defaultSrcHint={defaultSrcHint}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function QrModal({
  baseUrl,
  filename,
  logoSrc,
  showSrcInput,
  defaultSrcHint,
  onClose,
}: {
  baseUrl: string;
  filename: string;
  logoSrc?: string;
  showSrcInput: boolean;
  defaultSrcHint: string;
  onClose: () => void;
}) {
  const t = useTranslations("qr");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [srcHint, setSrcHint] = useState(defaultSrcHint);
  const [paletteId, setPaletteId] = useState<string>(PALETTES[0].id);
  // Default logo on when caller supplied one (typical: branded profile QR) — for plain link QRs
  // we leave it off so the user opts in.
  const [withLogo, setWithLogo] = useState(Boolean(logoSrc));
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const target = useMemo(() => withQrSrc(baseUrl, srcHint), [baseUrl, srcHint]);
  const palette = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];
  const logoUrl = useMemo(
    () => (withLogo ? (logoSrc ?? destinationFaviconUrl(baseUrl)) : null),
    [baseUrl, withLogo, logoSrc],
  );

  // Render QR onto a canvas. When a logo is requested, we draw it center-cropped over a small
  // white square so the underlying modules stay readable; bumped error-correction to H to absorb
  // the obstruction. The same canvas drives both preview and download.
  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toCanvas(canvas, target, {
          width: 512,
          margin: 1,
          color: { dark: palette.dark, light: palette.light },
          errorCorrectionLevel: withLogo ? "H" : "M",
        }),
      )
      .then(async () => {
        if (cancelled) return;
        if (logoUrl) {
          await drawLogo(canvas, logoUrl, palette.light);
        }
        if (!cancelled) setDataUrl(canvas.toDataURL("image/png"));
        // qrcode 라이브러리가 canvas.style 에 inline 512px 박아서 Tailwind h-full/w-full 을
        // 무력화시킴. 인라인 클리어해서 wrapper 에 맞게 축소되게 (intrinsic 512 은 download 용으로 유지).
        canvas.style.width = "";
        canvas.style.height = "";
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [target, palette.dark, palette.light, logoUrl, withLogo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function download() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      toast(t("copied"), "success");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast(t("copyFailed"), "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        className="relative w-full max-w-sm animate-fade-in rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center px-6 py-6">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("title")}</p>
          <div
            className="mt-3 flex h-64 w-64 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 p-2"
            style={{ backgroundColor: palette.light }}
          >
            <canvas ref={canvasRef} className="qr-canvas-fit h-full w-full" />
            {!dataUrl && <Loader2 className="absolute h-6 w-6 animate-spin text-slate-300" />}
          </div>
          <p
            className="mt-3 max-w-full truncate text-center text-xs text-slate-500 dark:text-slate-400"
            title={target}
          >
            {truncateMiddle(target, 48)}
          </p>

          <div className="mt-4 w-full space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("colorLabel")}</p>
            <div className="flex flex-wrap gap-1.5">
              {PALETTES.map((p) => {
                const active = p.id === paletteId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={p.id}
                    onClick={() => setPaletteId(p.id)}
                    className={
                      "h-7 w-7 rounded-full border transition " +
                      (active ? "ring-2 ring-offset-1 ring-slate-900 dark:ring-slate-100 dark:ring-offset-slate-950" : "border-slate-200 dark:border-slate-800")
                    }
                    style={{ backgroundColor: p.dark }}
                  />
                );
              })}
            </div>
          </div>

          <label className="mt-3 flex w-full items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300">
            <span>{t("logoLabel")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={withLogo}
              onClick={() => setWithLogo((v) => !v)}
              className={
                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition " +
                (withLogo ? "bg-slate-900" : "bg-slate-200 dark:bg-slate-800")
              }
            >
              <span
                className={
                  "inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-900 shadow transition " +
                  (withLogo ? "translate-x-4" : "translate-x-0.5")
                }
              />
            </button>
          </label>

          {showSrcInput && (
            <label className="mt-3 w-full space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t("srcLabel")}</span>
              <Input
                type="text"
                value={srcHint}
                onChange={(e) => setSrcHint(e.target.value)}
                placeholder={t("srcPlaceholder")}
                className="h-8 font-mono text-xs"
                maxLength={32}
              />
            </label>
          )}
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={copyUrl}
            disabled={!dataUrl}
            className="flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 py-3 text-sm text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-accent-600 dark:text-accent-400" /> {t("copied")}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> {t("copyUrl")}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!dataUrl}
            className="flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 py-3 text-sm text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> {t("downloadPng")}
          </button>
        </div>
      </div>
    </div>
  );
}

async function drawLogo(canvas: HTMLCanvasElement, logoUrl: string, bgColor: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("logo load failed"));
    img.src = logoUrl;
  }).catch(() => null);
  if (!img.complete || img.naturalWidth === 0) return;
  const size = canvas.width;
  const logoSize = Math.round(size * 0.18);
  const padding = Math.round(logoSize * 0.18);
  const x = (size - logoSize) / 2;
  const y = (size - logoSize) / 2;
  ctx.fillStyle = bgColor;
  ctx.fillRect(x - padding, y - padding, logoSize + padding * 2, logoSize + padding * 2);
  ctx.drawImage(img, x, y, logoSize, logoSize);
}
