import { cn } from "@/lib/utils";

export type KpiMetric = { label: string; value: string; muted?: boolean };

export function KpiLine({
  hero,
  metrics,
  note,
  className,
}: {
  hero: KpiMetric;
  metrics: KpiMetric[];
  note?: string;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-slate-200 pb-6 dark:border-slate-800", className)}>
      <dl className="grid grid-cols-3 items-end gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-8">
        <div className="col-span-3 sm:col-span-1">
          <dt className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{hero.label}</dt>
          <dd className="mt-1.5 text-[38px] font-bold leading-none tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
            {hero.value}
          </dd>
        </div>
        {metrics.map((metric) => (
          <div key={metric.label} className="flex min-w-0 flex-col gap-1 pb-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <dt className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{metric.label}</dt>
            <dd
              className={cn(
                "text-[16px] font-bold leading-none tracking-tight tabular-nums",
                metric.muted ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100",
              )}
            >
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
      {note && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{note}</p>}
    </section>
  );
}
