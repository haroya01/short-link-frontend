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
        // {@code min-w-0} stops the section from forcing its grid track wider than the
        // available column. Without it, an item that legitimately needs horizontal scroll
        // (e.g. the 640px-wide {@code Heatmap}) propagates its min-content up to the parent
        // grid track, and on viewports narrower than 640px the body ends up wider than the
        // viewport → horizontal page scroll, huge right-side gutter. Issue #222.
        "min-w-0 rounded-lg border border-slate-200 bg-white scroll-mt-20",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="min-w-0 p-5">{children}</div>
    </section>
  );
}
