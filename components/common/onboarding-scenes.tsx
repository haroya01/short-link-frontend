import { QrCode } from "lucide-react";
import { useTranslations } from "next-intl";
import { SceneBar, SceneExample } from "@/components/common/onboarding-scene-parts";

/**
 * 온보딩 패널의 미니어처 장면 — 글 대신 제품이 움직이는 걸 보여준다. 엔트런스는 한 번뿐이고
 * 끝나면 정지 화면. 키프레임은 globals.css 의 obs-* 블록(reduced-motion 은 완성 정지 화면).
 */


/** QR 캠페인 온보딩 — 포스터의 QR 과 곳별 스캔 수. */
export function CampaignOnboardingScene() {
  const t = useTranslations("campaignsApp.onboarding.scene");
  return (
    <div
      aria-hidden
      className="relative h-[190px] overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 dark:border-slate-700/70 dark:bg-slate-900/50"
    >
      <SceneExample label={t("example")} />
      {/* 포지셔닝(-translate-y-1/2)과 obs-rise 를 분리 — 키프레임의 transform:none 이
          유틸리티 translate 를 밟아 포스터가 스테이지 아래로 넘쳐 잘려 보였다. */}
      <div className="absolute left-5 top-1/2 w-[88px] -translate-y-1/2">
        <div
          className="obs-rise rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="mx-auto h-1.5 w-12 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mx-auto mt-1 h-1.5 w-8 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mt-2 h-9 rounded-md bg-accent-50 dark:bg-accent-500/10" />
          <div className="mt-2 flex justify-center">
            <QrCode className="h-7 w-7 text-slate-900 dark:text-slate-100" />
          </div>
        </div>
      </div>

      <div className="absolute left-[128px] right-4 top-1/2 -translate-y-1/2">
        <p className="obs-rise text-[10px] font-medium text-slate-500 dark:text-slate-400" style={{ animationDelay: "0.5s" }}>
          {t("scans")}
        </p>
        <p
          className="obs-pop mt-0.5 text-2xl font-semibold tabular-nums leading-none text-slate-900 dark:text-slate-100"
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
