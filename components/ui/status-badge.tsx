import { cn } from "@/lib/utils";

const TONES = {
  live: "bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-400",
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  caution: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  danger: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
} as const;

export type StatusTone = keyof typeof TONES;

/** Status pill for lists: live (running), neutral (not started · ended · archived), caution (needs the owner), danger. */
export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
