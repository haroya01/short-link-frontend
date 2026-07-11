/**
 * Collections (the reading connection graph) — the "A 척추" reading-path feature. Mirrors the backend
 * `CollectionController` (base `/api/v1`) and the kurl-ios `CollectionsAPI`.
 *
 * A collection groups connections (a post / highlight / note connected with an optional one-line
 * `why`). A PATH is an ordered collection read as a guided walk (sentence → why → sentence), not a
 * flat list. The discover feed surfaces curators' connections; the public-highlights endpoint backs
 * "이 문장이 속한 길" (which paths a sentence belongs to).
 */
import { request } from "@/lib/api/client";
import { USE_MOCKS } from "@/modules/blog/api/_mocks";
import {
  mockCollectionDetail,
  mockCollectionsContainingHighlight,
  mockConnect,
  mockCreateCollection,
  mockDiscoverConnections,
  mockMineCollections,
  mockPostCollections,
  mockPostCollectionsBatch,
  mockPublicConnectionFeed,
  mockReorderConnections,
} from "@/modules/blog/api/_mocks-collections";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export type CollectionVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";
/** COLLECTION = themed bundle · PATH = ordered reading path (read as a guided walk). */
export type CollectionKind = "COLLECTION" | "PATH";
export type ConnectionBlockType = "POST" | "HIGHLIGHT" | "NOTE";

/** A collection list row — title/blurb/visibility + count + a few recent item labels (no vanity
 *  metrics). Backend `CollectionSummaryView`.
 *
 *  The last four fields are the "membership" enrichment the post-collections endpoint
 *  (`/public/posts/{id}/collections`, single + batch) adds per row (backend #607): who wove this post
 *  into the collection, and where the post sits in it. They read a collection as *someone's path a post
 *  is on* ("@curator's '길' · N편 중 M번째"), not a bare category. Absent on the plain list surfaces
 *  (author-home collections, the highlight sheet) — those keep the `count` display. */
export interface CollectionSummary {
  id: number;
  title: string;
  description: string | null;
  visibility: CollectionVisibility;
  kind: CollectionKind;
  count: number;
  /** Recent item labels — "what's inside", to help decide where to file a new connection. */
  preview: string[];
  /** The curator who wove this post into the collection (post-collections responses only). */
  curatorUsername?: string | null;
  /** That curator's avatar (post-collections responses only). */
  curatorAvatarUrl?: string | null;
  /** This post's 1-based position within the collection/path (post-collections responses only). */
  position?: number | null;
  /** Total connections in the collection/path — the denominator for `position` (post-collections
   *  responses only; equals `count` but named to read as "M of N"). */
  total?: number | null;
}

/** One connection in a collection — a flat block payload (the backend folds post/highlight/note into
 *  one shape; only the fields for that `blockType` are populated). `why` = the curator's one line. */
export interface Connection {
  id: number;
  blockType: ConnectionBlockType;
  why: string | null;
  /** POST: title · HIGHLIGHT: source post title · NOTE: unused. */
  title: string | null;
  /** POST excerpt. */
  excerpt: string | null;
  /** POST / HIGHLIGHT source slug + username (for the deep-link to the source post). */
  slug: string | null;
  username: string | null;
  /** HIGHLIGHT quote. */
  quote: string | null;
  /** NOTE body. */
  body: string | null;
}

/** Collection detail — header + ordered connections. Backend `CollectionDetailView`. */
export interface CollectionDetail {
  id: number;
  title: string;
  description: string | null;
  visibility: CollectionVisibility;
  kind: CollectionKind;
  curatorUsername: string | null;
  connections: Connection[];
}

/** One event in the curator-connection discovery feed — who connected what, to which collection, why.
 *  Backend `DiscoverConnectionView` (flat block fields, like {@link Connection}). */
export interface ConnectionEvent {
  id: number;
  curator: { id: number; username: string; bio: string | null; avatarUrl: string | null };
  collectionId: number;
  collectionTitle: string;
  collectionKind: CollectionKind;
  why: string | null;
  connectedAt: string | null;
  blockType: ConnectionBlockType;
  title: string | null;
  excerpt: string | null;
  slug: string | null;
  username: string | null;
  quote: string | null;
  body: string | null;
}

export interface DiscoverFeed {
  items: ConnectionEvent[];
  hasNext: boolean;
  /** Present on the public (paged) feed; the authed follow-graph feed omits them. */
  page?: number;
  size?: number;
}

