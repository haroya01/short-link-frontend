/**
 * 온보딩 3단계 — 헤어라인으로 나눈 한 줄. 대시보드·캠페인 온보딩 패널이 공유한다.
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
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            <span className="mr-1.5 tabular-nums text-slate-500 dark:text-slate-400">{index + 1}</span>
            {step.title}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {step.desc}
          </p>
        </li>
      ))}
    </ol>
  );
}
