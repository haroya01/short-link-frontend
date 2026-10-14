import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** `body` is only for first-run surfaces: feed tabs and notifications. */
export function BlogEmpty({
  title,
  body,
  action,
  children,
  className,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div data-testid="blog-empty" className={cn("py-10", className)}>
      <h2 className="max-w-md text-[15px] font-medium text-slate-700 dark:text-slate-200">{title}</h2>
      {body && (
        <p className="mt-1 max-w-md text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{body}</p>
      )}
      {action && <div data-empty-action className="mt-3">{action}</div>}
      {children}
    </div>
  );
}
