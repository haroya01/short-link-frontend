import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * Multi-line input primitive mirroring the {@link Input} component's styling so a Textarea sitting
 * next to an Input inside a dialog reads as part of the same form. Earlier two dialogs (TextBlock,
 * PlaceBlock) duplicated the same 8 Tailwind classes inline — pulling them into a primitive keeps
 * the styling drift-proof when we tweak focus rings or border weight later.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 3, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "block w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400",
        "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:[color-scheme:dark]",
        "focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-transparent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
