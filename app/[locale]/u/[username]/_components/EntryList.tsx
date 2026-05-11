import type { CSSProperties } from "react";
import type { PublicProfileEntry } from "@/types";
import type { ThemeColors } from "../_lib/theme";
import { DividerEntry } from "./DividerEntry";
import { EmbedEntryCard } from "./EmbedEntryCard";
import { ImageEntryCard } from "./ImageEntryCard";
import { LinkEntryCard } from "./LinkEntryCard";
import { TextEntryHeader } from "./TextEntryHeader";

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

/**
 * Maps each backend entry to its rendering component by {@code kind}. Anything unrecognized falls
 * through silently — defensive against the API gaining new kinds before the front catches up.
 */
export function EntryList({ entries, username, colors, emptyLabel }: Props) {
  if (entries.length === 0) {
    return (
      <ul className="mt-8 space-y-2.5">
        <li
          className={`rounded-xl border border-dashed ${colors.cardBorder} p-6 text-center text-xs ${colors.muted}`}
        >
          {emptyLabel}
        </li>
      </ul>
    );
  }

  return (
    <ul className="mt-8 space-y-2.5">
      {entries.map((entry, idx) => {
        const key = entry.id != null ? `${entry.kind}-${entry.id}` : `${entry.kind}-${idx}`;
        const style = fadeStyle(idx);
        if (entry.kind === "DIVIDER")
          return <DividerEntry key={key} colors={colors} fadeStyle={style} />;
        if (entry.kind === "TEXT")
          return (
            <TextEntryHeader
              key={key}
              content={entry.content ?? ""}
              colors={colors}
              fadeStyle={style}
            />
          );
        if (entry.kind === "IMAGE" && entry.content)
          return (
            <ImageEntryCard key={key} url={entry.content} colors={colors} fadeStyle={style} />
          );
        if (entry.kind === "EMBED" && entry.content)
          return (
            <EmbedEntryCard key={key} url={entry.content} colors={colors} fadeStyle={style} />
          );
        if (entry.kind === "LINK")
          return (
            <LinkEntryCard
              key={entry.shortCode ?? key}
              entry={entry}
              username={username}
              colors={colors}
              fadeStyle={style}
            />
          );
        return null;
      })}
    </ul>
  );
}
