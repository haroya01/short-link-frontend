import { getTranslations } from "next-intl/server";

/**
 * Editorial masthead band — the feed home opens with a quiet tagline + sub-line; other feed-style
 * surfaces (a tag's feed, the topics index) reuse the SAME band with an overridden title/sub so they
 * read as the same product rather than separate pages. Optional `eyebrow` adds a small contextual
 * label (e.g. "주제") above the title. No eyebrow on the home feed: the sticky header already carries
 * the "kurl log" wordmark. Server component: no auth, no client state, no layout shift.
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
  // A string sets the sub-line; `null` suppresses it (e.g. search results, where the count in the
  // title already states the scope). `undefined` falls back to the home tagline.
  sub?: string | null;
}) {
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  const heading = title ?? t("mastheadTagline");
  const subText = sub === null ? null : (sub ?? t("mastheadSub"));
  return (
    <section className="bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-14">
        <div className="hero-stagger mx-auto max-w-2xl">
          {eyebrow && (
            <p className="mb-2 text-[12px] font-semibold text-accent-700 dark:text-accent-400">
              {eyebrow}
            </p>
          )}
          <h1 className="text-balance text-[26px] font-bold leading-[1.2] tracking-headline text-slate-900 dark:text-slate-100 sm:text-[34px]">
            {heading}
          </h1>
          {subText && (
            <p className="mt-2 text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
              {subText}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
