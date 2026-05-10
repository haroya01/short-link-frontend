"use client";

import type { useTranslations } from "next-intl";
import type { Section } from "./utils";

type Props = {
  active: Section;
  onSelect: (s: Section) => void;
  t: ReturnType<typeof useTranslations<"edit">>;
};

export function SectionTabs({ active, onSelect, t }: Props) {
  return (
    <div className="mb-4 flex gap-1 rounded-md bg-slate-100 p-1 text-xs">
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
        "flex-1 rounded px-2 py-1.5 text-center transition " +
        (active
          ? "bg-white font-medium text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-900")
      }
    >
      {children}
    </button>
  );
}