/** A block curated alongside another in the same PUBLIC collections — the "이것과 이어진 것" discovery
 *  hop. Same flat block shape as {@link Connection} (only the fields for `blockType` are set), plus
 *  `sharedCount` = how many public collections place the two together (the human co-occurrence weight).
 *  Backend `RelatedBlockView`. */
export interface RelatedBlock {
  blockType: ConnectionBlockType;
  refId: number;
  title: string | null;
  excerpt: string | null;
  slug: string | null;
  username: string | null;
  quote: string | null;
  body: string | null;
  sharedCount: number;
}

/** A curator whose taste overlaps — they wove some of the same blocks into their own public collections.
 *  `sharedItems` = how many blocks overlap. Connection by what-you-curate, not by follows. Backend
 *  `KindredCuratorView`. */
export interface KindredCurator {
  curator: { id: number; username: string; bio: string | null; avatarUrl: string | null };
  sharedItems: number;
}

export interface NewCollection {
  title: string;
  description?: string | null;
  visibility: CollectionVisibility;
  kind: CollectionKind;
}

/** Authenticated — my collections (most recently touched first). */
export function listMyCollections(): Promise<CollectionSummary[]> {
  if (USE_MOCKS) return Promise.resolve(mockMineCollections());
  return request<CollectionSummary[]>("/api/v1/users/me/collections", { method: "GET" });
}

/** A curator's PUBLIC collections/paths — backs the author home "컬렉션" tab. Public (readable
 *  signed-out), so a raw fetch (no auth); a missing/empty handle just yields []. */
