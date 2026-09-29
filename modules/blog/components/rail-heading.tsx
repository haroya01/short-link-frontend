import type { ReactNode } from "react";

/**
 * Section label used across the blog's rails and grouped sections (Writers / Topics / Series / Tags /
 * Archive / …). Deliberately not uppercase/tracked: that reads as Latin chrome and spaces Hangul/Kana
 * awkwardly (this is a ja/ko-first product).
 */
export function RailHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={
        "text-[13px] font-bold text-slate-800 dark:text-slate-200" +
        (className ? ` ${className}` : "")
      }
    >
      {children}
    </h2>
  );
}
