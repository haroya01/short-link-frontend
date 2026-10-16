import { useState } from "react";
import { Download, MoreHorizontal, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { CopyButton } from "@/components/common/copy-button";
import { ShareButton } from "@/components/common/share-button";
import { DestinationHealthBanner } from "@/components/links/stats/destination-health-banner";
import { LinkModerationBanner } from "@/components/links/stats/link-moderation-banner";
import { PublicStatsToggle } from "@/components/links/stats/public-stats-toggle";
import { QrButton } from "@/components/links/qr/button";
import { Button } from "@/components/ui/button";
import { buildStatsCsv, statsCsvFilename } from "@/lib/stats-csv";
import { useLinkDetail } from "@/lib/api/links.queries";
import type { LinkStats } from "@/types";

type Props = {
  data: LinkStats;
  shortUrl: string;
  shortCodeLabel: string;
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
export function Header({ data, shortUrl, shortCodeLabel, demo = false, onSettings, settingsActive }: Props) {
  const t = useTranslations("stats");
  const [moreOpen, setMoreOpen] = useState(false);
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
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="line-clamp-2 text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
            {title || display}
          </h1>
          {title && <p className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm">
            <a
              href={display}
              target="_blank"
              rel="noreferrer"
              aria-label={shortCodeLabel}
              className="vt-link-code truncate font-mono font-medium text-accent-700 hover:underline dark:text-accent-400"
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
        <div className="flex gap-2 sm:hidden">
          <CopyButton variant={demo ? "outline" : "accent"} size="lg" value={display} className="flex-1" />
          <ShareButton url={display} title={title || display} variant="outline" size="lg" className="flex-1" />
          <Button
            variant="outline"
            size="lg"
            className="px-3"
            onClick={() => setMoreOpen(true)}
            aria-label={t("moreActions")}
            aria-haspopup="dialog"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} label={t("moreActions")}>
          <div className="space-y-2 pb-1">
            <QrButton value={display} filename={`${data.shortCode}.png`} size="lg" />
            {onSettings && (
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => {
                  setMoreOpen(false);
                  onSettings();
                }}
              >
                <Settings2 className="h-4 w-4" />
                {t("linkSettings")}
              </Button>
            )}
            {!demo && (
              <PublicStatsToggle
                shortCode={data.shortCode}
                className="min-h-11 flex-wrap justify-between rounded-lg border border-slate-300 px-4 dark:border-slate-700"
              />
            )}
            <Button variant="outline" size="lg" className="w-full" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              {t("exportCsv")}
            </Button>
          </div>
        </BottomSheet>
        <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
          <CopyButton variant={demo ? "outline" : "accent"} size="sm" value={display} />
          <QrButton value={display} filename={`${data.shortCode}.png`} />
          {onSettings && (
            <Button variant={settingsActive ? "subtle" : "ghost"} size="sm" className="min-h-9" onClick={onSettings} aria-pressed={settingsActive}>
              <Settings2 className="h-4 w-4" />
              {t("linkSettings")}
            </Button>
          )}
          {!demo && <PublicStatsToggle shortCode={data.shortCode} className="px-2" />}
          <Button variant="ghost" size="sm" onClick={exportCsv} aria-label={t("exportCsv")} title={t("exportCsv")}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </div>
      {!demo && detail && <LinkModerationBanner detail={detail} />}
      {!demo && detail && <DestinationHealthBanner detail={detail} shortUrl={display} />}
    </div>
  );
}
