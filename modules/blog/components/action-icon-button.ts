import { cn } from "@/lib/utils";

export const ACTION_ICON = "h-[18px] w-[18px]";

export function actionIconButton(on = false) {
  return cn(
    "touch-target focus-ring grid h-9 w-9 place-items-center rounded-full transition-colors duration-200 motion-reduce:transition-none",
    on
      ? "text-accent-700 hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-500/15"
      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
  );
}
