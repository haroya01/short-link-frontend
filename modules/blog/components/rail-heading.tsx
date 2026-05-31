import type { ReactNode } from "react";

/**
 * Section label used across the blog's rails and grouped sections (Writers / Topics / Series / Tags /
 * Archive / …). The little brand-green tick is the weblog's recurring signature — it threads the brand
 * colour through every section so the surface reads as *this* product, not a generic slate-on-white
 * SaaS feed. Deliberately not uppercase/tracked: that reads as Latin chrome and spaces Hangul/Kana
 * awkwardly (this is a ja/ko-first product). Radius/shadow untouched per the AGENTS.md design system.
 */
export function RailHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={
        "flex items-center gap-2 text-[13px] font-bold text-slate-800" +
        (className ? ` ${className}` : "")
      }
    >
      <span aria-hidden className="h-3 w-[3px] shrink-0 rounded-full bg-accent-500" />
      {children}
    </h2>
  );
}
