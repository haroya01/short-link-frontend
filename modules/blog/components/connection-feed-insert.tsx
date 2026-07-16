import type { CSSProperties } from "react";
import type { ConnectionEvent } from "@/modules/blog/api/collections";
import { ConnectionEventCard } from "@/modules/blog/components/discover-connections";
import { RailHeading } from "@/modules/blog/components/rail-heading";

/**
 * A public connection event woven into the discovery feed — the "지금 이어지는 것들" thread. NOT a tile:
 * a quiet list row (bordered top+bottom by the surrounding {@link FeedInfinite} cell) so a connection
 * reads as something to *read*, not to scan — the same list rhythm as the authed 연결 발견 surface.
 *
 * The `lead` insert carries the section label (RailHeading, one green tick); later inserts are just the
 * row, so the thread names itself once rather than shouting on every card. Signed-out visitors see it
 * too — this is the graph's first-touch surface. `profile-fade` gives the row the same one-breath
 * stagger as the discovery feed (reduced-motion guarded in globals).
 */
export function ConnectionFeedInsert({
  event,
  locale,
  lead = false,
  idx = 0,
  label,
}: {
  event: ConnectionEvent;
  locale: string;
  /** First insert on the screen — shows the section label above the row. */
  lead?: boolean;
  /** Stagger index for the profile-fade entrance. */
  idx?: number;
  /** Localized "지금 이어지는 것들" — passed in (server-fetched i18n) so this stays a leaf. */
  label: string;
}) {
  return (
    <div
      className="profile-fade rounded-card-lg border border-slate-200/80 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900"
      style={{ "--idx": idx } as CSSProperties}
    >
      {lead && <RailHeading className="mb-2.5">{label}</RailHeading>}
      <ConnectionEventCard event={event} locale={locale} />
    </div>
  );
}
