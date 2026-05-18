"use client";

import { useTranslations } from "next-intl";
import type { TabKey } from "../_lib/use-tab-hash";

type Props = {
  active: TabKey;
  onSelect: (tab: TabKey) => void;
};

/**
 * Segmented pill tabs that drive the stats body. Active pill rides on {@code bg-white} with a
 * soft shadow over the slate-50 trough — looks like a hardware switch landed in a slot, not just
 * an inverted color (Apple segmented-control idiom). Inner radius {@code rounded-full} matches
 * the outer container's {@code rounded-full} so the radii read as concentric. Hash-synced via
 * the parent's setter.
 */
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
    <div className="space-y-2.5">
      <div
        role="tablist"
        aria-label={t("tabs.aria")}
        className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        <div className="inline-flex gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
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
                  "relative shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 " +
                  (selected
                    ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
                    : "text-slate-500 hover:text-slate-900")
                }
              >
                {it.label}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-[12px] leading-relaxed text-slate-500">
        {t(`tabs.descriptions.${active}`)}
      </p>
    </div>
  );
}
