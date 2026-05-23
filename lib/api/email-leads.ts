import type { EmailLead, EmailLeadPage } from "@/types";

import { API_BASE, request } from "./client";

export async function submitEmailLead(blockId: number, email: string): Promise<void> {
  await request("/api/v1/public/email-leads", {
    method: "POST",
    body: { blockId, email },
  });
}

export async function listEmailLeads(page: number, size: number): Promise<EmailLeadPage> {
  return request<EmailLeadPage>(`/api/v1/users/me/email-leads?page=${page}&size=${size}`);
}

export async function deleteEmailLead(id: number): Promise<void> {
  await request(`/api/v1/users/me/email-leads/${id}`, { method: "DELETE" });
}

export async function setEmailLeadOptedOut(id: number, optedOut: boolean): Promise<EmailLead> {
  return request<EmailLead>(`/api/v1/users/me/email-leads/${id}`, {
    method: "PATCH",
    body: { optedOut },
  });
}

/** Absolute URL for the owner-only CSV export — anchor `download` triggers a browser save. */
export function emailLeadsExportUrl(): string {
  return `${API_BASE}/api/v1/users/me/email-leads/export.csv`;
}
