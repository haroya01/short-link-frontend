"use client";

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Compass,
  Download,
  FileText,
  Layers,
  MapPin,
  PackageOpen,
  Printer,
  QrCode,
  Recycle,
  Target,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * QR 캠페인 marketing landing — anonymous + 로그인 사용자 모두 접근 가능. 일반 단축 URL 과는 다른 의도/도메인이라는 걸 진입 시점에 분리.
 * <p>지금은 같은 host 안의 별도 라우트로만 분리. 사용자 검증 후 print.kurl.me 또는 campaigns.kurl.me 로 promote 가능.
 */
export default function QrCampaignsLandingPage() {
  const { authenticated } = useAuth();
  const ctaHref = authenticated ? "/campaigns/new" : "/login";

  return (
    <div className="bg-white">
      <Hero ctaHref={ctaHref} />
      <UseCases />
      <Flow />
      <Personas />
      <FinalCta ctaHref={ctaHref} authenticated={authenticated} />
    </div>
  );
}

function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="bg-gradient-to-b from-accent-50/60 via-white to-white">
      <div className="container max-w-5xl py-16 sm:py-24">
        <p className="text-[11px] font-medium uppercase tracking-wider text-accent-700">
          Offline QR campaigns
        </p>
        <h1 className="mt-3 text-[32px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[44px]">
          오프라인 QR 배포를
          <br />
          <span className="text-accent-700">측정</span>하세요
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-[17px]">
          전단지·포스터·행사 안내물마다 QR 을 나누고, 어느 배포 묶음이 실제 반응을 만들었는지
          확인합니다. 다음 배포는 그 데이터로 조정.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={ctaHref}>
            <Button variant="accent" className="h-11 rounded-xl px-6 text-[13px] font-medium">
              QR 캠페인 시작하기
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
          <span className="text-[12px] text-slate-500">
            일반 단축 URL 과는 다른 모드 — 오프라인 인쇄물 전용.
          </span>
        </div>
      </div>
    </section>
  );
}

const USE_CASES = [
  {
    icon: <Compass className="h-4 w-4" aria-hidden />,
    label: "01",
    title: "배포 묶음 최적화",
    body: "A 지역 500장 → 80명, B 지역 500장 → 5명. 다음에는 A 를 늘리고 B 를 줄인다.",
  },
  {
    icon: <Users className="h-4 w-4" aria-hidden />,
    label: "02",
    title: "배포자 성과 비교",
    body: "A 배포자 1000장 → 120, B 1000장 → 18. 정산/검증, '진짜 뿌렸나' 간접 확인.",
  },
  {
    icon: <Layers className="h-4 w-4" aria-hidden />,
    label: "03",
    title: "문구·디자인 A/B 테스트",
    body: "'무료 상담' vs '첫 달 50% 할인' — 어느 문구가 더 클릭을 만드는지 같은 지역에 두 버전.",
  },
  {
    icon: <MapPin className="h-4 w-4" aria-hidden />,
    label: "04",
    title: "위치별 영업 전략",
    body: "역 앞 반응 ↑, 주택가 반응 ↓ — 다음 포스터·현수막 위치 선정.",
  },
  {
    icon: <Recycle className="h-4 w-4" aria-hidden />,
    label: "05",
    title: "종료 후 QR 재활용",
    body: "이벤트 끝났는데 포스터는 그대로? 만료 시 후기/대기자/다음 프로모션 페이지로 자동 전환.",
  },
  {
    icon: <Target className="h-4 w-4" aria-hidden />,
    label: "06",
    title: "전환까지 추적",
    body: "단순 클릭이 아니라 문의·예약·쿠폰 다운·구매. 어느 묶음이 진짜 고객을 만들었는지.",
  },
];

