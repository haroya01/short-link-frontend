"use client";

import { useTranslations } from "next-intl";
import type { NotificationFilter } from "@/modules/notifications/api/notifications";
import { cn } from "@/lib/utils";

const FILTERS: { key: NotificationFilter; label: "tabAll" | "tabMentions" }[] = [
  { key: "all", label: "tabAll" },
  { key: "mentions", label: "tabMentions" },
];

export function NotificationTabs({
  value,
  onChange,
  dense = false,
  className,
}: {
  value: NotificationFilter;
  onChange: (next: NotificationFilter) => void;
  dense?: boolean;
  className?: string;
}) {
  const t = useTranslations("notifications");
  return (
    <div
      role="tablist"
      aria-label={t("tabsLabel")}
      className={cn("flex gap-1 border-b border-slate-100 dark:border-slate-800", className)}
    >
      {FILTERS.map(({ key, label }) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`notification-tab-${key}`}
            onClick={() => onChange(key)}
            className={cn(
              "focus-ring -mb-px shrink-0 whitespace-nowrap border-b-2 font-medium transition-colors",
              dense ? "min-h-9 px-2.5 text-[13px]" : "min-h-10 px-3.5 text-sm",
              active
                ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
            )}
          >
            {t(label)}
          </button>
        );
      })}
    </div>
  );
}
