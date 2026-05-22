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
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * Campaigns wedge — 캠페인 0개일 때 노출. 단순 "캠페인 만들기" CTA 가 아니라 "이 도구로 무엇이 가능한지" 부터 보여줘야 사용자가 batch / 배포자 /
 * 지역 같은 새 개념을 마주했을 때 "왜 이걸 입력하는지" 가 명확해진다.
 *
 * <p>한 줄 메시지: "오프라인 홍보를 온라인 광고처럼 개선하는 도구."
 */
export function CampaignOnboarding() {
  return (
    <section className="space-y-8">
      <header className="text-center">
        <p className="text-[12px] font-medium uppercase tracking-wider text-accent-700">
          Offline campaigns
        </p>
        <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[32px]">
          오프라인 홍보를 온라인 광고처럼 개선하는 도구
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-500">
          포스터·전단지·QR 을 여러 사람·지역·묶음으로 나눠 뿌리고, 어느 묶음이 성과가 좋았는지 측정합니다. 다음 배포는 그 데이터로 조정.
        </p>
      </header>

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <UseCaseCard
          icon={<Compass className="h-4 w-4" aria-hidden />}
          label="01"
          title="배포 묶음 최적화"
          body="A 지역 500장 → 80명, B 지역 500장 → 5명. 다음에는 A 를 늘리고 B 를 줄인다."
        />
        <UseCaseCard
          icon={<Users className="h-4 w-4" aria-hidden />}
          label="02"
          title="배포자 성과 비교"
          body="A 배포자 1000장 → 120, B 1000장 → 18. 정산/검증, '진짜 뿌렸나' 간접 확인."
        />
        <UseCaseCard
          icon={<Layers className="h-4 w-4" aria-hidden />}
          label="03"
          title="문구·디자인 A/B 테스트"
          body="'무료 상담' vs '첫 달 50% 할인' — 어느 문구가 더 클릭을 만드는지 같은 지역에 두 버전."
        />
        <UseCaseCard
          icon={<MapPin className="h-4 w-4" aria-hidden />}
          label="04"
          title="위치별 영업 전략"
          body="역 앞 반응 ↑, 주택가 반응 ↓ — 다음 포스터·현수막 위치 선정."
        />
        <UseCaseCard
          icon={<Recycle className="h-4 w-4" aria-hidden />}
          label="05"
          title="종료 후 QR 재활용"
          body="이벤트 끝났는데 포스터는 그대로? 만료 시 후기/대기자/다음 프로모션 페이지로 자동 전환."
        />
        <UseCaseCard
          icon={<Target className="h-4 w-4" aria-hidden />}
          label="06"
          title="전환까지 추적"
          body="단순 클릭이 아니라 문의·예약·쿠폰 다운·구매. 어느 묶음이 진짜 고객을 만들었는지."
        />
      </ol>

      <FlowStrip />

      <div className="flex flex-col items-center gap-2 pt-2">
        <Link href="/campaigns/new">
          <Button variant="accent" className="h-11 rounded-xl px-6 text-[13px] font-medium">
            첫 캠페인 만들기
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </Link>
        <p className="text-[12px] text-slate-500">
          처음 만들 때는 캠페인 이름과 종료 시점만 정하면 됩니다.
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
  const steps = ["배포", "묶음별 측정", "다음 배포 조정", "종료 후 전환"];
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
        반복 가능한 루프
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
