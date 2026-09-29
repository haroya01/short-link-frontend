"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, Check, Plus, QrCode } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CAMPAIGN_END, CAMPAIGN_START, summarize, type MockData } from "../_lib/mock-data";
import { useInView } from "@/lib/animations";
import { formatNumber } from "@/lib/utils";

function useNumberFormats() {
  const locale = useLocale();
  return {
    int: new Intl.NumberFormat(locale),
    dec: new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  };
}

export function MockKpi({ mock }: { mock: MockData }) {
  const t = useTranslations("qrCampaigns.mock");
  const { int, dec } = useNumberFormats();
  const sum = summarize(mock);
  const { ref, seen } = useInView(0.3);
  return (
    <div ref={ref} data-reveal={seen ? "on" : "off"} className="space-y-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2.5 inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {t("kpiBeforeKurl")}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
            {mock.campaignName}
          </p>
          <span className="flex-shrink-0 text-[10px] font-medium text-slate-600 dark:text-slate-400">
            {t("kpiStatus")}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800">
          <KpiCellMini label={t("kpiDistributed")} value={int.format(sum.distributed)} />
          <KpiCellMini label={t("kpiClicks")} value="?" muted />
          <KpiCellMini label={t("kpiPer100")} value="?" muted />
          <KpiCellMini label={t("kpiTopArea")} value="?" muted />
        </div>
      </div>

      <div className="rv-pop flex justify-center" style={{ animationDelay: "0.15s" }}>
        <ArrowDown className="h-4 w-4 text-slate-400 dark:text-slate-400" aria-hidden />
      </div>

      <div
        className="rv-rise rounded-2xl border border-accent-200 bg-accent-50/30 p-4 dark:border-accent-500/30 dark:bg-accent-500/10"
        style={{ animationDelay: "0.35s" }}
      >
        <div className="mb-2.5 inline-flex items-center rounded-md bg-accent-100 px-2 py-1 text-[10px] font-semibold text-accent-800 dark:bg-accent-500/15 dark:text-accent-400">
          {t("kpiAfterKurl")}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
            {mock.campaignName}
          </p>
          <span className="flex-shrink-0 text-[10px] font-medium text-accent-700 dark:text-accent-400">
            {t("kpiStatusAfter")}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 divide-x divide-accent-100 dark:divide-slate-800">
          <KpiCellMini label={t("kpiDistributed")} value={int.format(sum.distributed)} />
          <KpiCellMini label={t("kpiClicks")} value={int.format(sum.clicks)} accent />
          <KpiCellMini label={t("kpiPer100")} value={dec.format(sum.per100)} accent />
          <KpiCellMini label={t("kpiTopArea")} value={sum.best.label} accent />
        </div>
      </div>
    </div>
  );
}

function KpiCellMini({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 px-2 py-1 first:pl-0 last:pr-0">
      <p className="truncate text-[10px] font-medium text-slate-600 dark:text-slate-400">
        {label}
      </p>
      <p
        className={
          "mt-0.5 text-[14px] font-semibold tabular-nums leading-tight tracking-headline " +
          (muted
            ? "text-slate-500 dark:text-slate-400"
            : accent
              ? "text-accent-700 dark:text-accent-400"
              : "text-slate-900 dark:text-slate-100")
        }
      >
        {value}
      </p>
    </div>
  );
}

