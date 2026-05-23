import type { IssuedWebhook, WebhookConfigPatch, WebhookSummary } from "@/types";

import { request } from "./client";

export async function listWebhooks(shortCode: string): Promise<WebhookSummary[]> {
  return request<WebhookSummary[]>(`/api/v1/links/${shortCode}/webhooks`, {
    method: "GET",
  });
}

export async function registerWebhook(
  shortCode: string,
  url: string,
  name?: string,
): Promise<IssuedWebhook> {
  return request<IssuedWebhook>(`/api/v1/links/${shortCode}/webhooks`, {
    method: "POST",
    body: { url, name: name ?? null },
  });
}

export async function toggleWebhook(
  shortCode: string,
  id: number,
  enabled: boolean,
): Promise<WebhookSummary> {
  return request<WebhookSummary>(`/api/v1/links/${shortCode}/webhooks/${id}`, {
    method: "PATCH",
    body: { enabled },
  });
}

export async function deleteWebhook(shortCode: string, id: number): Promise<void> {
  await request(`/api/v1/links/${shortCode}/webhooks/${id}`, { method: "DELETE" });
}

export async function updateWebhookConfig(
  shortCode: string,
  id: number,
  patch: WebhookConfigPatch,
): Promise<WebhookSummary> {
  return request<WebhookSummary>(`/api/v1/links/${shortCode}/webhooks/${id}/config`, {
    method: "PUT",
    body: patch,
  });
}
