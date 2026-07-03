"use client";

import type { ComponentType, CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Mark } from "@/components/common/logo";
import { Button } from "@/components/ui/button";

export type AuthGateBenefit = {
  icon: ComponentType<{ className?: string }>;
  label: string;
};

const hi = (i: number): CSSProperties => ({ ["--hi" as string]: i }) as CSSProperties;

/**
 * Shared signed-out gate for the authenticated links surfaces (dashboard / stats / campaigns …).
 * One quiet, centered column — brand mark, a single value line, and a sign-in CTA that routes to
 * the existing /login page — so every gated surface reads as the same product as the sign-in
 * screen. It replaces nine hand-rolled variants, several of which rendered a bare heading with no
 * way to actually sign in.
 */
export function LinksAuthGate({
  eyebrow,
  title,
  description,
  benefits,
  next,
}: {
  /** Mono uppercase label naming the surface, e.g. "dashboard". */
  eyebrow: string;
  title: string;
  description?: string;
  /** Optional reasons to sign in; only the dashboard front door passes these. */
  benefits?: AuthGateBenefit[];
  /** A login-whitelisted path to return to after sign-in. Omit to land on the default. */
  next?: string;
}) {
  const t = useTranslations("authGate");
  const loginHref = next ? `/login?next=${next}` : "/login";

  return (
    <div className="container flex min-h-[calc(100dvh-3.5rem)] max-w-md flex-col items-center justify-center gap-7 py-14 text-center">
      <div className="hero-stagger flex w-full flex-col items-center gap-6">
        <div className="relative" style={hi(0)}>
          <div
            aria-hidden
            className="absolute -inset-6 -z-10 rounded-full bg-accent-200/45 blur-2xl dark:bg-accent-500/10"
          />
          <Mark className="h-9 w-auto text-accent-600 dark:text-accent-500" />
        </div>

        <div className="space-y-2.5" style={hi(1)}>
          <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700 dark:text-accent-400">
            {eyebrow}
          </p>
          <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
            {title}
          </h1>
          <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
            {description ?? t("defaultDesc")}
          </p>
        </div>

        {benefits && benefits.length > 0 && (
          <ul className="grid w-full gap-2 text-left sm:grid-cols-3" style={hi(2)}>
            {benefits.map(({ icon: Icon, label }, i) => (
              <li
                key={i}
                className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50 sm:flex-col sm:items-start sm:gap-2"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white text-accent-700 shadow-sm dark:bg-slate-900 dark:text-accent-400">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[13px] leading-snug text-slate-600 dark:text-slate-300">
                  {label}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex w-full flex-col items-center gap-3 pt-1" style={hi(3)}>
          <Link href={loginHref} className="w-full sm:w-auto">
            <Button variant="accent" size="lg" className="w-full sm:w-auto sm:min-w-[13rem]">
              {t("login")}
            </Button>
          </Link>
          <Link
            href="/"
            className="text-[13px] text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
          >
            {t("explore")}
          </Link>
        </div>
      </div>
    </div>
  );
}