export async function listPublicCollectionsByUsername(
  username: string,
): Promise<CollectionSummary[]> {
  if (USE_MOCKS) {
    return Promise.resolve(mockMineCollections().filter((c) => c.visibility === "PUBLIC"));
  }
  const res = await fetch(
    `${API_BASE}/api/v1/public/profiles/${encodeURIComponent(username)}/collections`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  return (await res.json()) as CollectionSummary[];
}

/** Collection detail — connected blocks resolved (ordered). Public collections are readable signed-out;
 *  private ones need ownership (the backend enforces it). */
export async function getCollection(id: number): Promise<CollectionDetail | null> {
  if (USE_MOCKS) return Promise.resolve(mockCollectionDetail(id));
  const res = await fetch(`${API_BASE}/api/v1/collections/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as CollectionDetail;
}

/** Discover — connection flow of curators the viewer follows (newest first). Empty when following 0. */
export function listDiscoverConnections(): Promise<DiscoverFeed> {
  if (USE_MOCKS) return Promise.resolve(mockDiscoverConnections());
  return request<DiscoverFeed>("/api/v1/feed/connections", { method: "GET" });
}

/**
 * Public — the GLOBAL, non-personalized connection stream (newest first): who connected what, to
 * which public collection/path, and why. Same {@link ConnectionEvent} shape as the authed follow-graph
 * feed, so the same cards render it. Readable signed-out (the `/api/v1/public/**` slice is permitAll),
 * so a raw fetch (no auth). A backend/empty response degrades to an empty page, never throws — the
 * feed just shows no connection rows.
 */
export async function listPublicConnectionFeed(page = 0, size = 12): Promise<DiscoverFeed> {
  if (USE_MOCKS) return Promise.resolve(mockPublicConnectionFeed(page, size));
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/public/feed/connections?page=${page}&size=${size}`,
      { cache: "no-store" },
    );
    if (!res.ok) return { items: [], hasNext: false, page, size };
    return (await res.json()) as DiscoverFeed;
  } catch {
    return { items: [], hasNext: false, page, size };
  }
}

/** Public — which PUBLIC collections/paths a post is connected into (most recently touched first).
 *  Backs the feed card's "속함" line. Readable signed-out; a missing post just yields []. */
export async function listPublicPostCollections(postId: number): Promise<CollectionSummary[]> {
  if (USE_MOCKS) return Promise.resolve(mockPostCollections(postId));
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/posts/${postId}/collections`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as CollectionSummary[];
  } catch {
    return [];
  }
}

/** One post's public-collection membership, keyed by post — the batch shape. Backend `PostCollectionsView`.
 *  `collections` is `[]` for a post that belongs to no PUBLIC collection (or doesn't exist). */
export interface PostCollectionsView {
  postId: number;
  collections: CollectionSummary[];
}

/** Server caps `ids` at 50 per request; we chunk to stay under it. */
const POST_COLLECTIONS_BATCH_CAP = 50;

/**
 * Public — resolve the "속함" membership for MANY posts in one round-trip (the feed batch that replaces
 * the per-card N+1). `GET /api/v1/public/posts/collections?ids=5,6,7` → one {@link PostCollectionsView}
 * per requested id, order preserved, `collections:[]` for posts with no public collection. Readable
 * signed-out (permitAll slice) so a raw fetch. Chunked at {@link POST_COLLECTIONS_BATCH_CAP}; a failed
 * chunk degrades to empty membership for its ids (the belonging line simply doesn't render), never throws.
 */
export async function listPublicPostCollectionsBatch(
  ids: number[],
): Promise<PostCollectionsView[]> {
  const unique = Array.from(new Set(ids.filter((id) => Number.isFinite(id))));
  if (unique.length === 0) return [];
  if (USE_MOCKS) return Promise.resolve(mockPostCollectionsBatch(unique));

  const chunks: number[][] = [];
  for (let i = 0; i < unique.length; i += POST_COLLECTIONS_BATCH_CAP) {
    chunks.push(unique.slice(i, i + POST_COLLECTIONS_BATCH_CAP));
  }
  const results = await Promise.all(
    chunks.map(async (chunk): Promise<PostCollectionsView[]> => {
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/public/posts/collections?ids=${chunk.join(",")}`,
          { cache: "no-store" },
        );
        if (!res.ok) return chunk.map((postId) => ({ postId, collections: [] }));
        return (await res.json()) as PostCollectionsView[];
      } catch {
        return chunk.map((postId) => ({ postId, collections: [] }));
      }
    }),
  );
  return results.flat();
}

/** "이 문장이 속한 길" — public collections/paths containing this highlight (newest first). Readable
 *  signed-out (the A-척추 discovery loop, sentence → the paths it's woven into). */
export async function listCollectionsContainingHighlight(
  highlightId: number,
): Promise<CollectionSummary[]> {
  if (USE_MOCKS) return Promise.resolve(mockCollectionsContainingHighlight(highlightId));
  const res = await fetch(`${API_BASE}/api/v1/public/highlights/${highlightId}/collections`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as CollectionSummary[];
}

/** "이것과 이어진 것" — blocks placed in the same PUBLIC collections as this one (most co-curated
 *  first). The Are.na connect-not-broadcast hop: one block → what curators wove alongside it. Readable
 *  signed-out; a missing block just yields []. */
export async function listRelatedBlocks(
  blockType: ConnectionBlockType,
  refId: number,
): Promise<RelatedBlock[]> {
  if (USE_MOCKS) return Promise.resolve([]);
  const res = await fetch(
    `${API_BASE}/api/v1/public/graph/blocks/${encodeURIComponent(blockType)}/${refId}/related`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  return (await res.json()) as RelatedBlock[];
}

/** "취향이 겹치는 큐레이터" — curators who wove some of the same blocks into their own public
 *  collections (most overlap first). Discovery by shared taste, not follows. Readable signed-out; an
 *  unknown handle yields []. */
export async function listKindredCurators(username: string): Promise<KindredCurator[]> {
  if (USE_MOCKS) return Promise.resolve([]);
  const res = await fetch(
    `${API_BASE}/api/v1/public/profiles/${encodeURIComponent(username)}/kindred`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  return (await res.json()) as KindredCurator[];
}

/** Authenticated — create a collection / path. Returns the new summary (count 0). */
export function createCollection(payload: NewCollection): Promise<CollectionSummary> {
  if (USE_MOCKS) return Promise.resolve(mockCreateCollection(payload));
  return request<CollectionSummary>("/api/v1/collections", { method: "POST", body: payload });
}

/** Authenticated — connect a block (idempotent). 201, no body. */
export function connectBlock(
  collectionId: number,
  payload: { blockType: ConnectionBlockType; refId: number; why?: string | null },
): Promise<void> {
  if (USE_MOCKS) {
    mockConnect(collectionId, payload);
    return Promise.resolve();
  }
  return request(`/api/v1/collections/${collectionId}/connections`, {
    method: "POST",
    body: payload,
  });
}

/** Authenticated — reorder a PATH's connections (the full ordered id list). 204. */
export function reorderConnections(collectionId: number, connectionIds: number[]): Promise<void> {
  if (USE_MOCKS) {
    mockReorderConnections(collectionId, connectionIds);
    return Promise.resolve();
  }
  return request(`/api/v1/collections/${collectionId}/connections/order`, {
    method: "PUT",
    body: { connectionIds },
  });
}

/** Authenticated — remove a connection. 204. */
export function disconnect(collectionId: number, connectionId: number): Promise<void> {
  if (USE_MOCKS) return Promise.resolve();
  return request(`/api/v1/collections/${collectionId}/connections/${connectionId}`, {
    method: "DELETE",
  });
}
