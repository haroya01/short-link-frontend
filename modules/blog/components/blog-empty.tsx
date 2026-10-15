import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** `body` is only for first-run surfaces: feed tabs and notifications. */
export function BlogEmpty({
  icon: Icon,
  title,
  body,
  action,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div data-testid="blog-empty" className={cn("flex flex-col items-center px-6 py-20 text-center", className)}>
      <Icon aria-hidden strokeWidth={1.5} className="h-8 w-8 text-slate-400 dark:text-slate-500" />
      <h2 className="mt-4 max-w-md text-[15px] font-medium text-slate-700 dark:text-slate-200">{title}</h2>
      {body && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{body}</p>
      )}
      {action && <div data-empty-action className="mt-5">{action}</div>}
      {children}
    </div>
  );
}
