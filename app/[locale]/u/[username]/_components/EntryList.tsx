import type { PublicProfileEntry } from "@/types";
import type { ThemeColors } from "../_lib/theme";
import { DividerEntry } from "./DividerEntry";
import { ImageEntryCard } from "./ImageEntryCard";
import { LinkEntryCard } from "./LinkEntryCard";
import { TextEntryHeader } from "./TextEntryHeader";

type Props = {
  entries: PublicProfileEntry[];
  username: string;
  colors: ThemeColors;
  emptyLabel: string;
};

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
        if (entry.kind === "DIVIDER") return <DividerEntry key={key} colors={colors} />;
        if (entry.kind === "TEXT")
          return <TextEntryHeader key={key} content={entry.content ?? ""} colors={colors} />;
        if (entry.kind === "IMAGE" && entry.content)
          return <ImageEntryCard key={key} url={entry.content} colors={colors} />;
        if (entry.kind === "LINK")
          return (
            <LinkEntryCard
              key={entry.shortCode ?? key}
              entry={entry}
              username={username}
              colors={colors}
            />
          );
        return null;
      })}
    </ul>
  );
}
