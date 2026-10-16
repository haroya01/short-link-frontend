import { ArticleBlocks, LinkPreviewView, type ArticleEmbeds } from "@/modules/blog/components/article-blocks";
import { fetchNoteThread } from "@/modules/notes/api/notes";
import { QuotedNoteCard } from "@/modules/notes/components/quoted-note-card";
import { getLinkPreview, type PublicPostBlock } from "@/modules/blog/api/public-posts";

export { extractHeadings, readingMinutes } from "@/modules/blog/components/article-blocks";

/**
 * Renders the ordered post blocks as a long-form article body. Each block becomes a discrete
 * semantic element under `.prose-post` (see globals.css) which carries the editorial typography.
 * Server component — no client state; the only interactive bits are plain anchors.
 */
export function ArticleBody(props: { blocks: PublicPostBlock[]; postId?: number; className?: string }) {
  return <ArticleBlocks {...props} embeds={SERVER_EMBEDS} />;
}

/** A kurl note carried in the post. Fetched as an anonymous reader, so a note only its author's
 *  followers may see — or one since deleted — falls back to a plain link card. */
async function NoteEmbed({ id, url }: { id: number; url: string }) {
  const res = await fetchNoteThread(id);
  if (!res.ok) return <LinkPreviewCard url={url} />;
  return (
    <div className="my-8 [&_*]:!no-underline" data-note-embed={id}>
      <QuotedNoteCard note={res.data.note} full />
    </div>
  );
}

/**
 * Rich link card — fetches the target's Open Graph (server-side, cached) and draws a velog-style
 * card: title + description on the left, thumbnail on the right, domain footer. Falls back to a bare
 * domain row when the target exposes no OG (or the fetch fails), so a link always renders something.
 */
async function LinkPreviewCard({ url }: { url: string }) {
  const res = await getLinkPreview(url);
  return <LinkPreviewView url={url} data={res.ok ? res.data : null} />;
}

const SERVER_EMBEDS: ArticleEmbeds = { LinkPreview: LinkPreviewCard, Note: NoteEmbed };
