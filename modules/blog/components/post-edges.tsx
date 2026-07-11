import { getTranslations } from "next-intl/server";
import { CornerDownRight, Globe, Link as LinkIcon, Lock } from "lucide-react";
import {
  listKindredCurators,
  listPublicPostCollections,
  listRelatedBlocks,
  type CollectionSummary,
} from "@/modules/blog/api/collections";
import { blogPath } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { ConnectionBlock } from "@/modules/blog/components/connection-block";
import { KindredCurators } from "@/modules/blog/components/kindred-curators";

/**
 * PostEdges — the end of an article, turned from a dead end into a fork in the graph. After the body
 * (and its highlight threads), a reader sees the edges the *whole post* sits on: the paths it's woven
 * into, what curators placed alongside it, and the people who wove it. So you leave a post by
 * following an edge, not just by "next post" chronology.
 *
 * This is the same connection graph the highlight sheet already surfaces, but pulled up from the
 * SENTENCE unit to the POST unit and shown inline at the foot of every article (no sheet to open).
 * Every group reuses an existing surface — collection rows mirror the highlight sheet's "이 문장이
 * 속한 길", related blocks reuse {@link ConnectionBlock}, kindred curators reuse {@link KindredCurators}.
 *
 * Quiet by construction (§10): one green thread (path arrow, highlight rule), hairline list rhythm,
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
  const [collections, related, kindred] = await Promise.all([
    listPublicPostCollections(postId),
    listRelatedBlocks("POST", postId),
    listKindredCurators(authorUsername),
  ]);

  // No edges yet → no section (the tag-based RelatedPosts fallback carries the "read next").
  if (collections.length === 0 && related.length === 0 && kindred.length === 0) {
    return null;
  }

  const t = await getTranslations("collections");

  return (
    <section className="mt-12 border-t border-slate-100 pt-8 dark:border-slate-800/80">
      {collections.length > 0 && (
        <div>
          <EdgeHeading>{t("postEdgesPathsTitle")}</EdgeHeading>
          <ul className="mt-3 space-y-1">
            {collections.map((c) => (
              <li key={c.id}>
                <BlogLink
                  href={blogPath(`/collections/${c.id}`)}
                  className="focus-ring flex items-center gap-2 rounded-lg px-1 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ContainingGlyph kind={c.kind} visibility={c.visibility} />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-slate-800 dark:text-slate-200">
                    {c.title}
                  </span>
                  <span className="shrink-0 text-[12px] text-slate-400 dark:text-slate-500">
                    {c.count}
                  </span>
                </BlogLink>
              </li>
            ))}
          </ul>
        </div>
      )}

      {related.length > 0 && (
        <div className={collections.length > 0 ? "mt-8" : undefined}>
          <EdgeHeading>{t("postEdgesRelatedTitle")}</EdgeHeading>
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

/** The quiet eyebrow that heads each edge group — same voice as the highlight sheet's path labels. */
function EdgeHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      <span aria-hidden className="h-3 w-[3px] shrink-0 rounded-full bg-accent-600 dark:bg-accent-500" />
      {children}
    </p>
  );
}

/** A collection row's glyph — a path reads with the green path arrow, a themed bundle with its
 *  visibility mark. Mirrors the highlight sheet's ContainingGlyph so both surfaces read identically. */
function ContainingGlyph({
  kind,
  visibility,
}: {
  kind: CollectionSummary["kind"];
  visibility: CollectionSummary["visibility"];
}) {
  if (kind === "PATH") {
    return <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-accent-600 dark:text-accent-500" />;
  }
  const cls = "h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500";
  if (visibility === "PUBLIC") return <Globe className={cls} />;
  if (visibility === "UNLISTED") return <LinkIcon className={cls} />;
  return <Lock className={cls} />;
}
