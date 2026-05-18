"use client";

import { useTranslations } from "next-intl";
import type { CountryClick } from "@/types";
import { cn, countryFlag, countryName, formatNumber } from "@/lib/utils";
import { Table, TBody, TD, TH, THead, TR } from "./ui/table";

type Props = { data: CountryClick[] };

export function CountryTable({ data }: Props) {
  const t = useTranslations("stats");
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-500">{t("noData")}</p>;
  }
  const total = data.reduce((a, b) => a + b.count, 0) || 1;
  // Top country pct guides the leader highlight ({@code accent-700} vs the ramp's
  // {@code accent-600}) so the row that dominates the audience pops a step harder than the
  // long-tail. Falls back to the first entry if multiple share the top — that's still the
  // narrative anchor row.
  const topCount = data.reduce((m, c) => Math.max(m, c.count), 0);
  return (
    <Table>
      <THead>
        <TR>
          <TH className="w-[44%] sm:w-[50%]">{t("countryTable.country")}</TH>
          <TH className="text-right">{t("countryTable.clicks")}</TH>
          <TH className="text-right">{t("countryTable.share")}</TH>
        </TR>
      </THead>
      <TBody>
        {data.map((c, i) => {
          const ratio = c.count / total;
          // < 10% gets a single decimal so a 2% / 3% split stays distinguishable; >= 10%
          // rounds to whole numbers so the table reads as a clean breakdown without false
          // precision (a 61.3% leader doesn't carry useful info past the integer).
          const pct =
            ratio >= 0.1 ? (ratio * 100).toFixed(0) : (ratio * 100).toFixed(1);
          const code = c.country?.toUpperCase() ?? "??";
          const known = code.length === 2 && code !== "UN" && code !== "??";
          const isLeader = c.count === topCount && topCount > 0;
          return (
            <TR key={code}>
              <TD>
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">
                    {known ? countryFlag(code) : "🌐"}
                  </span>
                  <span className="min-w-0 truncate font-medium text-slate-900">
                    {known ? countryName(code) : "Unknown"}
                  </span>
                  {known && (
                    <span className="hidden font-mono text-[11px] text-slate-500 sm:inline">
                      {code}
                    </span>
                  )}
                </span>
              </TD>
              <TD className="text-right font-mono text-[12px] tabular-nums sm:text-sm">
                {formatNumber(c.count)}
              </TD>
              <TD className="text-right">
                {/* Bar width is bounded on every breakpoint so the rail across rows stays
                    visually aligned with the BreakdownList rail on the same page — the previous
                    full-width mobile bar drifted away from the breakdown-list aesthetic and
                    made the /demo Audience section read as two unrelated widgets. */}
                <div className="ml-auto flex w-[120px] items-center gap-2 sm:w-[160px]">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        isLeader ? "bg-accent-700" : "bg-accent-500",
                      )}
                      style={{
                        width: `${pct}%`,
                        animation: `ctGrow 600ms ${i * 50}ms ease-out backwards`,
                      }}
                    />
                  </div>
                  <span className="w-9 text-right font-mono text-[11px] tabular-nums text-slate-500 sm:w-10">
                    {pct}%
                  </span>
                </div>
              </TD>
            </TR>
          );
        })}
      </TBody>
      <style jsx>{`
        @keyframes ctGrow {
          from {
            width: 0;
          }
        }
      `}</style>
    </Table>
  );
}
