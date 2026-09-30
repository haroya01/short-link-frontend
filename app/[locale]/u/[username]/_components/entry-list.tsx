import type { CSSProperties } from "react";
import type { PublicProfileEntry } from "@/types";
import type { ThemeColors } from "../_lib/theme";
import { BookingEntryCard } from "./booking-entry-card";
import { ContactCardEntry } from "./contact-card-entry";
import { DividerEntry } from "./divider-entry";
import { EmailFormEntryCard } from "./email-form-entry-card";
import { EmbedEntryCard } from "./embed-entry-card";
import { EventEntryCard } from "./event-entry-card";
import { PlaceEntry } from "./place-entry";
import { GalleryEntryCard } from "./gallery-entry-card";
import { ProductCardEntry } from "./product-card-entry";
import { ImageEntryCard } from "./image-entry-card";
import { LinkEntryCard } from "./link-entry-card";
import { FeaturedLink } from "./featured-link";
import { LinkRows } from "./link-rows";
import { isImageUrl, youtubeId } from "../_lib/url-helpers";
import { TextEntry } from "./text-entry";

type Props = {
  entries: PublicProfileEntry[];
  username: string;
  colors: ThemeColors;
  emptyLabel: string;
};

/** Header is at index 0 (handled outside this component), so feed items start at idx + 1. */
function fadeStyle(idx: number): CSSProperties {
  return { "--idx": idx + 1 } as CSSProperties;
}

type Item = { rows: PublicProfileEntry[] } | { entry: PublicProfileEntry };

function isPlainLink(entry: PublicProfileEntry): boolean {
  const url = entry.originalUrl ?? "";
  return entry.kind === "LINK" && !isImageUrl(url) && !youtubeId(url);
}

// 주인이 정한 순서는 그대로 두고, 연달아 놓인 보통 링크만 한 목록으로 묶는다.
function groupEntries(entries: PublicProfileEntry[]): Item[] {
  const items: Item[] = [];
  for (const entry of entries) {
    const last = items[items.length - 1];
    if (isPlainLink(entry) && last && "rows" in last) last.rows.push(entry);
    else items.push(isPlainLink(entry) ? { rows: [entry] } : { entry });
  }
  return items;
}

// 대표로 올릴 수 있는 것 — 주인이 고른 링크 하나, 또는 모집·상품 블록 하나(서버가 한 명당 하나로 지킨다).
const FEATURABLE = new Set<PublicProfileEntry["kind"]>(["LINK", "EVENT", "PRODUCT_CARD"]);

/**
 * Maps each backend entry to its rendering component by {@code kind}. Anything unrecognized falls
 * through silently — defensive against the API gaining new kinds before the front catches up.
 */
export function EntryList({ entries, username, colors, emptyLabel }: Props) {
  if (entries.length === 0) {
    return (
      <ul className="mt-8 space-y-2.5">
        <li
          className={`rounded-2xl border border-dashed ${colors.cardBorder} p-6 text-center text-xs ${colors.muted}`}
        >
          {emptyLabel}
        </li>
      </ul>
    );
  }

  const featured = entries.find((e) => e.highlighted && FEATURABLE.has(e.kind)) ?? null;
  const items = groupEntries(featured ? entries.filter((e) => e !== featured) : entries);
  const offset = featured ? 1 : 0;

  return (
    <ul className="mt-8 space-y-2.5">
      {featured &&
        (featured.kind === "LINK" ? (
          <FeaturedLink entry={featured} username={username} colors={colors} fadeStyle={fadeStyle(0)} />
        ) : (
          <EntryItem entry={featured} idx={0} username={username} colors={colors} featured />
        ))}
      {items.map((item, i) => {
        const idx = i + offset;
        if ("rows" in item) {
          return (
            <LinkRows
              key={`rows-${item.rows[0].shortCode ?? idx}`}
              entries={item.rows}
              username={username}
              colors={colors}
              fadeStyle={fadeStyle(idx)}
            />
          );
        }
        const entry = item.entry;
        const key = entry.id != null ? `${entry.kind}-${entry.id}` : `${entry.shortCode ?? entry.kind}-${idx}`;
        return <EntryItem key={key} entry={entry} idx={idx} username={username} colors={colors} />;
      })}
    </ul>
  );
}

function EntryItem({
  entry,
  idx,
  username,
  colors,
  featured = false,
}: {
  entry: PublicProfileEntry;
  idx: number;
  username: string;
  colors: ThemeColors;
  featured?: boolean;
}) {
  const style = fadeStyle(idx);
  if (entry.kind === "DIVIDER") return <DividerEntry colors={colors} fadeStyle={style} />;
  if (entry.kind === "TEXT") return <TextEntry content={entry.content ?? ""} colors={colors} fadeStyle={style} />;
  if (entry.kind === "IMAGE" && entry.content)
    return <ImageEntryCard url={entry.content} colors={colors} fadeStyle={style} />;
  if (entry.kind === "EMBED" && entry.content)
    return <EmbedEntryCard url={entry.content} colors={colors} fadeStyle={style} />;
  if (entry.kind === "EMAIL_FORM" && entry.id != null && entry.content)
    return <EmailFormEntryCard id={entry.id} content={entry.content} colors={colors} fadeStyle={style} />;
  if (entry.kind === "CONTACT_CARD" && entry.content)
    return <ContactCardEntry content={entry.content} colors={colors} fadeStyle={style} />;
  if (entry.kind === "GALLERY" && entry.content)
    return <GalleryEntryCard content={entry.content} colors={colors} fadeStyle={style} />;
  if (entry.kind === "PRODUCT_CARD" && entry.content)
    return <ProductCardEntry content={entry.content} colors={colors} fadeStyle={style} featured={featured} />;
  if (entry.kind === "BOOKING" && entry.content)
    return <BookingEntryCard content={entry.content} colors={colors} fadeStyle={style} />;
  if (entry.kind === "EVENT" && entry.id != null && entry.content)
    return <EventEntryCard id={entry.id} content={entry.content} colors={colors} fadeStyle={style} featured={featured} />;
  if (entry.kind === "PLACE" && entry.content)
    return <PlaceEntry content={entry.content} colors={colors} fadeStyle={style} />;
  if (entry.kind === "LINK")
    return <LinkEntryCard entry={entry} username={username} colors={colors} fadeStyle={style} />;
  return null;
}
