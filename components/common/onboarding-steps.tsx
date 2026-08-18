/**
 * 온보딩 3단계의 종이 문법 — 테두리 상자+번호 원판 그리드 대신 헤어라인 구분 +
 * 그린 모노 인덱스(01·02·03). 이벤트 소개(#983)와 같은 결로, 대시보드·캠페인
 * 온보딩 패널이 공유한다.
 */
export function OnboardingSteps({ steps }: { steps: { title: string; desc: string }[] }) {
  return (
    <ol className="mt-5 border-y border-slate-200/70 dark:border-slate-800 sm:flex">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className={
            "flex-1 py-4 sm:px-5 " +
            (index > 0
              ? "border-t border-slate-200/70 dark:border-slate-800 sm:border-l sm:border-t-0"
              : "sm:pl-0")
          }
        >
          <p className="font-mono text-[11px] font-medium text-accent-700 dark:text-accent-400">
            {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{step.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {step.desc}
          </p>
        </li>
      ))}
    </ol>
  );
}
