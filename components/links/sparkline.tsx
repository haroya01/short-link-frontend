import { cn } from "@/lib/utils";

/** Seven-day human-click line (oldest → today), drawn to the row's own max so the shape reads. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const w = 56;
  const h = 20;
  const max = Math.max(...values, 1);
  const step = w / (values.length - 1);
  const points = values.map((v, i) => [i * step, h - 2 - (v / max) * (h - 4)] as const);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];
  const flat = values.every((v) => v === 0);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden className={cn("overflow-visible", className)}>
      <polyline
        points={line}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={flat ? "stroke-slate-300 dark:stroke-slate-700" : "stroke-accent-600 dark:stroke-accent-400"}
      />
      {!flat && <circle cx={lastX} cy={lastY} r="2" className="fill-accent-600 dark:fill-accent-400" />}
    </svg>
  );
}
