import { cva } from "class-variance-authority";

/**
 * The blog's CTA recipe in one place. Returns the class string so it can dress an `<a>`, a `<button>`,
 * or a Next `<Link>` — the call sites differ (nav link vs sign-in action) but the button must look
 * identical. `primary` is the brand-green CTA with its soft green glow; `secondary` is the neutral
 * outline. Layout-context classes (shrink-0, responsive display) are merged in at the call site.
 *
 * Mirrors the shared `buttonVariants` pattern, but kept blog-local: the editorial CTA spec
 * (green glow, gap-1.5, padding-based height) intentionally differs from the app `Button`.
 */
export const blogCta = cva("focus-ring inline-flex items-center gap-1.5 text-sm font-medium transition-colors", {
  variants: {
    variant: {
      primary: "rounded-surface bg-accent-700 px-4 py-2.5 text-white hover:bg-accent-800",
      secondary:
        "rounded-surface border border-slate-200 px-4 py-2.5 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/50",
      text: "rounded font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 dark:text-slate-100 dark:decoration-slate-600 dark:hover:decoration-slate-100",
    },
  },
  defaultVariants: { variant: "primary" },
});
