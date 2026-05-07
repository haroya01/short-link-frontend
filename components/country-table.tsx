"use client";

import type { CountryClick } from "@/types";
import { countryFlag, countryName, formatNumber } from "@/lib/utils";
import { Table, TBody, TD, TH, THead, TR } from "./ui/table";

type Props = { data: CountryClick[] };

export function CountryTable({ data }: Props) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-500">국가 데이터 없음</p>;
  }
  const total = data.reduce((a, b) => a + b.count, 0) || 1;
  return (
    <Table>
      <THead>
        <TR>
          <TH className="w-[50%]">국가</TH>
          <TH className="text-right">클릭</TH>
          <TH className="text-right">비중</TH>
        </TR>
      </THead>
      <TBody>
        {data.map((c, i) => {
          const ratio = c.count / total;
          const pct = (ratio * 100).toFixed(1);
          const code = c.country?.toUpperCase() ?? "??";
          const known = code.length === 2 && code !== "UN" && code !== "??";
          return (
            <TR key={code}>
              <TD>
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">
                    {known ? countryFlag(code) : "🌐"}
                  </span>
                  <span className="font-medium text-slate-900">
                    {known ? countryName(code) : "Unknown"}
                  </span>
                  {known && <span className="font-mono text-[11px] text-slate-500">{code}</span>}
                </span>
              </TD>
              <TD className="text-right tabular-nums">{formatNumber(c.count)}</TD>
              <TD className="text-right">
                <div className="ml-auto flex w-full max-w-[160px] items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-accent-600"
                      style={{
                        width: `${pct}%`,
                        animation: `ctGrow 600ms ${i * 50}ms ease-out backwards`,
                      }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-[11px] tabular-nums text-slate-500">
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
