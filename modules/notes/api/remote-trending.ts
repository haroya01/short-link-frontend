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
 *  A trending cursor starting with "r" pages the notes from elsewhere this server keeps (members only). */
export interface RemoteNotesBody {
  items: TrendingNote[] | Note[];
  next?: string | null;
}

export type RemoteNotesPage =
  | { kind: "pool"; items: TrendingNote[]; next: string | null }
  | { kind: "kept"; items: Note[]; next: string | null };

export type RemoteView = "trending" | "latest";

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
  const items = Array.isArray(body?.items) ? body.items : [];
  const next = typeof body?.next === "string" && body.next !== "" ? body.next : null;
  return view === "trending" && cursor?.startsWith("r")
    ? { kind: "kept", items: items as Note[], next }
    : { kind: "pool", items: items as TrendingNote[], next };
}
