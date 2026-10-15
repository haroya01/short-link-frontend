import { cn } from "@/lib/utils";

export function UnreadDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      data-unread-dot
      className={cn(
        "absolute h-2 w-2 rounded-full bg-accent-600 ring-2 ring-white dark:bg-accent-400 dark:ring-slate-950",
        className,
      )}
    />
  );
}
