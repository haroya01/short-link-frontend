import { getTranslations } from "next-intl/server";
import { FolderOpen } from "lucide-react";
import { isOrdered, listPublicPostCollections, type CollectionSummary } from "@/modules/blog/api/collections";
import { blogPath } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { END_SECTION } from "@/modules/blog/components/end-section";
import { RailHeading } from "@/modules/blog/components/rail-heading";

export async function PostCollections({ postId }: { postId: number }) {
  const collections = await listPublicPostCollections(postId).catch(() => []);
  if (collections.length === 0) return null;

  const t = await getTranslations("collections");

  return (
    <section className={END_SECTION}>
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
