import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const GROUPED_ROW =
  "focus-ring flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50";

export function GroupedList({
  title,
  footer,
  footerClassName,
  children,
}: {
  title: string;
  footer?: ReactNode;
  footerClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <h2 className="px-4 pb-2 text-[13px] font-medium text-slate-500 dark:text-slate-400">{title}</h2>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {children}
      </div>
      {footer && <p className={cn("px-4 pt-2 text-xs text-slate-500 dark:text-slate-400", footerClassName)}>{footer}</p>}
    </section>
  );
}
