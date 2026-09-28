"use client";

import type { useTranslations } from "next-intl";
import type { Section } from "@/components/links/edit-link-dialog/utils";

type Props = {
  active: Section;
  onSelect: (s: Section) => void;
  t: ReturnType<typeof useTranslations<"edit">>;
};

const SECTIONS: Section[] = ["basic", "tags", "og"];

/** Separate panels, so ink-underline tabs (the stats tab bar's anatomy), not a segmented control. */
export function SectionTabs({ active, onSelect, t }: Props) {
  return (
    <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
      {SECTIONS.map((section, index) => {
        const selected = active === section;
        return (
          <button
            key={section}
            type="button"
            role="tab"
            id={`edit-tab-${section}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(section)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % SECTIONS.length
                  : event.key === "ArrowLeft"
                    ? (index + SECTIONS.length - 1) % SECTIONS.length
                    : -1;
              if (next < 0) return;
              event.preventDefault();
              onSelect(SECTIONS[next]);
              document.getElementById(`edit-tab-${SECTIONS[next]}`)?.focus();
            }}
            className={
              "relative -mb-px min-h-10 shrink-0 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 " +
              (selected
                ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100")
            }
          >
            {t(`tabs.${section}`)}
          </button>
        );
      })}
    </div>
  );
}
