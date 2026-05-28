import { request } from "./client";
import type { PostView } from "./posts";

export interface SeriesView {
  id: number;
  slug: string;
  title: string;
  postCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface SeriesDetailView {
  series: SeriesView;
  posts: PostView[];
}

export function listSeries(): Promise<SeriesView[]> {
  return request<SeriesView[]>("/api/v1/series", { method: "GET" });
}

export function getSeries(id: number): Promise<SeriesDetailView> {
  return request<SeriesDetailView>(`/api/v1/series/${id}`, { method: "GET" });
}

export function createSeries(payload: { slug: string; title: string }): Promise<SeriesDetailView> {
  return request<SeriesDetailView>("/api/v1/series", { method: "POST", body: payload });
}

export function updateSeries(
  id: number,
  payload: { title?: string; slug?: string },
): Promise<SeriesDetailView> {
  return request<SeriesDetailView>(`/api/v1/series/${id}`, { method: "PATCH", body: payload });
}

export function setSeriesPosts(id: number, postIds: number[]): Promise<SeriesDetailView> {
  return request<SeriesDetailView>(`/api/v1/series/${id}/posts`, {
    method: "PUT",
    body: { postIds },
  });
}

export function deleteSeries(id: number): Promise<void> {
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
