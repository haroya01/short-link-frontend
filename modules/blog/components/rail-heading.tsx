import type { ReactNode } from "react";

/**
 * The brand-green tick — the weblog's recurring signature that threads the brand colour through every
 * section label / field label, so the surface reads as *this* product. One definition; reuse it (don't
 * re-inline the `h-3 w-[3px]` span).
 */
export function BrandTick() {
  return <span aria-hidden className="h-3 w-[3px] shrink-0 rounded-full bg-accent-500" />;
}

/**
 * Section label used across the blog's rails and grouped sections (Writers / Topics / Series / Tags /
 * Archive / …). Deliberately not uppercase/tracked: that reads as Latin chrome and spaces Hangul/Kana
 * awkwardly (this is a ja/ko-first product). Radius/shadow untouched per the AGENTS.md design system.
 */
export function RailHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={
        "flex items-center gap-2 text-[13px] font-bold text-slate-800 dark:text-slate-200" +
        (className ? ` ${className}` : "")
      }
    >
      <BrandTick />
      {children}
    </h2>
  );
}