export function MockBatch({ mock }: { mock: MockData }) {
  const t = useTranslations("qrCampaigns.mock");
  const { ref, seen } = useInView(0.3);
  return (
    <div
      ref={ref}
      data-reveal={seen ? "on" : "off"}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
        <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{t("batchTitle")}</p>
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Plus className="h-3 w-3" aria-hidden />
          {t("batchAdd")}
        </span>
      </div>
      <div className="grid grid-cols-[2fr_1fr_1.2fr_0.8fr_auto] gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-2.5 text-[10px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
        <span>{t("batchColName")}</span>
        <span>{t("batchColArea")}</span>
        <span>{t("batchColDist")}</span>
        <span className="text-right">{t("batchColQty")}</span>
        <span className="text-right">{t("batchColStatus")}</span>
      </div>
      {mock.rows.map((row, i) => (
        <div
          key={row.name}
          className="rv-rise grid grid-cols-[2fr_1fr_1.2fr_0.8fr_auto] items-center gap-2 border-b border-slate-100 px-5 py-3 text-[12px] last:border-b-0 dark:border-slate-800"
          style={{ animationDelay: `${0.1 + i * 0.08}s` }}
        >
          <span className="truncate font-medium text-slate-900 dark:text-slate-100">{row.name}</span>
          <span className="truncate text-slate-600 dark:text-slate-300">{row.area}</span>
          <span className="truncate text-slate-600 dark:text-slate-300">{row.dist}</span>
          <span className="text-right tabular-nums text-slate-700 dark:text-slate-300">
            {formatNumber(row.qty)}
            {t("batchUnit")}
          </span>
          <span className="flex items-center justify-end gap-1 whitespace-nowrap text-[11px] text-accent-700 dark:text-accent-400">
            <Check className="h-3 w-3" aria-hidden />
            <span className="hidden sm:inline">{t("batchDone")}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function MockPoster() {
  const t = useTranslations("qrCampaigns.mock");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const { ref, seen } = useInView(0.3);

  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL("https://kurl.me", {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 256,
        }),
      )
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    // 사용자 피드백: 모바일에서 다른 그림보다 세로가 커서, 이 그림만 폭을 좁게 둔다.
    <div
      ref={ref}
      data-reveal={seen ? "on" : "off"}
      className="mx-auto max-w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 sm:max-w-[300px]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-50 dark:bg-slate-800/40">
        <div className="absolute inset-0 flex flex-col gap-2.5 p-6">
          <div className="h-3 w-3/5 rounded-sm bg-slate-200 dark:bg-slate-800" />
          <div className="h-2 w-2/5 rounded-sm bg-slate-200 dark:bg-slate-800" />
          <div className="mt-4 h-1.5 w-full rounded-sm bg-slate-100 dark:bg-slate-800" />
          <div className="h-1.5 w-11/12 rounded-sm bg-slate-100 dark:bg-slate-800" />
          <div className="h-1.5 w-4/5 rounded-sm bg-slate-100 dark:bg-slate-800" />
          <div className="mt-auto flex flex-col gap-1.5">
            <div className="h-1.5 w-2/5 rounded-sm bg-slate-100 dark:bg-slate-800" />
            <div className="h-2 w-1/3 rounded-sm bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>

        <div
          className="rv-pop absolute left-[60%] top-[60%] h-[30%] w-[30%] rounded-md border-2 border-accent-600 bg-white dark:bg-slate-900"
          style={{ animationDelay: "0.25s" }}
        >
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="" draggable={false} className="pointer-events-none block h-full w-full select-none" />
          ) : (
            <div className="grid h-full w-full place-items-center text-[10px] font-medium text-accent-700 dark:text-accent-400">
              {t("posterBoxLabel")}
            </div>
          )}
          <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full border-2 border-accent-600 bg-white dark:bg-slate-900" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
        <p className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">{t("posterTitle")}</p>
        <span
          className="rv-rise inline-flex items-center gap-1.5 rounded-md bg-accent-50 px-2 py-1 text-[11px] font-medium text-accent-700 dark:bg-accent-500/10 dark:text-accent-400"
          style={{ animationDelay: "0.6s" }}
        >
          <QrCode className="h-3 w-3" aria-hidden />
          {t("posterPerBatch")}
        </span>
      </div>
    </div>
  );
}

export function MockBars({ mock }: { mock: MockData }) {
  const t = useTranslations("qrCampaigns.mock");
  const { int, dec } = useNumberFormats();
  const sum = summarize(mock);
  const max = Math.max(...sum.areas.map((a) => a.clicks));
  const { ref, seen } = useInView(0.3);
  return (
    <div ref={ref} data-reveal={seen ? "on" : "off"} className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{t("barsTitle")}</p>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <ArrowDown className="h-3 w-3" aria-hidden />
            {t("barsSort")}
          </span>
        </div>
        <div className="space-y-3">
          {sum.areas.map((area, i) => {
            const isTop = i === 0;
            return (
              <div key={area.label}>
                <div className="flex items-center justify-between text-[12px]">
                  <span
                    className={
                      isTop ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"
                    }
                  >
                    {area.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        "tabular-nums " +
                        (isTop ? "font-semibold text-accent-700 dark:text-accent-400" : "text-slate-600 dark:text-slate-300")
                      }
                    >
                      {int.format(area.clicks)}
                    </span>
                    {isTop && (
                      <span className="rounded-md bg-accent-100 px-1.5 py-0.5 text-[10px] font-semibold text-accent-700 dark:bg-accent-500/15 dark:text-accent-400">
                        {t("barsTop")}
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-0.5 text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                  {t("barsMeta", { qty: int.format(area.qty), per100: dec.format(area.per100) })}
                </p>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={"rv-bar h-full rounded-full " + (isTop ? "bg-accent-600" : "bg-slate-300 dark:bg-slate-700")}
                    style={{ width: `${(area.clicks / max) * 100}%`, animationDelay: `${0.15 + i * 0.15}s` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div
        className="rv-rise rounded-2xl border border-accent-200 bg-accent-50/50 px-4 py-3.5 dark:border-accent-500/30 dark:bg-accent-500/10"
        style={{ animationDelay: "0.75s" }}
      >
        <p className="text-[10px] font-medium text-accent-700 dark:text-accent-400">{t("barsRecoTitle")}</p>
        <p className="mt-1 text-[14px] font-medium text-slate-900 dark:text-slate-100">
          {t("barsReco", { from: sum.worst.label, to: sum.best.label, qty: int.format(mock.recoQty) })}
        </p>
        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
          {t("barsRecoEstimate", { count: int.format(sum.recoGain) })}
        </p>
      </div>
    </div>
  );
}

export function MockCases({ mock }: { mock: MockData }) {
  const t = useTranslations("qrCampaigns.mock");
  // 모든 case 의 after 값 중 최댓값으로 normalize — bar 가 같은 scale 에서 비교됨.
  const max = Math.max(...mock.cases.map((c) => c.after));
  const { ref, seen } = useInView(0.3);
  return (
    <div
      ref={ref}
      data-reveal={seen ? "on" : "off"}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
        <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{t("casesTitle")}</p>
      </div>
      {mock.cases.map((c, i) => (
        <div key={c.biz} className="border-b border-slate-100 px-5 py-3.5 last:border-b-0 dark:border-slate-800">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-slate-900 dark:text-slate-100">{c.biz}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
              {c.area} · {c.action}
            </p>
          </div>
          <div className="mt-3 space-y-1.5">
            <CaseBar label={t("casesBefore")} value={c.before} pct={(c.before / max) * 100} accent={false} delay={0.1 + i * 0.15} />
            <CaseBar label={t("casesAfter")} value={c.after} pct={(c.after / max) * 100} accent delay={0.22 + i * 0.15} />
          </div>
        </div>
      ))}
      <div className="px-5 py-2.5">
        <p className="text-[10px] text-slate-500 dark:text-slate-400">{t("casesFooter")}</p>
      </div>
    </div>
  );
}

function CaseBar({
  label,
  value,
  pct,
  accent,
  delay,
}: {
  label: string;
  value: number;
  pct: number;
  accent: boolean;
  delay: number;
}) {
  return (
    <div className="grid grid-cols-[40px_1fr_auto] items-center gap-2">
      <span
        className={
          "text-[10px] " + (accent ? "font-medium text-accent-700 dark:text-accent-400" : "text-slate-500 dark:text-slate-400")
        }
      >
        {label}
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={"rv-bar h-full rounded-full " + (accent ? "bg-accent-600" : "bg-slate-300 dark:bg-slate-700")}
          style={{ width: `${pct}%`, animationDelay: `${delay}s` }}
        />
      </div>
      <span
        className={
          "text-[11px] tabular-nums " +
          (accent ? "font-semibold text-accent-700 dark:text-accent-400" : "text-slate-500 dark:text-slate-400")
        }
      >
        {value}
      </span>
    </div>
  );
}

export function MockTimeline() {
  const t = useTranslations("qrCampaigns.mock");
  const locale = useLocale();
  const day = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  const { ref, seen } = useInView(0.3);
  return (
    <div ref={ref} data-reveal={seen ? "on" : "off"} className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 text-[11px] dark:border-slate-800">
          <span className="tabular-nums text-slate-500 dark:text-slate-400">{day.format(CAMPAIGN_START)}</span>
          <div className="relative h-px flex-1 bg-slate-200 dark:bg-slate-800">
            <div className="rv-bar absolute inset-0 bg-accent-600" style={{ animationDelay: "0.1s" }} />
            <div
              className="rv-pop absolute right-0 top-1/2 -mt-1 h-2 w-2 rounded-full bg-accent-600"
              style={{ animationDelay: "0.8s" }}
            />
          </div>
          <span className="font-medium text-accent-700 dark:text-accent-400">
            {t("timelineExpired")} · <span className="tabular-nums">{day.format(CAMPAIGN_END)}</span>
          </span>
        </div>

        <div className="flex items-center justify-center gap-3 bg-slate-50 px-4 py-8 dark:bg-slate-800/40 sm:gap-4 sm:px-6">
          <div className="h-[170px] w-[92px] overflow-hidden rounded-lg border border-slate-300 opacity-60 dark:border-slate-700 sm:h-[200px] sm:w-[108px]">
            <PageScreen kind="before" />
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <div
            className="rv-rise h-[170px] w-[92px] overflow-hidden rounded-lg border border-accent-300 dark:border-accent-500/40 sm:h-[200px] sm:w-[108px]"
            style={{ animationDelay: "0.95s" }}
          >
            <PageScreen kind="after" nextLabel={t("timelineNext")} chipLabel={t("timelineChip")} />
          </div>
        </div>
      </div>
      <p className="px-1 text-[11px] text-slate-500 dark:text-slate-400">{t("timelineFoot")}</p>
    </div>
  );
}

function PageScreen({
  kind,
  nextLabel,
  chipLabel,
}: {
  kind: "before" | "after";
  nextLabel?: string;
  chipLabel?: string;
}) {
  const isAfter = kind === "after";
  return (
    <div
      className={
        "flex h-full flex-col gap-1.5 px-2.5 pb-3 pt-3 " +
        (isAfter ? "bg-accent-50 dark:bg-accent-500/10" : "bg-white dark:bg-slate-900")
      }
    >
      <div
        className={
          "h-12 w-full rounded-md " + (isAfter ? "bg-accent-200 dark:bg-accent-500/25" : "bg-slate-200 dark:bg-slate-700")
        }
      />
      <div className={"h-1.5 w-3/5 rounded-full " + (isAfter ? "bg-accent-600" : "bg-slate-500 dark:bg-slate-400")} />
      <div className="space-y-1">
        <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-1 w-5/6 rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-1 w-2/3 rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>
      {isAfter && nextLabel && chipLabel ? (
        <div className="mt-auto flex flex-col items-start gap-1">
          <span className="text-[10px] font-medium text-accent-700 dark:text-accent-400">{nextLabel}</span>
          <span className="rounded-md bg-accent-700 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {chipLabel}
          </span>
        </div>
      ) : (
        <div className="mt-auto h-5 w-full rounded-md bg-slate-800 dark:bg-slate-300" />
      )}
    </div>
  );
}
