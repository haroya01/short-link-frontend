import type { CustomDomain } from "@/types";

import { request } from "./client";

export async function listCustomDomains(): Promise<CustomDomain[]> {
  return request<CustomDomain[]>("/api/v1/custom-domains", { method: "GET" });
}

export async function registerCustomDomain(domain: string): Promise<CustomDomain> {
  return request<CustomDomain>("/api/v1/custom-domains", {
    method: "POST",
    body: { domain },
  });
}

export async function verifyCustomDomain(id: number): Promise<CustomDomain> {
  return request<CustomDomain>(`/api/v1/custom-domains/${id}/verify`, { method: "POST" });
}

export async function deleteCustomDomain(id: number): Promise<void> {
  await request(`/api/v1/custom-domains/${id}`, { method: "DELETE" });
}
