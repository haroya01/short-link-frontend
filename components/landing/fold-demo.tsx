const LONG_URL = "https://shop.example.com/products/7334412345?utm_source=instagram";
const SHORT_URL = "kurl.me/k8Tq2Za";

export function FoldDemo() {
  return (
    <div
      aria-hidden
      data-testid="fold-demo"
      className="relative mb-8 h-12 overflow-hidden font-mono [--sweep-at:900ms] sm:mb-10"
    >
      <span className="fold-long sweep-out absolute inset-0 flex items-end pb-3 sm:justify-center">
        <span className="whitespace-nowrap text-[16px] font-medium text-slate-400 dark:text-slate-500">{LONG_URL}</span>
      </span>
      <span className="sweep-in absolute inset-0 flex items-end pb-2.5 sm:justify-center">
        <span className="whitespace-nowrap text-[21px] font-bold tracking-tight text-accent-700 dark:text-accent-400 sm:text-[24px]">
          {SHORT_URL}
        </span>
        <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-accent-600 dark:bg-accent-500" />
      </span>
    </div>
  );
}
