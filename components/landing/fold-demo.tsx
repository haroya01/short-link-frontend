const LONG_URL = "https://shop.example.com/products/7334412345?utm_source=instagram";
const SHORT_URL = "kurl.me/k8Tq2Za";

export function FoldDemo() {
  return (
    <div aria-hidden data-testid="fold-demo" className="relative mb-8 h-12 overflow-hidden font-mono sm:mb-10">
      <span className="absolute bottom-3 left-0 sm:left-1/2 sm:-translate-x-1/2">
        <span className="fold-long block whitespace-nowrap text-[16px] font-medium text-slate-400 dark:text-slate-500">
          {LONG_URL}
        </span>
      </span>
      <span className="absolute bottom-0 left-0 pb-2.5 sm:left-1/2 sm:-translate-x-1/2">
        <span className="fold-short relative block whitespace-nowrap text-[21px] font-bold tracking-tight text-accent-700 dark:text-accent-400 sm:text-[24px]">
          {SHORT_URL}
          <span className="fold-line absolute inset-x-0 -bottom-2.5 h-[2px] origin-left rounded-full bg-accent-600 dark:bg-accent-500" />
        </span>
      </span>
    </div>
  );
}
