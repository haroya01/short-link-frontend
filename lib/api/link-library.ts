import type { MyLinksPage, MyLink } from "@/types";
import { request } from "./client";

export type LinkOverview = {
  totalLinks: number;
  totalClicks: number;
  humanClicks: number;
  clicks7d: number;
  clicksToday: number;
  zeroClickLinks: number;
  expiringLinks: number;
  timezone: string;
  updatedAt: string;
  dailyClicks: { date: string; count: number }[];
  topLinks: MyLink[];
};

export function getLinkOverview(signal?: AbortSignal) {
  return request<LinkOverview>("/api/v1/links/me/overview", { method: "GET", signal });
}
export function getFavoriteLinks(signal?: AbortSignal) {
  return request<MyLinksPage>("/api/v1/links/me/favorites", { method: "GET", signal });
}
export function resolveOwnedLinks(codes: string[], signal?: AbortSignal) {
  const qs = new URLSearchParams({ codes: codes.join(",") });
  return request<MyLinksPage>(`/api/v1/links/me/by-codes?${qs}`, { method: "GET", signal });
}
export function setLinkFavorite(code: string, favorite: boolean, signal?: AbortSignal) {
  return request<void>(`/api/v1/links/me/favorites/${encodeURIComponent(code)}`, { method: favorite ? "PUT" : "DELETE", signal });
}
export function setFavoriteOrder(shortCodes: string[]) {
  return request<void>("/api/v1/links/me/favorites/order", { method: "PUT", body: { shortCodes } });
}
