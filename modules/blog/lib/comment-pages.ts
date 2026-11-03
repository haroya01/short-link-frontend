import type { CommentView } from "@/modules/blog/api/comments";

export function freshComments(current: CommentView[], incoming: CommentView[], atEnd: boolean): CommentView[] {
  const known = new Set(current.map((c) => c.id));
  const knownTops = current.filter((c) => c.parentId == null).map((c) => c.id);
  const lastTop = Math.max(0, ...knownTops);
  const unique = incoming.filter((c, index) => !known.has(c.id) && incoming.findIndex((x) => x.id === c.id) === index);
  const tops = unique.filter((c) => c.parentId == null && (atEnd || c.id < lastTop));
  const parents = new Set([...knownTops, ...tops.map((c) => c.id)]);
  const replies = unique.filter((c) => c.parentId != null && parents.has(c.parentId));
  return [...tops, ...replies].sort((a, b) => a.id - b.id);
}

export function newestCommentId(comments: CommentView[]): string {
  return String(Math.max(0, ...comments.map((c) => c.id)));
}
