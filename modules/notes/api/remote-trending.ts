import { mockFailure, request } from "@/lib/api/client";
import type { Note, NoteAuthor } from "./notes";

const noteMocks: typeof import("./_mocks") | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("./_mocks") : null;

export const REMOTE_TRENDING_LIMIT = 20;
export const REMOTE_TRENDING_COLLAPSED = 5;

export interface TrendingNote extends Omit<Note, "id" | "author"> {
  id: null;
  author: Omit<NoteAuthor, "id"> & { id: number | null; remoteId: number | null };
  uri: string;
  url: string;
  sourceHost: string;
  servers: string[];
}

/** Backend contract: GET /api/v1/federation/trending?limit= (anonymous allowed). */
export interface RemoteTrendingBody {
  items: TrendingNote[];
}

export async function listRemoteTrending(limit = REMOTE_TRENDING_LIMIT): Promise<TrendingNote[]> {
  const body = noteMocks
    ? await (mockFailure("remote-trending") ?? noteMocks.mockRemoteTrending(limit))
    : await request<RemoteTrendingBody>(`/api/v1/federation/trending?limit=${limit}`, { method: "GET" });
  return Array.isArray(body?.items) ? body.items : [];
}