function UseCases() {
  return (
    <section className="container max-w-5xl py-16 sm:py-20">
      <div className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Why this exists
        </p>
        <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[28px]">
          오프라인 홍보를 온라인 광고처럼
        </h2>
      </div>
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {USE_CASES.map((u) => (
          <li
            key={u.label}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-shadow hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
          >
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-50 text-accent-700">
                {u.icon}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {u.label}
              </span>
            </div>
            <h3 className="mt-3 text-sm font-medium text-slate-900">{u.title}</h3>
            <p className="mt-1.5 text-[12px] leading-snug text-slate-500">{u.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Flow() {
  return (
    <section className="bg-slate-50/60">
      <div className="container max-w-5xl py-16 sm:py-20">
        <div className="mb-8">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            How it works
          </p>
          <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[28px]">
            4 단계로 끝
          </h2>
        </div>
        <ol className="space-y-3">
          <FlowStep
            num="01"
            title="캠페인 만들기"
            body="이름 · 기간 · 종료 후 동작 (그대로 유지 / 만료 / 다른 페이지로 전환)."
          >
            <MockCampaignForm />
          </FlowStep>
          <FlowStep
            num="02"
            title="배포 묶음 추가"
            body="배포자·지역·수량별로 묶음. 한 줄씩 폼으로 또는 스프레드시트에서 붙여넣기."
          >
            <MockBatchTable />
          </FlowStep>
          <FlowStep
            num="03"
            title="인쇄 자산 받기"
            body="QR ZIP / CSV / A4 시트 / 포스터 PDF 합본 — Canva·인쇄소에 그대로 넘김."
          >
            <MockAssets />
          </FlowStep>
          <FlowStep
            num="04"
            title="배포 → 측정 → 다음 배포 조정"
            body="배포자별 / 지역별 100장당 클릭률. 어느 묶음이 진짜 효율적이었는지."
          >
            <MockStats />
          </FlowStep>
        </ol>
      </div>
    </section>
  );
}

function FlowStep({
  num,
  title,
  body,
  children,
}: {
  num: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:grid-cols-[260px_1fr] sm:px-5 sm:py-5">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-accent-700">{num}</p>
        <h3 className="mt-2 text-sm font-medium text-slate-900">{title}</h3>
        <p className="mt-1.5 text-[12px] leading-snug text-slate-500">{body}</p>
      </div>
      <div>{children}</div>
    </li>
  );
}

function MockCampaignForm() {
  return (
    <div className="space-y-2 rounded-xl bg-slate-50 px-3 py-3">
      <MockField label="이름" value="2026 봄 학교 축제" />
      <div className="grid grid-cols-2 gap-2">
        <MockField label="시작" value="2026-05-25" />
        <MockField label="종료" value="2026-05-27" />
      </div>
      <MockField label="종료 후" value="다른 페이지로 자동 전환" valueAccent />
    </div>
  );
}

function MockBatchTable() {
  const rows = [
    { name: "정문 포스터", dist: "동아리부", area: "정문", qty: 50 },
    { name: "학생회관", dist: "총학생회", area: "1층 게시판", qty: 100 },
    { name: "기숙사 게시판", dist: "기숙사 조교", area: "각 동 입구", qty: 200 },
  ];
  return (
    <div className="overflow-hidden rounded-xl bg-slate-50">
      <div className="grid grid-cols-[1.5fr_1fr_1fr_0.6fr] gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
        <span>묶음</span>
        <span>배포자</span>
        <span>지역</span>
        <span>수량</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.name}
          className="grid grid-cols-[1.5fr_1fr_1fr_0.6fr] gap-2 px-3 py-2 text-[11px] text-slate-700"
        >
          <span className="truncate font-medium text-slate-900">{r.name}</span>
          <span className="truncate text-slate-600">{r.dist}</span>
          <span className="truncate text-slate-600">{r.area}</span>
          <span className="tabular-nums text-slate-600">{r.qty}장</span>
        </div>
      ))}
    </div>
  );
}

function MockAssets() {
  const assets = [
    { icon: <Download className="h-3.5 w-3.5" aria-hidden />, label: "QR ZIP" },
    { icon: <FileText className="h-3.5 w-3.5" aria-hidden />, label: "Batch CSV" },
    { icon: <Printer className="h-3.5 w-3.5" aria-hidden />, label: "A4 시트" },
    { icon: <Layers className="h-3.5 w-3.5" aria-hidden />, label: "포스터에 QR" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 px-3 py-3 sm:grid-cols-4">
      {assets.map((a) => (
        <div
          key={a.label}
          className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-3 text-center"
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent-50 text-accent-700">
            {a.icon}
          </span>
          <span className="text-[11px] font-medium text-slate-700">{a.label}</span>
        </div>
      ))}
    </div>
  );
}

function MockStats() {
  return (
    <div className="space-y-2 rounded-xl bg-slate-50 px-3 py-3">
      <div className="grid grid-cols-3 gap-2">
        <MockKpi label="총 클릭" value="172" />
        <MockKpi label="총 인쇄·배포" value="350장" />
        <MockKpi label="100장당" value="49.1" accent />
      </div>
      <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          배포자별 효율 (100장당)
        </p>
        <MockBar label="동아리부" value={62} max={62} />
        <MockBar label="총학생회" value={48} max={62} />
        <MockBar label="기숙사 조교" value={37} max={62} />
      </div>
    </div>
  );
}

function MockField({
  label,
  value,
  valueAccent,
}: {
  label: string;
  value: string;
  valueAccent?: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
      <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={
          "mt-0.5 text-[12px] font-medium " +
          (valueAccent ? "text-accent-700" : "text-slate-900")
        }
      >
        {value}
      </p>
    </div>
  );
}

function MockKpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border bg-white px-2 py-2 " +
        (accent ? "border-accent-200 bg-accent-50/50" : "border-slate-200")
      }
    >
      <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={
          "mt-0.5 text-[15px] font-semibold tabular-nums leading-tight tracking-headline " +
          (accent ? "text-accent-700" : "text-slate-900")
        }
      >
        {value}
      </p>
    </div>
  );
}

function MockBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-700">{label}</span>
        <span className="tabular-nums font-medium text-slate-900">{value.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-accent-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Personas() {
  const personas = [
    {
      title: "학교 행사 / 동아리 / 사내 공지",
      body: "수십~수백장 인쇄. A4 시트 → 오려 쓰기. 어느 게시판 반응이 좋은지.",
    },
    {
      title: "소상공인 — 음식점·학원·부동산",
      body: "전단지 배포자별 정산. 100장당 클릭으로 효율 비교, 다음 배포 위치 결정.",
    },
    {
      title: "포스팅·우편 배포 — 일본 시장",
      body: "에리어·담당자별 묶음. 포스터 PDF + QR 좌표 합성 → N-페이지 합본 → 인쇄소.",
    },
    {
      title: "팝업·이벤트 — 시한 캠페인",
      body: "끝난 뒤 QR 을 죽은 링크로 두지 않고, 다음 이벤트 / 후기 페이지로 자동 전환.",
    },
  ];
  return (
    <section className="container max-w-5xl py-16 sm:py-20">
      <div className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Who uses it
        </p>
        <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[28px]">
          이런 분들이 씁니다
        </h2>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {personas.map((p) => (
          <li
            key={p.title}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-700" aria-hidden />
              <div>
                <h3 className="text-sm font-medium text-slate-900">{p.title}</h3>
                <p className="mt-1.5 text-[12px] leading-snug text-slate-500">{p.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FinalCta({
  ctaHref,
  authenticated,
}: {
  ctaHref: string;
  authenticated: boolean;
}) {
  return (
    <section className="bg-slate-900 text-white">
      <div className="container max-w-5xl py-16 text-center sm:py-20">
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-accent-600">
          <QrCode className="h-5 w-5" aria-hidden />
        </div>
        <h2 className="mt-4 text-[24px] font-semibold leading-tight tracking-headline sm:text-[28px]">
          첫 QR 캠페인은 5 분이면 끝
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-slate-300">
          캠페인 이름과 종료 시점만 정하면 batch 생성 → QR 다운로드 → 분석까지 한 자리에서.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={ctaHref}>
            <Button variant="accent" className="h-11 rounded-xl px-6 text-[13px] font-medium">
              {authenticated ? "지금 캠페인 만들기" : "무료로 시작하기"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
          {!authenticated && (
            <Link href="/login">
              <Button
                variant="ghost"
                className="h-11 rounded-xl px-6 text-[13px] font-medium text-white hover:bg-white/10"
              >
                로그인
              </Button>
            </Link>
          )}
        </div>
        <p className="mt-6 inline-flex items-center gap-1.5 text-[12px] text-slate-400">
          <PackageOpen className="h-3.5 w-3.5" aria-hidden />
          일반 단축 URL · 통계 도 같은 계정으로
        </p>
      </div>
      <div className="border-t border-white/10">
        <div className="container max-w-5xl py-4 text-center text-[11px] text-slate-400">
          <Link href="/" className="hover:text-white">
            ← 단축 URL 도구로 돌아가기
          </Link>
          <span className="mx-2">·</span>
          <Link href="/qr-campaigns" className="hover:text-white">
            <BarChart3 className="mr-1 inline-block h-3 w-3" aria-hidden />
            QR 캠페인 분석
          </Link>
        </div>
      </div>
    </section>
  );
}
