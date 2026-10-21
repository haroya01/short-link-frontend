import { mockFailure, request } from "@/lib/api/client";
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
 *  An item with an id is a note this server keeps; one without is still in the pool. `next` is opaque. */
export interface RemoteNotesBody {
  items: (TrendingNote | Note)[];
  next?: string | null;
}

export type RemoteItem = { kind: "pool"; item: TrendingNote } | { kind: "kept"; note: Note };

export interface RemoteNotesPage {
  items: RemoteItem[];
  next: string | null;
}

export type RemoteView = "trending" | "latest";

export function decodeRemoteItems(raw: unknown): RemoteItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): RemoteItem[] => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as TrendingNote | Note;
    if (item.id != null) return [{ kind: "kept", note: item as Note }];
    return typeof (item as TrendingNote).uri === "string" ? [{ kind: "pool", item: item as TrendingNote }] : [];
  });
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
    : await request<RemoteNotesBody>(`/api/v1/federation/${view}?${query(cursor, limit)}`, { method: "GET" });
  const next = typeof body?.next === "string" && body.next !== "" ? body.next : null;
  return { items: decodeRemoteItems(body?.items), next };
}
