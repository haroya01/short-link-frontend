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
    <section className="border-b border-slate-200/70 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="hero-stagger max-w-2xl">
          {eyebrow && (
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-accent-600">
              {eyebrow}
            </p>
          )}
          <h1 className="text-balance text-[30px] font-semibold leading-[1.1] tracking-headline text-slate-900 sm:text-[40px]">
            {heading}
          </h1>
          {subText && <p className="mt-3 text-[15px] leading-relaxed text-slate-500">{subText}</p>}
        </div>
      </div>
    </section>
  );
}
