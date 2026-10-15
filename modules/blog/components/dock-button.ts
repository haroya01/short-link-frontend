import { cn } from "@/lib/utils";

export function dockButton(on = false) {
  return cn(
    "focus-ring grid h-11 w-11 place-items-center rounded-full border shadow-float transition-colors duration-200 motion-reduce:transition-none",
    on
      ? "border-accent-600 bg-accent-600 text-white dark:border-accent-500 dark:bg-accent-500 dark:text-slate-950"
      : "glass-chrome border-slate-200/60 text-slate-700 dark:border-slate-800/60 dark:text-slate-200",
  );
}
