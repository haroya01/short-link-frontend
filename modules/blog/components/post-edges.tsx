import { getTranslations } from "next-intl/server";
import { FolderOpen } from "lucide-react";
import {
  isOrdered,
  listKindredCurators,
  listPublicPostCollections,
  listRelatedBlocks,
  type CollectionSummary,
} from "@/modules/blog/api/collections";
import { blogPath } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { END_SECTION } from "@/modules/blog/components/end-section";
import { ConnectionBlock } from "@/modules/blog/components/connection-block";
import { KindredCurators } from "@/modules/blog/components/kindred-curators";
import { RailHeading } from "@/modules/blog/components/rail-heading";

/**
 * PostEdges — the end of an article, turned from a dead end into a fork in the graph. After the body
 * (and its highlight threads), a reader sees the edges the *whole post* sits on: the collections it's
 * woven into, what curators placed alongside it, and the people who wove it. So you leave a post by
 * following an edge, not just by "next post" chronology.
 *
 * This is the same connection graph the highlight sheet already surfaces, but pulled up from the
 * SENTENCE unit to the POST unit and shown inline at the foot of every article (no sheet to open).
 * Every group reuses an existing surface — collection rows mirror the highlight sheet's "이 문장이
 * 담긴 컬렉션", related blocks reuse {@link ConnectionBlock}, kindred curators reuse {@link KindredCurators}.
 *
 * Quiet by construction (§10): one green thread (step badge, highlight rule), hairline list rhythm,
 * no node-graph drawing. If a post sits on no edge yet, the whole section renders nothing — the
 * tag-based RelatedPosts below stays as the fallback, so there's never a dead end and never an empty
 * shell. Server component: the three public reads run in parallel at render time.
 */
export async function PostEdges({
  postId,
  authorUsername,
  locale,
}: {
  postId: number;
  authorUsername: string;
  locale: string;
}) {
  // A transient network error on any one read degrades that edge group to empty — a foot-of-article
  // section must never throw the whole post page to the error boundary (mirrors the try/catch these
  // reads already carry internally).
  const [collections, related, kindred] = await Promise.all([
    listPublicPostCollections(postId).catch(() => []),
    listRelatedBlocks("POST", postId).catch(() => []),
    listKindredCurators(authorUsername).catch(() => []),
  ]);

  // No edges yet → no section (the tag-based RelatedPosts fallback carries the "read next").
  if (collections.length === 0 && related.length === 0 && kindred.length === 0) {
    return null;
  }

  const t = await getTranslations("collections");

  return (
    <section className={END_SECTION}>
      {collections.length > 0 && (
        <div>
          <RailHeading>{t("postEdgesPathsTitle")}</RailHeading>
          <ul className="mt-3 space-y-0.5">
            {collections.map((c) => (
              <li key={c.id}>
                <PathRow
                  collection={c}
                  positionLabel={pathPositionLabel(c, t)}
                  countLabel={t("itemCount", { count: c.count })}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {related.length > 0 && (
        <div className={collections.length > 0 ? "mt-8" : undefined}>
          <RailHeading>{t("postEdgesRelatedTitle")}</RailHeading>
          <ul className="mt-3 space-y-3">
            {related.map((b) => (
              <li key={`${b.blockType}-${b.refId}`}>
                <ConnectionBlock block={b} locale={locale} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {kindred.length > 0 && (
        <div className={collections.length > 0 || related.length > 0 ? "-mt-4" : undefined}>
          {/* KindredCurators carries its own hairline + heading; it renders nothing when empty. */}
          <KindredCurators
            curators={kindred}
            locale={locale}
            title={t("postEdgesCuratorsTitle")}
            sharedLabel={(count) => t("sharedItems", { count })}
          />
        </div>
      )}
    </section>
  );
}

/**
 * One "이 글이 담긴 컬렉션" row. Every row carries the same collection glyph; an ordered collection that
 * knows where this post sits (backend #607 position) swaps it for the step number, the same node the
 * collection's own walk draws. The meta line names the curator and either "N편 중 M번째" (ordered, with a
 * position) or the labelled item count — never a bare number.
 */
function PathRow({
  collection: c,
  positionLabel,
  countLabel,
}: {
  collection: CollectionSummary;
  positionLabel: string | null;
  countLabel: string;
}) {
  return (
    <BlogLink
      href={blogPath(`/collections/${c.id}`)}
      className="focus-ring flex items-center gap-2.5 rounded-surface px-1 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
      data-bhv="connection"
      data-bhv-id={String(c.id)}
    >
      <span aria-hidden className="grid w-6 shrink-0 place-items-center">
        {positionLabel !== null && typeof c.position === "number" ? (
          <span
            data-step-badge
            className="grid h-5 min-w-5 place-items-center rounded-full border border-accent-600 px-1 text-[11px] font-semibold tabular-nums text-accent-700 dark:border-accent-500 dark:text-accent-400"
          >
            {c.position}
          </span>
        ) : (
          <FolderOpen className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] text-slate-800 dark:text-slate-200">
          {c.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
          {c.curatorUsername && (
            <>
              <span className="truncate">@{c.curatorUsername}</span>
              <span aria-hidden className="text-slate-300 dark:text-slate-600">
                ·
              </span>
            </>
          )}
          <span className="shrink-0">{positionLabel ?? countLabel}</span>
        </span>
      </span>
    </BlogLink>
  );
}

/** "N편 중 M번째" — this post's step within an ordered collection — or null when the collection isn't
 *  ordered or the endpoint didn't send `position` (list surfaces). The denominator is `total` when
 *  present, else `count` (backend `CollectionSummaryView` sends `count`, not a separate `total`). */
function pathPositionLabel(
  c: CollectionSummary,
  t: (key: string, values?: Record<string, string | number>) => string,
): string | null {
  if (!isOrdered(c) || typeof c.position !== "number") return null;
  const total = c.total ?? c.count;
  return t("postEdgesPathPosition", { position: c.position, total });
}
