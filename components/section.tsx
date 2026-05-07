import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function Section({ id, title, description, action, className, children }: Props) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-lg border border-slate-200 bg-white scroll-mt-20",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
