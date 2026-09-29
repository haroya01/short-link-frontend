import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/** The platform's own picker, in a closed box drawn with the Input tokens. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900",
      "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:[color-scheme:dark]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:border-transparent",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Select.displayName = "Select";
