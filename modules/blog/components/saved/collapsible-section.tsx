"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { BrandTick } from "@/modules/blog/components/rail-heading";

/**
 * A collapsible section for the reader's 저장한 글 corner — the label (brand-green tick + title) and its
 * hint live on a disclosure button, and the body (a saved list) unfolds below. Gives the four equal-weight
 * sections depth: one focus at a time instead of four flat stacks scrolling forever. The heading wraps the
 * button (WAI-ARIA accordion) so the section keeps its landmark. Flat card per AGENTS.md §1 (no elevation).
 */
export function CollapsibleSection({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      <h2 className="m-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="focus-ring flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center gap-2 text-[13px] font-bold text-slate-800 dark:text-slate-200">
              <BrandTick />
              {title}
            </span>
            {hint && (
              <span className="text-[12px] font-normal text-slate-500 dark:text-slate-400">{hint}</span>
            )}
          </span>
          <ChevronDown
            aria-hidden
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ease-[var(--ease)] ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h2>
      {open && (
        <div className="border-t border-slate-100 px-4 pb-5 pt-4 dark:border-slate-800">{children}</div>
      )}
    </section>
  );
}
