import type { ReactNode } from "react";

export const statusActionClass =
  "touch-target focus-ring mt-1.5 inline-block rounded text-[13px] font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 dark:text-slate-100 dark:decoration-slate-600 dark:hover:decoration-slate-100";

export function StatusTitle({ children }: { children: ReactNode }) {
  return <strong className="block text-[14px] font-semibold text-red-700 dark:text-red-400">{children}</strong>;
}

export function StatusLine({ children, action }: { children: ReactNode; action: ReactNode }) {
  return (
    <div role="status" className="max-w-prose pt-1">
      <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{children}</p>
      {action}
    </div>
  );
}
