import type { ApiKeySummary, IssuedApiKey } from "@/types";

import { request } from "./client";

export async function listApiKeys(): Promise<ApiKeySummary[]> {
  return request<ApiKeySummary[]>("/api/v1/users/me/api-keys", { method: "GET" });
}

export async function issueApiKey(name: string): Promise<IssuedApiKey> {
  return request<IssuedApiKey>("/api/v1/users/me/api-keys", {
    method: "POST",
    body: { name: name.trim() || null },
  });
}

export async function revokeApiKey(id: number): Promise<void> {
  await request(`/api/v1/users/me/api-keys/${id}`, { method: "DELETE" });
}
