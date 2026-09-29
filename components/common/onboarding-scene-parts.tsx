export function SceneExample({ label }: { label: string }) {
  return (
    <span className="absolute right-3 top-3 text-[10px] font-medium text-slate-500 dark:text-slate-400">
      {label}
    </span>
  );
}

export function SceneBar({
  label,
  count,
  width,
  delay,
}: {
  label: string;
  count: number;
  width: string;
  delay: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="text-[10px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
          {count}
        </span>
      </div>
      <div
        className="obs-bar mt-1 h-1 rounded-full bg-accent-600 dark:bg-accent-500"
        style={{ width, animationDelay: delay }}
      />
    </div>
  );
}
