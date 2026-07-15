"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { BrandTick } from "@/modules/blog/components/rail-heading";

/**
 * A collapsible row for the reader's 저장한 글 보관함 인덱스 — the label (brand-green tick + title) and
 * its hint live on a disclosure button, and the body (a saved list) unfolds below. 서랍장(섹션마다
 * 보더 카드)이 아니라 부모가 헤어라인으로 나누는 조용한 색인 행 — 열린 본문(읽기 리스트)과 색인의
 * 위계가 서게 한다. The heading wraps the button (WAI-ARIA accordion) so the section keeps its landmark.
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
    <section>
      <h2 className="m-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="focus-ring flex w-full items-center gap-3 px-1 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
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
      {open && <div className="px-1 pb-6 pt-1">{children}</div>}
    </section>
  );
}
