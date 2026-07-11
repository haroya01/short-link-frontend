"use client";

import { useTranslations } from "next-intl";
import { CornerDownRight, Layers } from "lucide-react";
import { blogPath } from "@/lib/host";
import { useInView } from "@/lib/animations";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { usePostBelonging } from "@/modules/blog/components/post-belonging-context";

/**
 * "속함" 한 올 — the quietest thread: every post is a knot in the graph. Under a feed card's meta, one
 * micro line naming the first PUBLIC collection this post is connected into ("'느린 사고' 외 N개
 * 컬렉션에 속함"). Taps through to that collection (a graph channel).
 *
 * Legibility rules honored:
 *  - If the post belongs to no public collection, the line does NOT render at all (no placeholder).
 *  - LAZY: the card registers its id only once it scrolls into view ({@link useInView}) — never on
 *    mount, so an off-screen feed card costs nothing.
 *  - BATCHED: the id goes to the surrounding {@link BelongingProvider}, which resolves a whole
 *    viewport-worth of visible cards in ONE request (no per-card fetch, no N+1). Outside a provider
 *    the line simply stays hidden.
 *  - The green is a single thread: the path glyph / layers icon is the non-text 600 marker; the text
 *    itself stays slate (chrome), so this never becomes a green wall.
 */
export function PostBelongingLine({
  postId,
  over = false,
}: {
  postId: number;
  /** Card variant renders over a dark cover photo — flip the tone to light. */
  over?: boolean;
}) {
  const t = useTranslations("collections");
  const { ref, seen } = useInView(0.1);
  const collections = usePostBelonging(postId, seen);

  // Reserve nothing until we know: the observed node is a zero-height div, so a post with no
  // collections leaves the card meta untouched (no reflow, no placeholder). The div carries the
  // IntersectionObserver ref so the id registers on scroll-in, and stays mounted either way.
  if (!collections || collections.length === 0) {
    return <div ref={ref} aria-hidden className="h-0 w-0" />;
  }

  const first = collections[0];
  const rest = collections.length - 1;
  // The curator's handle isn't on CollectionSummary — the line reads "'{title}'에 속함" / "외 N개…".
  const label =
    rest > 0
      ? t("belongsToRest", { title: first.title, count: rest })
      : t("belongsToJust", { title: first.title });
  const isPath = first.kind === "PATH";
  const tone = over
    ? "text-white/80 hover:text-white"
    : "text-slate-500 hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-300";

  return (
    <div ref={ref}>
      <BlogLink
        href={blogPath(`/collections/${first.id}`)}
        className={`focus-ring pointer-events-auto -mx-1 -my-1 inline-flex max-w-full items-center gap-1 rounded px-1 py-1 text-[11px] transition-colors ${tone}`}
      >
        {isPath ? (
          <CornerDownRight className={`h-3 w-3 shrink-0 ${over ? "" : "text-accent-600"}`} />
        ) : (
          <Layers className={`h-3 w-3 shrink-0 ${over ? "" : "text-accent-600"}`} />
        )}
        <span className="truncate">{label}</span>
      </BlogLink>
    </div>
  );
}
