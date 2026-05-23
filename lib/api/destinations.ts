import type { DestinationSummary } from "@/types";

import { request } from "./client";

export async function listDestinations(shortCode: string): Promise<DestinationSummary[]> {
  return request<DestinationSummary[]>(`/api/v1/links/${shortCode}/destinations`, {
    method: "GET",
  });
}

export async function addDestination(
  shortCode: string,
  url: string,
  weight: number,
  label?: string,
  countryCode?: string,
): Promise<DestinationSummary> {
  return request<DestinationSummary>(`/api/v1/links/${shortCode}/destinations`, {
    method: "POST",
    body: {
      url,
      weight,
      label: label ?? null,
      countryCode: countryCode && countryCode.length > 0 ? countryCode : null,
    },
  });
}

export async function updateDestination(
  shortCode: string,
  id: number,
  payload: {
    url?: string;
    weight?: number;
    label?: string | null;
    enabled?: boolean;
    countryCode?: string | null;
  },
): Promise<DestinationSummary> {
  return request<DestinationSummary>(`/api/v1/links/${shortCode}/destinations/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteDestination(shortCode: string, id: number): Promise<void> {
  await request(`/api/v1/links/${shortCode}/destinations/${id}`, { method: "DELETE" });
}
