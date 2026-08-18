import { QrCode } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * 온보딩 패널의 미니어처 장면 — 글 대신 제품이 움직이는 걸 보여준다(이벤트 소개의
 * 루프 데모와 같은 계열). 엔트런스는 한 번, 핑·펄스만 은은히 계속. 키프레임은
 * globals.css 의 obs-* 블록(reduced-motion 은 완성 정지 화면).
 */

/** 대시보드 온보딩 — 긴 URL 이 kurl 필로 줄고, 미니 통계 카드에 클릭이 흘러든다. */
export function DashboardOnboardingScene() {
  const t = useTranslations("dashboard.onboarding.scene");
  return (
    <div
      aria-hidden
      className="relative h-[190px] overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 dark:border-slate-700/70 dark:bg-slate-900/50"
    >
      <div
        className="obs-rise absolute left-4 top-4 max-w-[75%] truncate rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        style={{ animationDelay: "0.1s" }}
      >
        https://shop.example.com/summer-sale?utm_source=instagram
      </div>

      <div
        className="obs-pop absolute left-4 top-[46px] flex items-center gap-1.5"
        style={{ animationDelay: "0.55s" }}
      >
        <span aria-hidden className="text-[12px] text-slate-300 dark:text-slate-600">
          ↳
        </span>
        <span className="inline-flex items-center rounded-full border border-accent-300/60 bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-accent-700 shadow-sm dark:border-accent-700/60 dark:bg-slate-950 dark:text-accent-400">
          kurl.me/sp2ng
        </span>
      </div>

      <div
        className="obs-pop absolute inset-x-4 bottom-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        style={{ animationDelay: "1.05s" }}
      >
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t("weekClicks")}
            </p>
            <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums leading-none text-slate-900 dark:text-slate-100">
              1,540
            </p>
          </div>
          <svg viewBox="0 0 100 26" className="h-[26px] w-[110px] shrink-0 text-accent-600 dark:text-accent-400">
            <path
              pathLength="100"
              className="obs-draw"
              style={{ animationDelay: "1.4s" }}
              d="M0 22 L14 18 L28 20 L42 11 L56 14 L70 6 L84 9 L100 2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {/* 클릭 핑 — 카드 밖에서 숫자 쪽으로 흘러들어와 흡수 */}
        <span
          className="obs-ping absolute right-6 top-0 h-1.5 w-1.5 rounded-full bg-accent-500"
          style={{ "--tx": "-120px", "--ty": "26px", animationDelay: "1.8s" } as React.CSSProperties}
        />
        <span
          className="obs-ping absolute right-16 -top-2 h-1.5 w-1.5 rounded-full bg-accent-500"
          style={{ "--tx": "-70px", "--ty": "30px", animationDelay: "2.9s" } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

/** QR 캠페인 온보딩 — 포스터의 QR 이 스캔 펄스를 내고, 곳별 카운트가 자란다. */
export function CampaignOnboardingScene() {
  const t = useTranslations("campaignsApp.onboarding.scene");
  return (
    <div
      aria-hidden
      className="relative h-[190px] overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 dark:border-slate-700/70 dark:bg-slate-900/50"
    >
      <div
        className="obs-rise absolute left-5 top-1/2 w-[88px] -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="mx-auto h-1.5 w-12 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="mx-auto mt-1 h-1.5 w-8 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="mt-2 h-9 rounded-md bg-accent-50 dark:bg-accent-500/10" />
        <div className="relative mt-2 flex justify-center">
          <span className="obs-pulse absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent-500/60" />
          <span
            className="obs-pulse absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent-500/60"
            style={{ animationDelay: "0.9s" }}
          />
          <QrCode className="relative h-7 w-7 text-slate-900 dark:text-slate-100" />
        </div>
      </div>

      <div className="absolute left-[128px] right-4 top-1/2 -translate-y-1/2">
        <p className="obs-rise text-[9px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500" style={{ animationDelay: "0.5s" }}>
          {t("scans")}
        </p>
        <p
          className="obs-pop mt-0.5 font-mono text-2xl font-semibold tabular-nums leading-none text-slate-900 dark:text-slate-100"
          style={{ animationDelay: "0.7s" }}
        >
          21
        </p>
        <div className="mt-3 space-y-2.5">
          <SceneBar label={t("place1")} count={12} width="82%" delay="1.1s" />
          <SceneBar label={t("place2")} count={9} width="56%" delay="1.4s" />
        </div>
      </div>
    </div>
  );
}

function SceneBar({
  label,
  count,
  width,
  delay,
}: {
  label: string;
  count: number;
  width: string;
  delay: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="font-mono text-[10px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
          {count}
        </span>
      </div>
      <div
        className="obs-bar mt-1 h-1 rounded-full bg-accent-600 dark:bg-accent-500"
        style={{ width, animationDelay: delay }}
      />
    </div>
  );
}
