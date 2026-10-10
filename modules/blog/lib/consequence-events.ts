"use client";

import type { Note } from "@/modules/notes/api/notes";

/**
 * Cross-tree "a mutation happened, refresh what depends on it" signals — the same window CustomEvent
 * bus `auth:change` uses, for consequences that cross component trees a callback prop can't reach.
 *
 * A ConnectSheet opened from the post page isn't inside the feed's BelongingProvider; a follow button
 * in a post header can't hand state to a following feed on another route. So the mutator dispatches a
 * window event and whoever cares subscribes — no shared parent required. No-ops on the server.
 */

/** A post was connected into / disconnected from a collection — its feed "속함" membership is now stale. */
export function emitBelongingChanged(postId: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ postId: number }>("kurl:belonging-changed", { detail: { postId } }));
}

export function onBelongingChanged(handler: (postId: number) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => handler((e as CustomEvent<{ postId: number }>).detail.postId);
  window.addEventListener("kurl:belonging-changed", listener);
  return () => window.removeEventListener("kurl:belonging-changed", listener);
}

/** The viewer followed / unfollowed someone — the following feed's contents may have changed. */
export function emitFollowChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kurl:follow-changed"));
}

export function onFollowChanged(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = () => handler();
  window.addEventListener("kurl:follow-changed", listener);
  return () => window.removeEventListener("kurl:follow-changed", listener);
}

export function emitNotePosted(note: Note) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ note: Note }>("kurl:note-posted", { detail: { note } }));
}

export function onNotePosted(handler: (note: Note) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => handler((e as CustomEvent<{ note: Note }>).detail.note);
  window.addEventListener("kurl:note-posted", listener);
  return () => window.removeEventListener("kurl:note-posted", listener);
}

/** A note quoting a post was just posted — the post's "notes" tab can show it without a refetch. */
export function emitPostQuoted(postId: number, note: Note) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ postId: number; note: Note }>("kurl:post-quoted", { detail: { postId, note } }));
}

export function onPostQuoted(handler: (postId: number, note: Note) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    const { postId, note } = (e as CustomEvent<{ postId: number; note: Note }>).detail;
    handler(postId, note);
  };
  window.addEventListener("kurl:post-quoted", listener);
  return () => window.removeEventListener("kurl:post-quoted", listener);
}
