import { request } from "@/lib/api/client";
import { mockSubscribedSeries, USE_MOCKS } from "@/modules/blog/api/_mocks";
import type { PublicSeriesCard } from "@/modules/blog/api/public-posts";

export interface SeriesSubscriptionStatus {
  subscribed: boolean;
  subscriberCount: number;
}

/** The signed-in user's subscribed series ids — one fetch marks every series card. */
export function listSubscribedSeriesIds(): Promise<number[]> {
  if (USE_MOCKS) return Promise.resolve([]);
  return request<number[]>(`/api/v1/users/me/series-subscriptions`, { method: "GET" });
}

/** The signed-in user's subscribed series as feed cards (latest active first) — the home "시리즈" tab. */
export function listSubscribedSeries(): Promise<PublicSeriesCard[]> {
  if (USE_MOCKS) return Promise.resolve(mockSubscribedSeries());
  return request<PublicSeriesCard[]>(`/api/v1/users/me/subscribed-series`, { method: "GET" });
}

export function subscribeSeries(seriesId: number): Promise<SeriesSubscriptionStatus> {
  if (USE_MOCKS) return Promise.resolve({ subscribed: true, subscriberCount: 1 });
  return request<SeriesSubscriptionStatus>(`/api/v1/series/${seriesId}/subscription`, {
    method: "PUT",
  });
}

export function unsubscribeSeries(seriesId: number): Promise<SeriesSubscriptionStatus> {
  if (USE_MOCKS) return Promise.resolve({ subscribed: false, subscriberCount: 0 });
  return request<SeriesSubscriptionStatus>(`/api/v1/series/${seriesId}/subscription`, {
    method: "DELETE",
  });
}
