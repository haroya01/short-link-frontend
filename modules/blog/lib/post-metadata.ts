import type { Metadata } from "next";
import type { PublicAuthor, PublicPostListItem } from "@/modules/blog/api/public-posts";
import { audienceOf, cardMark, isIndexable, isRedactedCard, type CardMark } from "@/modules/blog/lib/post-audience";

export function postMetadata({
  author,
  post,
  url,
  postKey,
  shareLabel,
}: {
  author: PublicAuthor;
  post: PublicPostListItem;
  url: string;
  postKey: string | null;
  shareLabel: (mark: CardMark) => string;
}): Metadata {
  if (isRedactedCard(post)) {
    const label = shareLabel(cardMark(post) ?? "REGION");
    const card = `${url}/opengraph-image`;
    return {
      title: post.title,
      description: label,
      robots: { index: false, follow: false },
      openGraph: {
        title: post.title,
        description: label,
        url,
        type: "article",
        siteName: `@${author.username}`,
        images: [{ url: card, width: 2400, height: 1260, alt: post.title }],
        authors: [`@${author.username}`],
      },
      twitter: { card: "summary_large_image", title: post.title, description: label, images: [card] },
    };
  }
  const keyed = audienceOf(post) === "UNLISTED" && postKey != null;
  const shareUrl = keyed ? `${url}?k=${encodeURIComponent(postKey)}` : url;
  // Always hand crawlers a card image: the post's own cover if set, else the per-post generated card
  // (app/[locale]/p/[username]/[slug]/opengraph-image — the subdomain rewrite maps this back to the
  // route). Without the fallback an image-less post unfurled blank. The URL is already absolute, so
  // metadataBase doesn't rewrite it.
  const ogImage = post.ogImageUrl ?? `${url}/opengraph-image`;
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    ...(isIndexable(post) ? { alternates: { canonical: url } } : { robots: { index: false, follow: false } }),
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      url: shareUrl,
      type: "article",
      siteName: `@${author.username}`,
      images: [{ url: ogImage, width: 2400, height: 1260, alt: post.title }],
      locale: post.languageTag,
      publishedTime: post.publishedAt,
      modifiedTime: post.lastEditedAt ?? undefined,
      authors: [`@${author.username}`],
      tags: post.tags,
    },
    // Set twitter:* explicitly — otherwise the post inherits the root kurl.me site card (generic
    // title/description/image) on X / Slack / any consumer that prefers twitter tags over OpenGraph.
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt ?? undefined,
      images: [ogImage],
    },
  };
}
