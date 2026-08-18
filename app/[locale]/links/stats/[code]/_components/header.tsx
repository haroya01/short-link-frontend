import { Download, ExternalLink, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/common/copy-button";
import { PublicStatsToggle } from "@/components/links/stats/public-stats-toggle";
import { QrButton } from "@/components/links/qr/button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildStatsCsv, statsCsvFilename } from "@/lib/stats-csv";
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
export function Header({ data, shortUrl, shortCodeLabel, onCopy, demo = false }: Props) {
  const t = useTranslations("stats");
  const display = shortUrl || `/${data.shortCode}`;

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
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {/* 모바일은 압축 — 아이브로·큰 코드·URL 칩·버튼 두 줄이 첫 폴드를 다 먹으면 정작
          KPI(총 클릭)가 밀린다. 코드/URL 반 줄 + 액션 랩 한 덩어리로. sm+ 는 기존 위계 유지. */}
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:gap-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
        <div className="min-w-0">
          <p className="hidden items-center gap-1.5 font-mono text-[11px] uppercase tracking-tagline text-accent-700 dark:text-accent-400 sm:flex">
            <Link2 className="h-3 w-3" />
            {shortCodeLabel}
          </p>
          <a
            href={display}
            target="_blank"
            rel="noreferrer"
            aria-label={shortCodeLabel}
            className="vt-link-code group block truncate font-mono text-xl font-bold leading-none tracking-tight text-slate-900 dark:text-slate-100 transition-colors hover:text-accent-700 sm:mt-2 sm:text-2xl"
          >
            /{data.shortCode}
          </a>
          <a
            href={display}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-flex max-w-full items-center gap-1.5 truncate rounded-lg bg-slate-50 dark:bg-slate-800/50 px-2 py-1 text-[12px] text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 sm:mt-2"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate font-mono">{display}</span>
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!demo && <PublicStatsToggle shortCode={data.shortCode} />}
          <div className="flex items-center gap-1.5">
            <CopyButton variant="outline" size="sm" value={display} onCopied={onCopy} />
            <QrButton value={display} filename={`${data.shortCode}.png`} />
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" /> {t("exportCsv")}
            </Button>
          </div>
        </div>
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
        <p className="vt-link-code mt-3 w-fit truncate font-mono text-xl font-bold leading-none tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
          /{shortCode}
        </p>
      ) : (
        <Skeleton className="mt-3 h-7 w-56" />
      )}
      <Skeleton className="mt-3 h-4 w-72" />
    </div>
  );
}
