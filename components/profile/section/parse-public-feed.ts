import type { FeedItem } from "./types";

export type PublicFeedEntryShape = {
  kind:
    | "LINK"
    | "TEXT"
    | "DIVIDER"
    | "IMAGE"
    | "EMBED"
    | "EMAIL_FORM"
    | "CONTACT_CARD"
    | "GALLERY"
    | "PRODUCT_CARD"
    | "BOOKING"
    | "EVENT"
    | "PLACE";
  id: number | null;
  shortCode: string | null;
  ogTitle?: string | null;
  ogImage?: string | null;
  highlighted?: boolean | null;
  content?: string | null;
};

export type ParsedPublicFeed = {
  items: FeedItem[];
  labelByShortCode: Record<string, string>;
  ogImageByShortCode: Record<string, string>;
  highlightedShortCode: string | null;
};

const BLOCK_KINDS_WITH_CONTENT = [
  "TEXT",
  "IMAGE",
  "EMBED",
  "EMAIL_FORM",
  "CONTACT_CARD",
  "GALLERY",
  "PRODUCT_CARD",
  "BOOKING",
  "EVENT",
] as const;

/**
 * Convert the public-profile {@code /api/v1/public/profiles/{username}} response into the editor's
 * unified {@link FeedItem} list + the lookup maps for link OG title/image and the highlighted
 * shortCode. Pure — no React, no fetch. The supported block-kind set mirrors the original inline
 * switch and intentionally excludes PLACE (the public endpoint doesn't surface it for the editor
 * yet).
 */
export function parsePublicFeed(entries: PublicFeedEntryShape[]): ParsedPublicFeed {
  const items: FeedItem[] = [];
  const labelByShortCode: Record<string, string> = {};
  const ogImageByShortCode: Record<string, string> = {};

  for (const e of entries) {
    if (e.kind === "LINK" && e.shortCode) {
      items.push({ kind: "LINK", code: e.shortCode });
      if (e.ogTitle) labelByShortCode[e.shortCode] = e.ogTitle;
      if (e.ogImage) ogImageByShortCode[e.shortCode] = e.ogImage;
      continue;
    }
    if (e.id == null) continue;
    if (e.kind === "DIVIDER") {
      items.push({ kind: "BLOCK", id: e.id, type: "DIVIDER", content: null });
      continue;
    }
    if ((BLOCK_KINDS_WITH_CONTENT as readonly string[]).includes(e.kind)) {
      items.push({
        kind: "BLOCK",
        id: e.id,
        type: e.kind as (typeof BLOCK_KINDS_WITH_CONTENT)[number],
        content: e.content ?? "",
      });
    }
  }

  const highlighted = entries.find((e) => e.kind === "LINK" && e.highlighted);
  return {
    items,
    labelByShortCode,
    ogImageByShortCode,
    highlightedShortCode: highlighted?.shortCode ?? null,
  };
}
