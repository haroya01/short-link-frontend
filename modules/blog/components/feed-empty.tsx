import type { ReactNode } from "react";
import { FileText, type LucideIcon } from "lucide-react";

/**
 * Designed empty state for the feed / tag / following surfaces — a soft icon medallion, a heading
 * and a line of body, optionally a CTA. Generous vertical rhythm so an empty feed reads as
 * intentional rather than broken. `icon` defaults to a document glyph; a no-results search passes a
 * search-off glyph so the medallion matches the reason the surface is empty.
 */
export function FeedEmpty({
  title,
  body,
  action,
  icon: Icon = FileText,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-24 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-50 text-accent-600">
        <Icon className="h-7 w-7" />
      </span>
      <h2 className="mt-6 text-[19px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
      {body && <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
