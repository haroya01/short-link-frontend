"use client";

import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/utils";

type Props = {
  items: { label: string; count: number }[];
};

export function BreakdownList({ items }: Props) {
  const t = useTranslations("stats");
  if (items.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-500">{t("noData")}</p>;
  }
  const total = items.reduce((a, b) => a + b.count, 0) || 1;
  const top = [...items].sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <ul className="space-y-2">
      {top.map((item, i) => {
        const ratio = item.count / total;
        const pct = (ratio * 100).toFixed(1);
        return (
          <li key={item.label} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 truncate text-slate-700" title={item.label}>
              {item.label}
            </span>
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-accent-600"
                  style={{
                    width: `${pct}%`,
                    animation: `bdGrow 600ms ${i * 50}ms ease-out backwards`,
                  }}
                />
              </div>
            </div>
            <span className="w-16 text-right font-mono text-xs tabular-nums text-slate-600">
              {formatNumber(item.count)}
            </span>
            <span className="w-12 text-right font-mono text-[11px] tabular-nums text-slate-500">
              {pct}%
            </span>
          </li>
        );
      })}
      <style jsx>{`
        @keyframes bdGrow {
          from {
            width: 0;
          }
        }
      `}</style>
    </ul>
  );
}
