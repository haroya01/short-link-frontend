import { Download, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/common/copy-button";
import { PublicStatsToggle } from "@/components/links/stats/public-stats-toggle";
import { QrButton } from "@/components/links/qr/button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildStatsCsv, statsCsvFilename } from "@/lib/stats-csv";
import { useLinkDetail } from "@/lib/api/links.queries";
import type { LinkStats } from "@/types";

type Props = {
  data: LinkStats;
  shortUrl: string;
  shortCodeLabel: string;
  onCopy: () => void;
  /**
   * Public {@code /demo} route renders this header against synthetic data — visibility toggle
   * (which calls {@code PATCH /api/v1/links/{code}/visibility}) would 401 without a session, so
   * it's suppressed there. Copy + QR still work because they read from the local value.
   */
  demo?: boolean;
  onSettings?: () => void;
  settingsActive?: boolean;
};

/**
 * Stats hero card. Distinct from the body sections: an accent eyebrow + an oversized URL serves
 * as the typographic anchor so the page has a clear "this is the link you're looking at" landing
 * pad before the dense KPI grid. Surface stays flat — no halo, no gradient hairline — so the data
 * grid below carries the weight without competing accents.
 *
 * <p>The {@code demo} flag suppresses {@link PublicStatsToggle} — the toggle calls
 * {@code PATCH /api/v1/links/{code}/visibility} which would 401 on the public {@code /demo} route.
 * Copy + QR still work because they read from the local value.
 */
export function Header({ data, shortUrl, shortCodeLabel, onCopy, demo = false, onSettings, settingsActive }: Props) {
  const t = useTranslations("stats");
  const display = shortUrl || `/${data.shortCode}`;
  const { data: detail } = useLinkDetail(demo ? undefined : data.shortCode);
  let destinationHost = "";
  try { destinationHost = detail?.originalUrl ? new URL(detail.originalUrl).hostname : ""; } catch { /* Keep the short URL as fallback. */ }
  const title = detail?.note?.trim() || detail?.ogTitleOverride || detail?.ogTitle || destinationHost;

  // 데이터 소유권: 화면의 수치는 언제나 들고 나갈 수 있어야 한다(마크다운 개방 캠페인의 통계판).
  function exportCsv() {
    const blob = new Blob([buildStatsCsv(data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = statsCsvFilename(data.shortCode);
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="line-clamp-2 text-2xl font-semibold tracking-headline text-slate-900 dark:text-slate-100">
          {title || display}
        </h1>
        {title && <p className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm">
          <a
            href={display}
            target="_blank"
            rel="noreferrer"
            aria-label={shortCodeLabel}
            className="vt-link-code truncate font-medium text-accent-700 hover:underline dark:text-accent-400"
          >
            {display.replace(/^https?:\/\//, "")}
          </a>
          {destinationHost && (
            <>
              <span aria-hidden className="text-slate-300 dark:text-slate-600">→</span>
              <span className="truncate text-slate-500 dark:text-slate-400">{destinationHost}</span>
            </>
          )}
        </p>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <CopyButton variant={demo ? "outline" : "accent"} size="sm" value={display} onCopied={onCopy} />
        <QrButton value={display} filename={`${data.shortCode}.png`} />
        {onSettings && (
          <Button variant={settingsActive ? "subtle" : "ghost"} size="sm" className="min-h-9" onClick={onSettings} aria-pressed={settingsActive}>
            <Settings2 className="h-4 w-4" />
            {t("linkSettings")}
          </Button>
        )}
        {!demo && <PublicStatsToggle shortCode={data.shortCode} />}
        <Button variant="ghost" size="sm" onClick={exportCsv} aria-label={t("exportCsv")} title={t("exportCsv")}>
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">CSV</span>
        </Button>
      </div>
    </div>
  );
}

export function HeaderSkeleton({ shortCode }: { shortCode?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-6">
      <Skeleton className="h-3 w-20" />
      {/* 코드는 라우트에서 이미 안다 — 스켈레톤 단계에 실코드를 그려야 대시보드 /코드 와의
          view-transition 페어(vt-link-code)가 로딩 중에도 성립한다(늦으면 old 만 남아 모프 무산). */}
      {shortCode ? (
        <p className="vt-link-code mt-3 w-fit truncate text-base font-semibold leading-snug tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
          /{shortCode}
        </p>
      ) : (
        <Skeleton className="mt-3 h-7 w-56" />
      )}
      <Skeleton className="mt-3 h-4 w-72" />
    </div>
  );
}
