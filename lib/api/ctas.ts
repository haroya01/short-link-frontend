import { request } from "./client";

export type CtaStyle = "PRIMARY" | "SECONDARY";

export type CtaPurpose =
  | "BOOKING"
  | "SUBSCRIBE"
  | "PURCHASE"
  | "CONTACT"
  | "DOWNLOAD"
  | "CUSTOM";

export interface CtaView {
  id: number;
  label: string;
  url: string;
  style: CtaStyle;
  purpose: CtaPurpose;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export function listMyCtas(): Promise<CtaView[]> {
  return request<CtaView[]>("/api/v1/ctas", { method: "GET" });
}

export function getCta(id: number): Promise<CtaView> {
  return request<CtaView>(`/api/v1/ctas/${id}`, { method: "GET" });
}

export function createCta(payload: {
  label: string;
  url: string;
  style?: CtaStyle;
  purpose?: CtaPurpose;
}): Promise<CtaView> {
  return request<CtaView>("/api/v1/ctas", { method: "POST", body: payload });
}

export function updateCta(
  id: number,
  payload: { label?: string; url?: string; style?: CtaStyle; purpose?: CtaPurpose },
): Promise<CtaView> {
  return request<CtaView>(`/api/v1/ctas/${id}`, { method: "PATCH", body: payload });
}

export function deleteCta(id: number): Promise<void> {
  return request(`/api/v1/ctas/${id}`, { method: "DELETE" });
}
