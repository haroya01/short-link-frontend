import { request } from "@/lib/api/client";
import type { PostView } from "./posts";
import { USE_MOCKS } from "@/modules/blog/api/_mocks";
import {
  mockCreateSeries,
  mockDeleteSeries,
  mockGetSeries,
  mockListSeries,
  mockSetSeriesPosts,
} from "@/modules/blog/api/_mocks-authoring";

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
  if (USE_MOCKS) return Promise.resolve(mockListSeries());
  return request<SeriesView[]>("/api/v1/series", { method: "GET" });
}

export function getSeries(id: number): Promise<SeriesDetailView> {
  if (USE_MOCKS) return Promise.resolve(mockGetSeries(id));
  return request<SeriesDetailView>(`/api/v1/series/${id}`, { method: "GET" });
}

export function createSeries(payload: { slug: string; title: string }): Promise<SeriesDetailView> {
  if (USE_MOCKS) return Promise.resolve(mockCreateSeries(payload));
  return request<SeriesDetailView>("/api/v1/series", { method: "POST", body: payload });
}

export function setSeriesPosts(id: number, postIds: number[]): Promise<SeriesDetailView> {
  if (USE_MOCKS) return Promise.resolve(mockSetSeriesPosts(id, postIds));
  return request<SeriesDetailView>(`/api/v1/series/${id}/posts`, {
    method: "PUT",
    body: { postIds },
  });
}

export function deleteSeries(id: number): Promise<void> {
  if (USE_MOCKS) {
    mockDeleteSeries(id);
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
