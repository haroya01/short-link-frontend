import { getTranslations } from "next-intl/server";
import { listPublicFeed } from "@/modules/blog/api/public-posts";
import { buildRss, feedItemForRss } from "@/modules/blog/lib/rss";

export const revalidate = 300;

/** blog.kurl recent-posts RSS — `blog.kurl.me/feed` (rewrites to /{locale}/blog/feed). */
export async function GET(req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  const origin = new URL(req.url).origin;

  const result = await listPublicFeed("recent", 0, 30);
  const items = result.ok ? result.data.items.map(feedItemForRss) : [];

  const xml = buildRss({
    title: "blog.kurl",
    link: origin,
    description: t("metaDescription"),
    selfUrl: req.url,
    locale,
    items,
    origin,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
