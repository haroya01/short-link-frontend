"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "role"> & {
  checked: boolean;
  onCheckedChange?: (next: boolean) => void;
};

/** On/off for a setting that takes effect at once. On is ink — selection is never the brand green. */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, onClick, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onCheckedChange?.(!checked);
      }}
      className={cn(
        "focus-ring touch-target relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 disabled:opacity-50",
        checked ? "bg-slate-900 dark:bg-slate-100" : "bg-slate-200 dark:bg-slate-700",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ease-[var(--ease)] dark:bg-slate-900",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  ),
);
Switch.displayName = "Switch";
