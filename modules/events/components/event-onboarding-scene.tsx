import { useTranslations } from "next-intl";
import { SceneBar, SceneExample } from "@/components/common/onboarding-scene-parts";

/** 모집 온보딩 — 모집 페이지 한 장과 채널별 신청 수. */
export function EventOnboardingScene() {
  const t = useTranslations("events.intro.demo");
  return (
    <div
      aria-hidden
      className="relative h-[190px] overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 dark:border-slate-700/70 dark:bg-slate-900/50"
    >
      <SceneExample label={t("example")} />
      <div className="absolute left-5 top-1/2 w-[104px] -translate-y-1/2">
        <div
          className="obs-rise rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900"
          style={{ animationDelay: "0.1s" }}
        >
          <p className="truncate text-[11px] font-semibold text-slate-900 dark:text-slate-100">{t("eventTitle")}</p>
          <p className="mt-1 truncate text-[10px] text-slate-500 dark:text-slate-400">{t("eventDate")}</p>
          <div className="mt-2 rounded-md bg-accent-700 py-1 text-center text-[10px] font-semibold text-white dark:bg-accent-500 dark:text-slate-950">
            {t("registerButton")}
          </div>
        </div>
      </div>

      <div className="absolute left-[144px] right-4 top-1/2 -translate-y-1/2">
        <p className="obs-rise text-[10px] font-medium text-slate-500 dark:text-slate-400" style={{ animationDelay: "0.5s" }}>
          {t("byChannel")}
        </p>
        <p
          className="obs-pop mt-0.5 text-2xl font-semibold tabular-nums leading-none text-slate-900 dark:text-slate-100"
          style={{ animationDelay: "0.7s" }}
        >
          7
        </p>
        <div className="mt-3 space-y-2">
          <SceneBar label={t("channels.groupChat")} count={4} width="82%" delay="1.1s" />
          <SceneBar label={t("channels.instagram")} count={2} width="41%" delay="1.3s" />
          <SceneBar label={t("channels.qrPoster")} count={1} width="21%" delay="1.5s" />
        </div>
      </div>
    </div>
  );
}
