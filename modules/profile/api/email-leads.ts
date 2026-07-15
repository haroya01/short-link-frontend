import type { EmailLead, EmailLeadPage } from "@/types";

import { API_BASE, request } from "@/lib/api/client";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

// 리드 화면이 mock 레인에서 500 으로 죽지 않게 — 다른 blog api 처럼 함수 수준에서 분기한다.
const MOCK_LEADS: EmailLead[] = [
  { id: 1, blockId: 11, email: "reader.one@example.com", submittedAt: "2026-07-10T09:12:00Z", optedOut: false },
  { id: 2, blockId: 11, email: "hello.dev@example.com", submittedAt: "2026-07-08T14:03:00Z", optedOut: false },
  { id: 3, blockId: 12, email: "newsletter.fan@example.com", submittedAt: "2026-07-02T21:40:00Z", optedOut: true },
];

export async function submitEmailLead(blockId: number, email: string): Promise<void> {
  if (USE_MOCKS) return;
  await request("/api/v1/public/email-leads", {
    method: "POST",
    body: { blockId, email },
  });
}

export async function listEmailLeads(page: number, size: number): Promise<EmailLeadPage> {
  if (USE_MOCKS) return { items: page === 0 ? MOCK_LEADS : [], total: MOCK_LEADS.length };
  return request<EmailLeadPage>(`/api/v1/users/me/email-leads?page=${page}&size=${size}`);
}

export async function deleteEmailLead(id: number): Promise<void> {
  if (USE_MOCKS) return;
  await request(`/api/v1/users/me/email-leads/${id}`, { method: "DELETE" });
}

export async function setEmailLeadOptedOut(id: number, optedOut: boolean): Promise<EmailLead> {
  if (USE_MOCKS) return { ...MOCK_LEADS[0], id, optedOut };
  return request<EmailLead>(`/api/v1/users/me/email-leads/${id}`, {
    method: "PATCH",
    body: { optedOut },
  });
}

/** Absolute URL for the owner-only CSV export — anchor `download` triggers a browser save. */
export function emailLeadsExportUrl(): string {
  return `${API_BASE}/api/v1/users/me/email-leads/export.csv`;
}
