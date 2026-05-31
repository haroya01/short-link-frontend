import { listPublicPosts } from "@/modules/blog/api/public-posts";
import { authorPostForRss, buildRss } from "@/modules/blog/lib/rss";

export const revalidate = 300;

/** Per-author RSS — `{username}.kurl.me/feed` (rewrites to /{locale}/p/{username}/feed). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ locale: string; username: string }> },
) {
  const { locale, username } = await params;
  const origin = new URL(req.url).origin;

  const result = await listPublicPosts(username);
  if (!result.ok) {
    return new Response("Not found", { status: 404 });
  }
  const { author, posts } = result.data;

  const xml = buildRss({
    title: `@${author.username}`,
    link: origin,
    description: author.bio ?? `@${author.username}`,
    selfUrl: req.url,
    locale,
    items: posts.map((p) => authorPostForRss(p, author)),
    origin,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
