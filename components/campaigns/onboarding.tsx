"use client";

import {
  ArrowRight,
  Compass,
  Layers,
  MapPin,
  Recycle,
  Target,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

const USE_CASES = [
  { key: "distribution", icon: Compass, label: "01" },
  { key: "distributor", icon: Users, label: "02" },
  { key: "copy", icon: Layers, label: "03" },
  { key: "location", icon: MapPin, label: "04" },
  { key: "reuse", icon: Recycle, label: "05" },
  { key: "conversion", icon: Target, label: "06" },
] as const;

/**
 * Campaigns wedge — QR 캠페인 0개일 때 노출. 단순 "QR 캠페인 만들기" CTA 가 아니라 "이 도구로 무엇이 가능한지" 부터 보여줘야 사용자가 batch / 배포자 /
 * 지역 같은 새 개념을 마주했을 때 "왜 이걸 입력하는지" 가 명확해진다.
 *
 * <p>한 줄 메시지: "오프라인 홍보를 온라인 광고처럼 개선하는 도구."
 */
export function CampaignOnboarding() {
  const t = useTranslations("campaignsApp.onboarding");
  return (
    <section className="space-y-8">
      <header className="text-center">
        <p className="text-[12px] font-medium uppercase tracking-wider text-accent-700">
          {t("eyebrow")}
        </p>
        <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[32px]">
          {t("title")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-500">
          {t("body")}
        </p>
      </header>

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {USE_CASES.map(({ key, icon: Icon, label }) => (
          <UseCaseCard
            key={key}
            icon={<Icon className="h-4 w-4" aria-hidden />}
            label={label}
            title={t(`useCases.${key}.title`)}
            body={t(`useCases.${key}.body`)}
          />
        ))}
      </ol>

      <FlowStrip />

      <div className="flex flex-col items-center gap-2 pt-2">
        <Link href="/links/campaigns/new">
          <Button variant="accent" className="h-11 rounded-xl px-6 text-[13px] font-medium">
            {t("createCta")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </Link>
        <p className="text-[12px] text-slate-500">
          {t("createHint")}
        </p>
      </div>
    </section>
  );
}

function UseCaseCard({
  icon,
  label,
  title,
  body,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-shadow hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-50 text-accent-700">
          {icon}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-medium text-slate-900">{title}</h3>
      <p className="mt-1.5 text-[12px] leading-snug text-slate-500">{body}</p>
    </li>
  );
}

/** 흐름 strip — "배포 → 측정 → 조정 → 종료 후 전환". 모바일에서는 세로, 데스크탑 가로. */
function FlowStrip() {
  const t = useTranslations("campaignsApp.onboarding");
  const steps = t.raw("flowSteps") as string[];
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {t("flowLabel")}
      </p>
      <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-1.5">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-1.5">
            <span className="flex-1 rounded-lg bg-white px-3 py-2 text-center text-[12px] font-medium text-slate-700 sm:flex-none sm:px-3">
              {step}
            </span>
            {i < steps.length - 1 && (
              <ArrowRight
                className="hidden h-3.5 w-3.5 text-slate-400 sm:block"
                aria-hidden
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
