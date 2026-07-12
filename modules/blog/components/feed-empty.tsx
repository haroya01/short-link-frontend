import type { ReactNode } from "react";
import { FileText, type LucideIcon } from "lucide-react";
import { Mark } from "@/components/common/logo";

/**
 * Designed empty state for the feed / tag / following / series surfaces. Two signatures:
 *  - default: a soft icon medallion (meaningful glyph, e.g. Heart for 좋아요).
 *  - `mark`: the kurl mark line-draws in (the 사사삭) — the quiet brand signature, matching SearchEmpty,
 *    used on the blog-feed tabs so an empty tab reads as an intentional weblog moment, not a stock
 *    "no results" card. Editorial heading + a line of body, an optional CTA, and an optional
 *    discovery springboard (`children`, e.g. authors to follow) so the surface never dead-ends.
 */
export function FeedEmpty({
  title,
  body,
  action,
  icon: Icon = FileText,
  mark = false,
  children,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  mark?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center sm:py-24">
      {mark ? (
        <Mark className="h-6 w-auto text-accent-600 dark:text-accent-400" animated />
      ) : (
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400">
          <Icon className="h-7 w-7" />
        </span>
      )}
      <h2
        className={`max-w-md text-card-title-md font-semibold tracking-tight text-slate-900 dark:text-slate-100 ${
          mark ? "mt-7" : "mt-6"
        }`}
      >
        {title}
      </h2>
      {body && (
        <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
          {body}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
      {children}
    </div>
  );
}
