"use client";

import { useEffect, useState } from "react";
import { ArrowDown, Check, Plus, QrCode } from "lucide-react";
import { useTranslations } from "next-intl";
import { EASE, type MockData } from "../_lib/mock-data";

export function CountUp({
  to,
  active,
  durationMs = 1400,
}: {
  to: number;
  active: boolean;
  durationMs?: number;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) {
      setN(0);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, to, durationMs]);
  return <>{n.toLocaleString()}</>;
}

export function MockKpi({ mock, active }: { mock: MockData; active: boolean }) {
  const t = useTranslations("qrCampaigns.mock");
  return (
    <div
      className="space-y-2 transition-all duration-700"
      style={{
        transitionTimingFunction: EASE,
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(12px)",
      }}
    >
      {/* Before kurl — 4 cells 중 3개가 "?" */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
        <div className="mb-2.5 inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-700">
          {t("kpiBeforeKurl")}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
            {mock.campaignName}
          </p>
          <span className="flex-shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
            {t("kpiStatus")}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <KpiCellMini label={t("kpiDistributed")} value={mock.distributedValue} />
          <KpiCellMini label={t("kpiClicks")} value="?" muted />
          <KpiCellMini label={t("kpiPer100")} value="?" muted />
          <KpiCellMini label={t("kpiTopArea")} value="?" muted />
        </div>
      </div>

      {/* Arrow between cards — active 진입 후 살짝 늦게 등장 */}
      <div
        className="flex justify-center transition-opacity duration-500"
        style={{
          transitionDelay: active ? "600ms" : "0ms",
          opacity: active ? 1 : 0,
        }}
      >
        <ArrowDown className="h-4 w-4 text-accent-500" aria-hidden />
      </div>

      {/* After kurl — 같은 캠페인의 *kurl 도입 후* KPI. accent 톤. */}
      <div
        className="rounded-2xl border border-accent-200 bg-accent-50/30 dark:bg-accent-500/10 p-4 shadow-[0_4px_24px_rgba(5,150,105,0.08)] transition-all duration-500"
        style={{
          transitionTimingFunction: EASE,
          transitionDelay: active ? "800ms" : "0ms",
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(12px)",
        }}
      >
        <div className="mb-2.5 inline-flex items-center rounded-md bg-accent-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-700 dark:text-accent-400">
          {t("kpiAfterKurl")}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
            {mock.campaignName}
          </p>
          <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-white dark:bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-accent-700 dark:text-accent-400 shadow-sm">
            <span
              className={
                "h-1.5 w-1.5 rounded-full bg-accent-500 " +
                (active ? "animate-pulse" : "")
              }
            />
            Live
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <KpiCellMini label={t("kpiDistributed")} value={mock.distributedValue} />
          <KpiCellMini
            label={t("kpiClicks")}
            value={active ? <CountUp to={mock.afterClicks} active={active} /> : 0}
            accent
          />
          <KpiCellMini label={t("kpiPer100")} value={mock.afterPer100} accent />
          <KpiCellMini label={t("kpiTopArea")} value={mock.afterTopArea} accent />
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
    <div
      className={
        "rounded-lg border px-2 py-1.5 " +
        (muted
          ? "border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60"
          : accent
            ? "border-accent-200 bg-white dark:bg-slate-900"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900")
      }
    >
      <p className="truncate text-[9px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={
          "mt-0.5 text-[14px] font-semibold tabular-nums leading-tight tracking-headline " +
          (muted
            ? "animate-pulse text-slate-300"
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

export function MockBatch({ mock, active }: { mock: MockData; active: boolean }) {
  const t = useTranslations("qrCampaigns.mock");
  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-all duration-700"
      style={{
        transitionTimingFunction: EASE,
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
        <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{t("batchTitle")}</p>
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          <Plus className="h-3 w-3" aria-hidden />
          {t("batchAdd")}
        </span>
      </div>
      <div className="grid grid-cols-[2fr_1fr_1.2fr_0.8fr_0.8fr] gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 px-5 py-2.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <span>{t("batchColName")}</span>
        <span>{t("batchColArea")}</span>
        <span>{t("batchColDist")}</span>
        <span className="text-right">{t("batchColQty")}</span>
        <span className="text-right">{t("batchColStatus")}</span>
      </div>
      {mock.rows.map((row, i) => (
        <div
          key={row.name}
          className="grid grid-cols-[2fr_1fr_1.2fr_0.8fr_0.8fr] items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-5 py-3 text-[12px] transition-all duration-500 last:border-b-0"
          style={{
            transitionTimingFunction: EASE,
            transitionDelay: active ? `${200 + i * 110}ms` : "0ms",
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(-10px)",
          }}
        >
          <span className="truncate font-medium text-slate-900 dark:text-slate-100">{row.name}</span>
          <span className="truncate text-slate-600 dark:text-slate-300">{row.area}</span>
          <span className="truncate text-slate-600 dark:text-slate-300">{row.dist}</span>
          <span className="text-right tabular-nums text-slate-700 dark:text-slate-300">
            {row.qty.toLocaleString()}
            {t("batchUnit")}
          </span>
          <span className="flex items-center justify-end gap-1 text-[11px] text-accent-700 dark:text-accent-400">
            <Check className="h-3 w-3" aria-hidden />
            <span className="hidden sm:inline">{t("batchDone")}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function MockPoster({ active }: { mock: MockData; active: boolean }) {
  const t = useTranslations("qrCampaigns.mock");
  const [qrUrl, setQrUrl] = useState<string | null>(null);

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
    // 모바일에서 다른 mock 보다 세로가 크다는 사용자 피드백 → MockPoster 만 max-width 좁게 cap.
    // 다른 mock 은 부모의 max-w-sm 그대로.
    <div
      className="mx-auto max-w-[260px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-all duration-700 sm:max-w-[300px] lg:max-w-none"
      style={{
        transitionTimingFunction: EASE,
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(12px)",
      }}
    >
      {/* PDF 페이지 시뮬레이션 + 박스 이동 + QR 등장 시퀀스. 모바일은 4/5, lg+ 만 A4 비율. */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 lg:aspect-[1/1.414]">
        {/* 회색 placeholder content — 디자이너가 만든 포스터 디자인의 윤곽 흉내 */}
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

        {/* QR 박스 — active 시 화면 중앙 → 우하단으로 이동하면서 크기 축소, QR fade-in */}
        <div
          className="absolute rounded-md border-2 border-accent-600 bg-white dark:bg-slate-900 transition-all duration-[1000ms]"
          style={{
            transitionTimingFunction: EASE,
            left: active ? "60%" : "26%",
            top: active ? "60%" : "26%",
            width: active ? "30%" : "48%",
            height: active ? "30%" : "48%",
            transitionDelay: active ? "700ms" : "0ms",
            opacity: active ? 1 : 0,
            boxShadow: "0 4px 16px rgba(5,150,105,0.18)",
          }}
        >
          {qrUrl ? (
            // 마케팅 mock 의 작은 QR placeholder — next/image 의 최적화는 data URL 에 의미 없음.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrUrl}
              alt=""
              draggable={false}
              className="block h-full w-full transition-opacity duration-700"
              style={{
                transitionTimingFunction: EASE,
                transitionDelay: active ? "1900ms" : "0ms",
                opacity: active ? 1 : 0,
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-[10px] font-medium uppercase tracking-wider text-accent-700 dark:text-accent-400">
              {t("posterBoxLabel")}
            </div>
          )}
          {/* resize handle 흉내 */}
          <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full border-2 border-accent-600 bg-white dark:bg-slate-900" />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-5 py-3">
        <p className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">{t("posterTitle")}</p>
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 dark:bg-accent-500/10 px-2.5 py-1 text-[11px] font-medium text-accent-700 dark:text-accent-400 transition-all duration-500"
          style={{
            transitionTimingFunction: EASE,
            transitionDelay: active ? "2400ms" : "0ms",
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(6px)",
          }}
        >
          <QrCode className="h-3 w-3" aria-hidden />
          {t("posterPerBatch")}
        </span>
      </div>
    </div>
  );
}

export function MockBars({ mock, active }: { mock: MockData; active: boolean }) {
  const t = useTranslations("qrCampaigns.mock");
  const max = Math.max(...mock.bars.map((b) => b.value));
  return (
    <div
      className="space-y-3 transition-all duration-700"
      style={{
        transitionTimingFunction: EASE,
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{t("barsTitle")}</p>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <ArrowDown className="h-3 w-3" aria-hidden />
            {t("barsSort")}
          </span>
        </div>
        <div className="space-y-3">
          {mock.bars.map((b, i) => {
            const pct = (b.value / max) * 100;
            const isTop = i === 0;
            const delay = 200 + i * 180;
            return (
              <div
                key={b.label}
                className="transition-opacity duration-500"
                style={{
                  transitionDelay: active ? `${delay}ms` : "0ms",
                  opacity: active ? 1 : 0,
                }}
              >
                <div className="flex items-center justify-between text-[12px]">
                  <span
                    className={
                      isTop ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"
                    }
                  >
                    {b.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        "tabular-nums " +
                        (isTop ? "font-semibold text-accent-700 dark:text-accent-400" : "text-slate-600 dark:text-slate-300")
                      }
                    >
                      {active ? <CountUp to={b.value} active={active} /> : 0}
                    </span>
                    {isTop && (
                      <span
                        className="rounded-md bg-accent-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent-700 dark:text-accent-400 transition-all duration-500"
                        style={{
                          transitionTimingFunction: EASE,
                          transitionDelay: active ? `${delay + 900}ms` : "0ms",
                          opacity: active ? 1 : 0,
                          transform: active ? "scale(1)" : "scale(0.6)",
                        }}
                      >
                        {t("barsTop")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={
                      "h-full rounded-full transition-[width] duration-[1200ms] " +
                      (isTop ? "bg-accent-600" : "bg-slate-300 dark:bg-slate-700")
                    }
                    style={{
                      transitionTimingFunction: EASE,
                      transitionDelay: active ? `${delay + 150}ms` : "0ms",
                      width: active ? `${pct}%` : "0%",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div
        className="rounded-2xl border border-accent-200 bg-accent-50/50 dark:bg-accent-500/10 px-4 py-3.5 transition-all duration-500"
        style={{
          transitionTimingFunction: EASE,
          transitionDelay: active ? "1500ms" : "0ms",
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(12px)",
        }}
      >
        <p className="text-[10px] font-medium uppercase tracking-wider text-accent-700 dark:text-accent-400">
          {t("barsRecoTitle")}
        </p>
        <p className="mt-1 text-[14px] font-medium text-slate-900 dark:text-slate-100">{mock.reco}</p>
        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{t("barsRecoEstimate")}</p>
      </div>
    </div>
  );
}

export function MockCases({ mock, active }: { mock: MockData; active: boolean }) {
  const t = useTranslations("qrCampaigns.mock");
  // 모든 case 의 after 값 중 최댓값으로 normalize — bar 가 같은 scale 에서 비교됨.
  const max = Math.max(...mock.cases.map((c) => c.after));
  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-all duration-700"
      style={{
        transitionTimingFunction: EASE,
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
        <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{t("casesTitle")}</p>
      </div>
      {mock.cases.map((c, i) => {
        const beforePct = (c.before / max) * 100;
        const afterPct = (c.after / max) * 100;
        const rowDelay = 200 + i * 140;
        return (
          <div
            key={c.biz}
            className="border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 transition-all duration-500 last:border-b-0"
            style={{
              transitionTimingFunction: EASE,
              transitionDelay: active ? `${rowDelay}ms` : "0ms",
              opacity: active ? 1 : 0,
              transform: active ? "translateY(0)" : "translateY(-10px)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-slate-900 dark:text-slate-100">{c.biz}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
                  {c.area} · {c.action}
                </p>
              </div>
              <span className="flex-shrink-0 rounded-md bg-accent-50 dark:bg-accent-500/10 px-2 py-1 text-[14px] font-semibold tabular-nums leading-none tracking-headline text-accent-700 dark:text-accent-400">
                {c.multiplier}
              </span>
            </div>

            <div className="mt-3 space-y-1.5">
              <CaseBar
                label={t("casesBefore")}
                value={c.before}
                pct={beforePct}
                active={active}
                delay={rowDelay + 300}
                accent={false}
              />
              <CaseBar
                label={t("casesAfter")}
                value={c.after}
                pct={afterPct}
                active={active}
                delay={rowDelay + 500}
                accent
              />
            </div>
          </div>
        );
      })}
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
  active,
  delay,
  accent,
}: {
  label: string;
  value: number;
  pct: number;
  active: boolean;
  delay: number;
  accent: boolean;
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
          className={
            "h-full rounded-full transition-[width] " +
            (accent ? "bg-accent-600 duration-[1000ms]" : "bg-slate-300 dark:bg-slate-700 duration-[800ms]")
          }
          style={{
            transitionTimingFunction: EASE,
            transitionDelay: active ? `${delay}ms` : "0ms",
            width: active ? `${pct}%` : "0%",
          }}
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

export function MockTimeline({ mock, active }: { mock: MockData; active: boolean }) {
  const t = useTranslations("qrCampaigns.mock");
  return (
    <div
      className="space-y-3 transition-all duration-700"
      style={{
        transitionTimingFunction: EASE,
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
        {/* timeline mini header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-3 text-[11px]">
          <span className="tabular-nums text-slate-500 dark:text-slate-400">{mock.startDate}</span>
          <div className="relative h-px flex-1 bg-slate-200 dark:bg-slate-800">
            <div
              className="absolute left-0 top-0 h-full bg-accent-600 transition-[width] duration-[1200ms]"
              style={{
                transitionTimingFunction: EASE,
                transitionDelay: active ? "200ms" : "0ms",
                width: active ? "100%" : "0%",
              }}
            />
            <div
              className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-accent-600 transition-transform duration-300"
              style={{
                transitionDelay: active ? "1400ms" : "0ms",
                transform: active ? "translateY(-50%) scale(1.4)" : "translateY(-50%) scale(1)",
              }}
            />
          </div>
          <span
            className="font-medium text-accent-700 dark:text-accent-400 transition-opacity duration-500"
            style={{
              transitionDelay: active ? "1500ms" : "0ms",
              opacity: active ? 1 : 0.4,
            }}
          >
            {t("timelineExpired")}
          </span>
        </div>

        {/* iPhone mockup — 캠페인 진행 중 화면 → 만료 후 화면 자동 슬라이드 */}
        <div className="relative grid place-items-center bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 px-6 py-8">
          {/* date pill 표시 (옆) */}
          <div
            className="absolute left-5 top-5 rounded-md bg-white/80 dark:bg-slate-900/80 px-2 py-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 shadow-sm transition-opacity duration-500"
            style={{ transitionDelay: active ? "400ms" : "0ms", opacity: active ? 1 : 0 }}
          >
            {mock.endDate}
          </div>
          <div
            className="absolute right-5 top-5 rounded-md bg-accent-50 dark:bg-accent-500/10 px-2 py-1 text-[10px] font-medium text-accent-700 dark:text-accent-400 shadow-sm transition-all duration-500"
            style={{
              transitionTimingFunction: EASE,
              transitionDelay: active ? "1700ms" : "0ms",
              opacity: active ? 1 : 0,
              transform: active ? "translateY(0)" : "translateY(-6px)",
            }}
          >
            {t("timelineExpired")} →
          </div>

          {/* phone frame */}
          <div className="relative h-[280px] w-[150px] overflow-hidden rounded-[28px] border-[5px] border-slate-900 bg-white dark:bg-slate-900 shadow-[0_14px_32px_rgba(15,23,42,0.22)]">
            {/* notch */}
            <div className="absolute left-1/2 top-1.5 z-20 h-2 w-10 -translate-x-1/2 rounded-full bg-slate-900" />

            {/* screen A — 캠페인 진행 중 (rose) */}
            <div
              className="absolute inset-0 transition-transform duration-700"
              style={{
                transitionTimingFunction: EASE,
                transitionDelay: active ? "1700ms" : "0ms",
                transform: active ? "translateX(-100%)" : "translateX(0%)",
              }}
            >
              <PhoneScreen kind="before" />
            </div>

            {/* screen B — 만료 후 (accent) */}
            <div
              className="absolute inset-0 transition-transform duration-700"
              style={{
                transitionTimingFunction: EASE,
                transitionDelay: active ? "1700ms" : "0ms",
                transform: active ? "translateX(0%)" : "translateX(100%)",
              }}
            >
              <PhoneScreen
                kind="after"
                nextLabel={t("timelineNext")}
                chipLabel={t("timelineChip")}
              />
            </div>
          </div>
        </div>
      </div>
      <p
        className="px-1 text-[11px] text-slate-500 dark:text-slate-400 transition-opacity duration-500"
        style={{
          transitionDelay: active ? "2600ms" : "0ms",
          opacity: active ? 1 : 0,
        }}
      >
        {t("timelineFoot")}
      </p>
    </div>
  );
}

function PhoneScreen({
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
        "flex h-full flex-col gap-1.5 px-2.5 pb-3 pt-9 " +
        (isAfter ? "bg-accent-50 dark:bg-accent-500/10" : "bg-rose-50")
      }
    >
      <div
        className={
          "h-12 w-full rounded-md " + (isAfter ? "bg-accent-200" : "bg-rose-200")
        }
      />
      <div
        className={
          "h-1.5 w-3/5 rounded-full " + (isAfter ? "bg-accent-500" : "bg-rose-500")
        }
      />
      <div className="space-y-1">
        <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-1 w-5/6 rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-1 w-2/3 rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>
      {isAfter && nextLabel && chipLabel ? (
        <div className="mt-auto flex flex-col items-start gap-1">
          <span className="text-[7px] font-medium uppercase tracking-wider text-accent-700 dark:text-accent-400">
            {nextLabel}
          </span>
          <span className="rounded-md bg-accent-700 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {chipLabel}
          </span>
        </div>
      ) : (
        <div className="mt-auto h-5 w-full rounded-md bg-rose-600" />
      )}
    </div>
  );
}
