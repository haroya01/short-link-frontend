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
  mockReorderConnections,
} from "@/modules/blog/api/_mocks-collections";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export type CollectionVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";
/** COLLECTION = themed bundle · PATH = ordered reading path (read as a guided walk). */
export type CollectionKind = "COLLECTION" | "PATH";
export type ConnectionBlockType = "POST" | "HIGHLIGHT" | "NOTE";

/** A collection list row — title/blurb/visibility + count + a few recent item labels (no vanity
 *  metrics). Backend `CollectionSummaryView`. */
export interface CollectionSummary {
  id: number;
  title: string;
  description: string | null;
  visibility: CollectionVisibility;
  kind: CollectionKind;
  count: number;
  /** Recent item labels — "what's inside", to help decide where to file a new connection. */
  preview: string[];
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
