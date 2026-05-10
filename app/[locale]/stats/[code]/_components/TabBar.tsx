"use client";

import { useTranslations } from "next-intl";
import type { TabKey } from "../_lib/use-tab-hash";

type Props = {
  active: TabKey;
  onSelect: (tab: TabKey) => void;
};

/** Horizontal pill tabs that drive the stats body. Hash-synced via the parent's setter. */
export function TabBar({ active, onSelect }: Props) {
  const t = useTranslations("stats");
  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: t("tabs.overview") },
    { key: "traffic", label: t("tabs.traffic") },
    { key: "sources", label: t("tabs.sources") },
    { key: "audience", label: t("tabs.audience") },
    { key: "settings", label: t("tabs.settings") },
  ];
  return (
    <div className="space-y-2">
      <div
        role="tablist"
        aria-label={t("tabs.aria")}
        className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
      >
        {tabs.map((it) => {
          const selected = active === it.key;
          return (
            <button
              key={it.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(it.key)}
              className={
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition " +
                (selected
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50")
              }
            >
              {it.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">{t(`tabs.descriptions.${active}`)}</p>
    </div>
  );
}
