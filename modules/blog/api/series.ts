import { request } from "@/lib/api/client";
import type { PostView } from "./posts";
import type { SeriesItemType, SeriesNoteSummary } from "./public-posts";
import { authoringMocks } from "@/modules/blog/api/_mock-gates";
import { seriesItemRefs } from "@/modules/blog/lib/series-items";

export interface SeriesView {
  id: number;
  slug: string;
  title: string;
  postCount: number;
  itemCount?: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface SeriesOwnerItem {
  type: SeriesItemType;
  post: PostView | null;
  note: SeriesNoteSummary | null;
}

export interface SeriesDetailView {
  series: SeriesView;
  posts: PostView[];
  /** Posts of every status and notes, in series order. */
  items?: SeriesOwnerItem[];
}

export interface SeriesItemRef {
  type: SeriesItemType;
  id: number;
}

export function listSeries(): Promise<SeriesView[]> {
  if (authoringMocks) return Promise.resolve(authoringMocks.mockListSeries());
  return request<SeriesView[]>("/api/v1/series", { method: "GET" });
}

export function getSeries(id: number): Promise<SeriesDetailView> {
  if (authoringMocks) return Promise.resolve(authoringMocks.mockGetSeries(id));
  return request<SeriesDetailView>(`/api/v1/series/${id}`, { method: "GET" });
}

export function createSeries(payload: { slug: string; title: string }): Promise<SeriesDetailView> {
  if (authoringMocks) return Promise.resolve(authoringMocks.mockCreateSeries(payload));
  return request<SeriesDetailView>("/api/v1/series", { method: "POST", body: payload });
}

/** Rename a series (and/or change its address). Membership/order is untouched. */
export function updateSeries(
  id: number,
  payload: { title: string; slug: string },
): Promise<SeriesDetailView> {
  if (authoringMocks) return Promise.resolve(authoringMocks.mockUpdateSeries(id, payload));
  return request<SeriesDetailView>(`/api/v1/series/${id}`, { method: "PUT", body: payload });
}

export function setSeriesPosts(id: number, postIds: number[]): Promise<SeriesDetailView> {
  if (authoringMocks) return Promise.resolve(authoringMocks.mockSetSeriesPosts(id, postIds));
  return request<SeriesDetailView>(`/api/v1/series/${id}/posts`, {
    method: "PUT",
    body: { postIds },
  });
}

/** Replaces the whole order: members left out leave the series, and a post or note from another
 *  series moves here. */
export function setSeriesItems(id: number, items: SeriesItemRef[]): Promise<SeriesDetailView> {
  if (authoringMocks) return authoringMocks.mockSetSeriesItems(id, items);
  return request<SeriesDetailView>(`/api/v1/series/${id}/items`, { method: "PUT", body: { items } });
}

/** Appends at the end; false when the note is already in this series. */
export async function appendNoteToSeries(seriesId: number, noteId: number): Promise<boolean> {
  const refs = seriesItemRefs(await getSeries(seriesId));
  if (refs.some((ref) => ref.type === "NOTE" && ref.id === noteId)) return false;
  await setSeriesItems(seriesId, [...refs, { type: "NOTE", id: noteId }]);
  return true;
}

export function deleteSeries(id: number): Promise<void> {
  if (authoringMocks) {
    authoringMocks.mockDeleteSeries(id);
    return Promise.resolve();
  }
  return request(`/api/v1/series/${id}`, { method: "DELETE" });
}

/**
 * Move a post's series membership. Membership is owned by the series' ordered post list, so this
 * detaches from the old series (if any) and appends to the new one. No-op when unchanged.
 */
export async function assignPostToSeries(
  postId: number,
  newSeriesId: number | null,
  oldSeriesId: number | null,
): Promise<void> {
  if (newSeriesId === oldSeriesId) return;
  if (oldSeriesId != null) {
    const detail = await getSeries(oldSeriesId);
    await setSeriesPosts(
      oldSeriesId,
      detail.posts.map((p) => p.id).filter((id) => id !== postId),
    );
  }
  if (newSeriesId != null) {
    const detail = await getSeries(newSeriesId);
    const ids = detail.posts.map((p) => p.id).filter((id) => id !== postId);
    await setSeriesPosts(newSeriesId, [...ids, postId]);
  }
}
