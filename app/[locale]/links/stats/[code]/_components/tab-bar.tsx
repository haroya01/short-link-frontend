"use client";

import { useTranslations } from "next-intl";
import type { TabKey } from "../_lib/use-tab-hash";

type Props = {
  active: TabKey;
  onSelect: (tab: TabKey) => void;
  /** 표시할 탭 부분집합 — 단일 스크롤 허브 전환 후 분석/설정 2탭만 쓴다(기본 = 전체). */
  items?: TabKey[];
};

/**
 * Segmented pill tabs that drive the stats body. Active pill rides on {@code bg-white} with a
 * soft shadow over the slate-50 trough — looks like a hardware switch landed in a slot, not just
 * an inverted color (Apple segmented-control idiom). Inner radius {@code rounded-full} matches
 * the outer container's {@code rounded-full} so the radii read as concentric. Hash-synced via
 * the parent's setter.
 */
export function TabBar({ active, onSelect, items }: Props) {
  const t = useTranslations("stats");
  const all: { key: TabKey; label: string }[] = [
    { key: "overview", label: t("tabs.overview") },
    { key: "when", label: t("analysisTabs.when") },
    { key: "where", label: t("analysisTabs.where") },
    { key: "who", label: t("analysisTabs.who") },
    { key: "settings", label: t("tabs.settings") },
  ];
  const tabs = items ? all.filter((it) => items.includes(it.key)) : all;
  // 세그먼트 밑 사용법 설명문은 두지 않는다 — 화면이 스스로 설명돼야 한다.
  return (
    <div
      role="tablist"
      aria-label={t("tabs.aria")}
      className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <div className="inline-flex gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
        {tabs.map((it) => {
          const selected = active === it.key;
          return (
            <button
              key={it.key}
              type="button"
              role="tab"
              id={`stats-tab-${it.key}`}
              aria-controls={`stats-panel-${it.key}`}
              tabIndex={selected || (active === "settings" && it.key === "overview") ? 0 : -1}
              onKeyDown={(event) => {
                const index = tabs.findIndex((tab) => tab.key === it.key);
                const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
                if (next < 0) return;
                event.preventDefault();
                onSelect(tabs[next].key);
                document.getElementById(`stats-tab-${tabs[next].key}`)?.focus();
              }}
              aria-selected={selected}
              onClick={() => onSelect(it.key)}
              className={
                "relative min-h-10 shrink-0 rounded-md px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 " +
                (selected
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100")
              }
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
