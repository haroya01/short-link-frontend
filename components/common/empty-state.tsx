import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: Props) {
  return (
    <div className={cn("border-t border-slate-200 py-6 dark:border-slate-800", className)}>
      <p className="text-[15px] font-medium text-slate-900 dark:text-slate-100">{title}</p>
      {description && (
        <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
