"use client";

import { useEffect, useState } from "react";
import {
  ArticleBlocks,
  LinkPreviewSkeleton,
  LinkPreviewView,
  type ArticleEmbeds,
} from "@/modules/blog/components/article-blocks";
import { getLinkPreview, type LinkPreview, type PublicPostBlock } from "@/modules/blog/api/public-posts";
import { fetchNoteThread, type Note } from "@/modules/notes/api/notes";
import { QuotedNoteCard } from "@/modules/notes/components/quoted-note-card";
import { noteQuotableIn } from "@/modules/notes/lib/quote-wall";
import { useInsideRoom } from "@/modules/rooms/lib/room-scope";

function ClientLinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<LinkPreview | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    getLinkPreview(url).then((res) => {
      if (live) setData(res.ok ? res.data : null);
    });
    return () => {
      live = false;
    };
  }, [url]);
  if (data === undefined) return <LinkPreviewSkeleton />;
  return <LinkPreviewView url={url} data={data} />;
}

/** The browser reads with the reader's own token, so what they may read is not the test: every
 *  reader of one post gets the card or the link card by the note's and the post's room alone. */
function ClientNoteEmbed({ id, url }: { id: number; url: string }) {
  const roomId = useInsideRoom();
  const [note, setNote] = useState<Note | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    fetchNoteThread(id).then((res) => {
      if (live) setNote(res.ok ? res.data.note : null);
    });
    return () => {
      live = false;
    };
  }, [id]);
  if (note === undefined) return <LinkPreviewSkeleton />;
  if (note === null || !noteQuotableIn(note, roomId)) return <ClientLinkPreview url={url} />;
  return (
    <div className="my-8 [&_*]:!no-underline" data-note-embed={id}>
      <QuotedNoteCard note={note} full />
    </div>
  );
}

const CLIENT_EMBEDS: ArticleEmbeds = { LinkPreview: ClientLinkPreview, Note: ClientNoteEmbed };

export function ClientArticleBody(props: { blocks: PublicPostBlock[]; postId?: number; className?: string }) {
  return <ArticleBlocks {...props} embeds={CLIENT_EMBEDS} />;
}
