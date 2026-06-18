"use client";

import type { useTranslations } from "next-intl";
import type { Section } from "@/components/links/edit-link-dialog/utils";

type Props = {
  active: Section;
  onSelect: (s: Section) => void;
  t: ReturnType<typeof useTranslations<"edit">>;
};

export function SectionTabs({ active, onSelect, t }: Props) {
  return (
    <div className="mb-4 flex gap-1 rounded-md bg-slate-100 dark:bg-slate-800 p-1 text-xs">
      <Pill active={active === "basic"} onClick={() => onSelect("basic")}>
        {t("tabs.basic")}
      </Pill>
      <Pill active={active === "tags"} onClick={() => onSelect("tags")}>
        {t("tabs.tags")}
      </Pill>
      <Pill active={active === "og"} onClick={() => onSelect("og")}>
        {t("tabs.og")}
      </Pill>
      <Pill active={active === "protection"} onClick={() => onSelect("protection")}>
        {t("tabs.protection")}
      </Pill>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "focus-ring flex-1 rounded px-2 py-1.5 text-center transition " +
        (active
          ? "bg-white dark:bg-slate-900 font-medium text-accent-700 dark:text-accent-400 shadow-sm"
          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100")
      }
    >
      {children}
    </button>
  );
}
