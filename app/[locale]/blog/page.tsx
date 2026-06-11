import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeedScreen, feedMetadata } from "@/modules/blog/components/feed-screen";

/**
 * The bare feed URL — statically rendered + ISR so the most-hit blog page (and what crawlers see)
 * is served from the edge cache instead of paying a per-request SSR round trip (~0.5–1.3s TTFB).
 * Any parameterized view — ?sort/?q/?tag/?lang, or a visitor whose saved default tab differs from
 * recent — is rewritten by the middleware to ./browse, the per-request variant. The URL the
 * visitor sees never changes.
 */
export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return feedMetadata(locale);
}

export default async function BlogFeedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FeedScreen locale={locale} />;
}
