import { mockFailure, readToken, request } from "@/lib/api/client";
import { DEVICE_HEADER, viewerHeaders } from "@/lib/device-id";
import type { Note, NoteAuthor } from "./notes";

const noteMocks: typeof import("./_mocks") | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("./_mocks") : null;

export const REMOTE_TRENDING_LIMIT = 20;

export interface TrendingNote extends Omit<Note, "id" | "author"> {
  id: null;
  author: Omit<NoteAuthor, "id"> & { id: number | null; remoteId: number | null };
  uri: string;
  url: string;
  sourceHost: string;
  servers: string[];
}

/** Backend contract: GET /api/v1/federation/trending and /federation/latest ?limit=&cursor= (anonymous allowed).
 *  An item with an id is a note this server keeps; one without is still in the pool. `next` is opaque.
 *  Latest puts what the viewer has not seen first; `seenFrom` is the index where the seen ones start,
 *  sent only on the page where they begin. */
export interface RemoteNotesBody {
  items: (TrendingNote | (Note & { uri?: string | null }))[];
  next?: string | null;
  seenFrom?: number | null;
}

export type RemoteItem = { kind: "pool"; item: TrendingNote } | { kind: "kept"; note: Note; uri?: string };

export interface RemoteNotesPage {
  items: RemoteItem[];
  next: string | null;
  seenFrom?: number;
}

export type RemoteView = "trending" | "latest";

function decodeRemoteItem(entry: unknown): RemoteItem | null {
  if (!entry || typeof entry !== "object") return null;
  const item = entry as TrendingNote | Note;
  if (item.id != null) {
    const uri = (item as { uri?: unknown }).uri;
    if (typeof uri === "string" && uri !== "") return { kind: "kept", note: item as Note, uri };
    return { kind: "kept", note: item as Note };
  }
  return typeof (item as TrendingNote).uri === "string" ? { kind: "pool", item: item as TrendingNote } : null;
}

export function decodeRemoteItems(raw: unknown): RemoteItem[] {
  return decodeRemotePage(raw, undefined).items;
}

function decodeRemotePage(raw: unknown, seenFrom: unknown): { items: RemoteItem[]; seenFrom?: number } {
  if (!Array.isArray(raw)) return { items: [] };
  const from = typeof seenFrom === "number" && Number.isInteger(seenFrom) && seenFrom >= 0 ? seenFrom : null;
  const items: RemoteItem[] = [];
  let start: number | undefined;
  raw.forEach((entry, index) => {
    if (index === from) start = items.length;
    const item = decodeRemoteItem(entry);
    if (item) items.push(item);
  });
  if (from !== null && from >= raw.length) start = items.length;
  return start === undefined ? { items } : { items, seenFrom: start };
}

function query(cursor: string | null, limit: number) {
  return cursor ? `limit=${limit}&cursor=${encodeURIComponent(cursor)}` : `limit=${limit}`;
}

export async function listRemoteNotes(
  view: RemoteView,
  cursor: string | null = null,
  limit = REMOTE_TRENDING_LIMIT,
): Promise<RemoteNotesPage> {
  const body = noteMocks
    ? await (mockFailure(`remote-${view}`) ?? noteMocks.mockRemoteNotes(view, cursor, limit))
    : await request<RemoteNotesBody>(`/api/v1/federation/${view}?${query(cursor, limit)}`, {
        method: "GET",
        headers: view === "latest" ? viewerHeaders() : undefined,
      });
  const next = typeof body?.next === "string" && body.next !== "" ? body.next : null;
  return { ...decodeRemotePage(body?.items, body?.seenFrom), next };
}

export async function sendRemoteSeen(uris: string[], keepalive = false): Promise<void> {
  if (noteMocks) return;
  const headers = viewerHeaders();
  if (!readToken() && !headers[DEVICE_HEADER]) return;
  await request<void>("/api/v1/federation/seen", { method: "POST", body: { uris }, headers, keepalive });
}
