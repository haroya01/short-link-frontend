import type { PostAudience } from "@/modules/blog/lib/post-audience";
import type { NoteRoom, NoteVisibility } from "@/modules/notes/api/notes";

export function isShareable(visibility: NoteVisibility | undefined): boolean {
  return visibility === undefined || visibility === "public" || visibility === "unlisted";
}

type InRoom = { room?: NoteRoom | null };
type WalledNote = InRoom & { visibility?: NoteVisibility };
type WalledPost = InRoom & { audience?: PostAudience | null };

/** The room a quote of this must be posted in; null leaves the destination to the writer. */
export function quoteRoom(quoted: InRoom): NoteRoom | null {
  return quoted.room ?? null;
}

/** Mirrors the server: a room's note goes only into that room, a note anyone may see goes anywhere.
 *  `roomId` is where it would be carried: the quoting note's room or the embedding post's room, null outside rooms. */
export function noteQuotableIn(note: WalledNote, roomId: number | null): boolean {
  if (note.room) return note.room.id === roomId;
  return isShareable(note.visibility);
}

/** A quote is listed and counted on what it quotes only at the same boundary: a public quote on
 *  something outside rooms (`quotedRoomId` null), a room's quote on something of that room. */
export function quoteListedOn(quoting: WalledNote, quotedRoomId: number | null): boolean {
  if (quotedRoomId === null) return !quoting.room && isShareable(quoting.visibility);
  return quoting.room?.id === quotedRoomId;
}

export function postQuotableIn(post: WalledPost, roomId: number | null): boolean {
  if (post.room) return post.room.id === roomId;
  const audience = post.audience ?? "PUBLIC";
  return audience === "PUBLIC" || audience === "FOLLOWERS" || audience === "PASSWORD";
}

/** Whether the server would take any quote of this post: one posted in its room for a room's post,
 *  one posted anywhere for an open post, none for a link-only post. */
export function postQuotable(post: WalledPost): boolean {
  return postQuotableIn(post, post.room?.id ?? null);
}
