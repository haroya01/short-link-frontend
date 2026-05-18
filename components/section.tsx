import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  title: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  footnote?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
};

/**
 * Stat / dashboard section surface. Refined Apple-style 16 px corner ({@code rounded-2xl}) sits
 * one tier above inner KPI / nested cards ({@code rounded-xl} 12 px) so radii read as concentric.
 * Header has a three-level hierarchy: optional eyebrow (uppercase tracking, accent — used as a
 * tiny brand mark on sections that need contextual labeling), title (semibold, tracking-tight,
 * 15 px), description (slate-500, leading-relaxed). The optional footnote slot lets sections
 * add caveats / data-source links without spilling outside the wrapper.
 */
export function Section({
  id,
  title,
  description,
  eyebrow,
  action,
  footnote,
  className,
  bodyClassName,
  children,
}: Props) {
  return (
    <section
      id={id}
      className={cn(
        // {@code min-w-0} stops the section from forcing its grid track wider than the
        // available column. Without it, an item that legitimately needs horizontal scroll
        // (e.g. the 640px-wide {@code Heatmap}) propagates its min-content up to the parent
        // grid track, and on viewports narrower than 640px the body ends up wider than the
        // viewport → horizontal page scroll, huge right-side gutter. Issue #222.
        "min-w-0 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] scroll-mt-20",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-700">
              {eyebrow}
            </p>
          )}
          <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h3>
          {description && (
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={cn("min-w-0 px-5 py-5", bodyClassName)}>{children}</div>
      {footnote && (
        <footer className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500">
          {footnote}
        </footer>
      )}
    </section>
  );
}
