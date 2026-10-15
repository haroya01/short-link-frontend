import { MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

export function SeriesNoteMarker({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-1.5 py-px align-[1px] text-[11px] font-semibold leading-4 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        className,
      )}
    >
      <MessageSquareText aria-hidden className="h-3 w-3" />
      {label}
    </span>
  );
}
