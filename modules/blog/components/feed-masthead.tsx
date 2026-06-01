import { getTranslations } from "next-intl/server";

/**
 * Editorial masthead band — the feed home opens with a quiet tagline + sub-line; other feed-style
 * surfaces (a tag's feed, the topics index) reuse the SAME band with an overridden title/sub so they
 * read as the same product rather than separate pages. Optional `eyebrow` adds a small contextual
 * label (e.g. "주제") above the title. No eyebrow on the home feed: the sticky header already carries
 * the "blog.kurl" wordmark. Server component: no auth, no client state, no layout shift.
 */
export async function FeedMasthead({
  locale,
  eyebrow,
  title,
  sub,
}: {
  locale: string;
  eyebrow?: string;
  title?: string;
  sub?: string;
}) {
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  const heading = title ?? t("mastheadTagline");
  const subText = sub ?? t("mastheadSub");
  return (
    <section className="border-b border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-14">
        <div className="hero-stagger max-w-2xl">
          {eyebrow && (
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-accent-700">
              {eyebrow}
            </p>
          )}
          <h1 className="text-balance text-headline-sm font-semibold leading-[1.15] tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-lg sm:leading-[1.1]">
            {heading}
          </h1>
          {/* Sub-line is brand flourish — hide on mobile to get the first post above the fold sooner. */}
          {subText && (
            <p className="mt-2 hidden text-[15px] leading-relaxed text-slate-500 dark:text-slate-400 sm:mt-3 sm:block">
              {subText}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
