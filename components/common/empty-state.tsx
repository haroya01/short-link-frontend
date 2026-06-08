import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 -z-0 bg-gradient-radial from-accent-50 to-transparent blur-2xl" />
        <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Icon className="h-5 w-5 text-slate-500 dark:text-slate-400" strokeWidth={1.5} />
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent-500" />
        </div>
        <svg
          className="absolute -left-3 -top-2 h-3 w-3 text-slate-200 dark:text-slate-700"
          viewBox="0 0 12 12"
          fill="currentColor"
          aria-hidden
        >
          <circle cx="6" cy="6" r="2" />
        </svg>
        <svg
          className="absolute -right-2 bottom-0 h-2 w-2 text-slate-200 dark:text-slate-700"
          viewBox="0 0 8 8"
          fill="currentColor"
          aria-hidden
        >
          <circle cx="4" cy="4" r="2" />
        </svg>
      </div>
      <p className="text-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
