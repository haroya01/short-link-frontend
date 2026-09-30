import type { ReactNode } from "react";
import { cn, inert } from "@/lib/utils";

/**
 * The signed-out feature pages (QR campaigns, events, profile examples) share the home page's
 * grammar: a short head, then one real product screen filled with example data, then a few hairline
 * lines and a closing action. Sizes and spacing mirror HomeStatsExample so the four read as one set.
 */
export function PromoHero({
  title,
  lead,
  action,
  hint,
}: {
  title: ReactNode;
  lead: ReactNode;
  action: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-slate-950">
      <div className="container max-w-5xl pb-12 pt-14 sm:pb-16 sm:pt-24">
        <div className="max-w-3xl">
          <h1 className="text-balance break-keep text-headline-lg font-bold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-pretty break-keep text-[15px] leading-[1.65] text-slate-600 dark:text-slate-300 sm:text-[17px]">
            {lead}
          </p>
          <div className="mt-8">{action}</div>
          {hint ? (
            <p className="mt-4 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function PromoSection({
  title,
  desc,
  children,
}: {
  title: ReactNode;
  desc?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container max-w-5xl py-16 sm:py-20">
        <h2 className="max-w-2xl text-balance break-keep text-headline-sm font-bold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
          {title}
        </h2>
        {desc ? (
          <p className="mt-3 max-w-xl text-pretty break-keep text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
            {desc}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}

/** A real screen drawn as a still picture: nothing in it can be focused or clicked. */
export function PromoExample({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div aria-hidden {...inert(true)} className={cn("mt-10 select-none", className)}>
      {children}
    </div>
  );
}

export function PromoLines({ items }: { items: { title: ReactNode; body: ReactNode }[] }) {
  return (
    <dl className="mt-14 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      {items.map((item, i) => (
        <div key={i} className="grid gap-x-8 gap-y-1 py-5 sm:grid-cols-[18rem_1fr]">
          <dt className="break-keep text-[15px] font-semibold text-slate-900 dark:text-slate-100">{item.title}</dt>
          <dd className="break-keep text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{item.body}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PromoActions({ children }: { children: ReactNode }) {
  return <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">{children}</div>;
}
