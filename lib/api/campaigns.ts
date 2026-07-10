import type {
  CampaignBatch,
  CampaignBatchBulkPayload,
  CampaignBatchCreatePayload,
  CampaignBatchUpdatePayload,
  CampaignCreatePayload,
  CampaignDetail,
  CampaignRecommendation,
  CampaignStats,
  CampaignStatsCompareResponse,
  CampaignSummary,
  CampaignUpdatePayload,
} from "@/types";

import { request, withBase } from "./client";

export async function listCampaigns(): Promise<CampaignSummary[]> {
  return request<CampaignSummary[]>("/api/v1/campaigns", { method: "GET" });
}

export async function getCampaign(id: number): Promise<CampaignDetail> {
  return request<CampaignDetail>(`/api/v1/campaigns/${id}`, { method: "GET" });
}

export async function createCampaign(payload: CampaignCreatePayload): Promise<CampaignDetail> {
  return request<CampaignDetail>("/api/v1/campaigns", { method: "POST", body: payload });
}

export async function updateCampaign(
  id: number,
  payload: CampaignUpdatePayload,
): Promise<CampaignDetail> {
  return request<CampaignDetail>(`/api/v1/campaigns/${id}`, { method: "PATCH", body: payload });
}

export async function archiveCampaign(id: number): Promise<CampaignDetail> {
  return request<CampaignDetail>(`/api/v1/campaigns/${id}`, { method: "DELETE" });
}

export async function endCampaignNow(id: number): Promise<CampaignDetail> {
  return request<CampaignDetail>(`/api/v1/campaigns/${id}/end`, { method: "POST" });
}

export async function reapplyCampaignPolicy(id: number): Promise<CampaignDetail> {
  return request<CampaignDetail>(`/api/v1/campaigns/${id}/reapply-policy`, { method: "POST" });
}

export async function listCampaignBatches(campaignId: number): Promise<CampaignBatch[]> {
  return request<CampaignBatch[]>(`/api/v1/campaigns/${campaignId}/batches`, { method: "GET" });
}

export async function getCampaignBatch(
  campaignId: number,
  batchId: number,
): Promise<CampaignBatch> {
  return request<CampaignBatch>(`/api/v1/campaigns/${campaignId}/batches/${batchId}`, {
    method: "GET",
  });
}

export async function createCampaignBatch(
  campaignId: number,
  payload: CampaignBatchCreatePayload,
): Promise<CampaignBatch> {
  return request<CampaignBatch>(`/api/v1/campaigns/${campaignId}/batches`, {
    method: "POST",
    body: payload,
  });
}

export async function createCampaignBatchesBulk(
  campaignId: number,
  payload: CampaignBatchBulkPayload,
): Promise<CampaignBatch[]> {
  return request<CampaignBatch[]>(`/api/v1/campaigns/${campaignId}/batches/bulk`, {
    method: "POST",
    body: payload,
  });
}

export async function updateCampaignBatch(
  campaignId: number,
  batchId: number,
  payload: CampaignBatchUpdatePayload,
): Promise<CampaignBatch> {
  return request<CampaignBatch>(`/api/v1/campaigns/${campaignId}/batches/${batchId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteCampaignBatch(campaignId: number, batchId: number): Promise<void> {
  await request<void>(`/api/v1/campaigns/${campaignId}/batches/${batchId}`, { method: "DELETE" });
}

export async function getCampaignStats(campaignId: number): Promise<CampaignStats> {
  return request<CampaignStats>(`/api/v1/campaigns/${campaignId}/stats`, { method: "GET" });
}

export async function compareCampaignStats(
  campaignIds: number[],
): Promise<CampaignStatsCompareResponse> {
  return request<CampaignStatsCompareResponse>(`/api/v1/campaigns/stats/compare`, {
    method: "POST",
    body: JSON.stringify({ campaignIds }),
  });
}

export async function getCampaignRecommendations(
  campaignId: number,
): Promise<CampaignRecommendation> {
  return request<CampaignRecommendation>(
    `/api/v1/campaigns/${campaignId}/recommendations`,
    { method: "GET" },
  );
}

export type QrDownloadOptions = {
  size: 256 | 512 | 1024 | 2048;
  ec: "L" | "M" | "Q" | "H";
  label: boolean;
};

const QR_DEFAULTS: QrDownloadOptions = { size: 512, ec: "M", label: false };

function qrQueryString(options?: Partial<QrDownloadOptions>): string {
  const o = { ...QR_DEFAULTS, ...options };
  return `?size=${o.size}&ec=${o.ec}&label=${o.label ? "true" : "false"}`;
}

/** 다운로드 URL 빌더 — requestBlob(인증 fetch → blob, Authorization: Bearer)로 소비된다. */
export function campaignBatchQrUrl(
  campaignId: number,
  batchId: number,
  options?: Partial<QrDownloadOptions>,
): string {
  return withBase(
    `/api/v1/campaigns/${campaignId}/batches/${batchId}/qr${qrQueryString(options)}`,
  );
}

export function campaignBatchesZipUrl(
  campaignId: number,
  options?: Partial<QrDownloadOptions>,
): string {
  return withBase(
    `/api/v1/campaigns/${campaignId}/batches/qr-zip${qrQueryString(options)}`,
  );
}

export function campaignBatchesCsvUrl(campaignId: number): string {
  return withBase(`/api/v1/campaigns/${campaignId}/batches/csv`);
}
