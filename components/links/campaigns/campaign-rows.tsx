"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn, formatNumber, formatShare } from "@/lib/utils";

type CampaignRow = {
  key: string | number;
  label: string;
  meta?: React.ReactNode;
  clicks: number | null;
  quantity: number;
  href?: string;
  action?: React.ReactNode;
};

const CAMPAIGN_ROWS_GRID = "sm:grid sm:grid-cols-[minmax(0,max-content)_minmax(4rem,1fr)_auto_auto]";
const CAMPAIGN_ROWS_GRID_WITH_ACTION = "sm:grid sm:grid-cols-[minmax(0,max-content)_minmax(4rem,1fr)_auto_auto_auto]";

function perHundred(clicks: number, quantity: number): number | null {
  return quantity > 0 ? (clicks * 100) / quantity : null;
}

export function CampaignRows({ rows, total, subgrid = false }: { rows: CampaignRow[]; total?: number; subgrid?: boolean }) {
  const t = useTranslations("campaignApp.campaignStats");
  const sum = Math.max(total ?? 0, rows.reduce((acc, row) => acc + (row.clicks ?? 0), 0)) || 1;
  const withAction = rows.some((row) => row.action);
  return (
    <ul
      data-testid="campaign-rows"
      className={cn(
        "space-y-4 sm:items-center sm:gap-x-4 sm:gap-y-3 sm:space-y-0",
        subgrid ? "sm:col-span-full sm:grid sm:grid-cols-subgrid" : withAction ? CAMPAIGN_ROWS_GRID_WITH_ACTION : CAMPAIGN_ROWS_GRID,
      )}
    >
      {rows.map((row, i) => {
        const share = row.clicks === null ? null : row.clicks / sum;
        const rate = row.clicks === null ? null : perHundred(row.clicks, row.quantity);
        return (
          <li
            key={row.key}
            className={cn(
              "grid items-center gap-x-3 sm:col-span-full sm:grid-cols-subgrid sm:gap-x-4",
              row.href && "relative",
              withAction ? "grid-cols-[minmax(0,1fr)_auto_auto_auto]" : "grid-cols-[minmax(0,1fr)_auto_auto]",
            )}
          >
            <div className="min-w-0 sm:max-w-[18rem]">
              <p data-testid="campaign-row-name" className="truncate text-[14px] text-slate-900 dark:text-slate-100" title={row.label}>
                {row.href ? (
                  <Link
                    href={row.href}
                    className="focus-ring rounded-sm font-medium decoration-slate-300 underline-offset-4 after:absolute after:inset-0 hover:underline dark:decoration-slate-600"
                  >
                    {row.label}
                  </Link>
                ) : (
                  row.label
                )}
              </p>
              {row.meta && <p className="mt-0.5 truncate text-[12px] text-slate-500 dark:text-slate-400">{row.meta}</p>}
            </div>
            <span aria-hidden className="col-span-full row-start-2 mt-1 flex h-1 sm:col-span-1 sm:row-start-auto sm:mt-0 sm:h-1.5">
              {share !== null && (
                <span
                  className="bar-grow-x block h-full bg-slate-300 dark:bg-slate-700"
                  style={{ width: `max(2px, ${share * 100}%)`, animationDelay: `${i * 40}ms` }}
                />
              )}
            </span>
            <span
              className="text-right text-[13px] tabular-nums text-slate-700 dark:text-slate-300"
              title={share === null ? undefined : formatShare(share)}
            >
              {row.clicks === null ? "—" : formatNumber(row.clicks)}
            </span>
            <span className="text-right text-[12px] tabular-nums text-slate-500 dark:text-slate-400">
              {rate === null ? "—" : t("units.perHundred", { rate: rate.toFixed(1) })}
            </span>
            {withAction && <span className="flex justify-end">{row.action}</span>}
          </li>
        );
      })}
    </ul>
  );
}
