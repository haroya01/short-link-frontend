import { request } from "@/lib/api/client";
import { USE_MOCKS } from "@/modules/blog/api/_mocks";

export interface SeriesSubscriptionStatus {
  subscribed: boolean;
  subscriberCount: number;
}

/** The signed-in user's subscribed series ids — one fetch marks every series card. */
export function listSubscribedSeriesIds(): Promise<number[]> {
  if (USE_MOCKS) return Promise.resolve([]);
  return request<number[]>(`/api/v1/users/me/series-subscriptions`, { method: "GET" });
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
