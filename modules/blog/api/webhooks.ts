import { request } from "@/lib/api/client";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

/** Reader interactions an author can be notified about — mirrors the backend BlogInteractionType. */
export type BlogWebhookEvent = "LIKE" | "COMMENT" | "FOLLOW" | "SERIES_SUBSCRIBE";
export const ALL_BLOG_WEBHOOK_EVENTS: BlogWebhookEvent[] = [
  "LIKE",
  "COMMENT",
  "FOLLOW",
  "SERIES_SUBSCRIBE",
];

export type BlogWebhookFormat = "GENERIC" | "DISCORD" | "SLACK";

export interface BlogWebhookSummary {
  id: number;
  url: string;
  name: string | null;
  enabled: boolean;
  format: BlogWebhookFormat;
  events: BlogWebhookEvent[];
  createdAt: string;
  lastCalledAt: string | null;
  lastStatusCode: number | null;
  lastError: string | null;
  consecutiveFailures: number;
  autoDisabledReason: string | null;
}

/** Returned once at registration — the only time the plaintext secret is exposed. */
export interface IssuedBlogWebhook {
  id: number;
  url: string;
  secret: string;
  name: string | null;
  format: BlogWebhookFormat;
  events: BlogWebhookEvent[];
  createdAt: string;
}

export interface RegisterBlogWebhookBody {
  url: string;
  name?: string | null;
  events?: BlogWebhookEvent[];
}

export interface UpdateBlogWebhookBody {
  name?: string | null;
  events?: BlogWebhookEvent[];
  enabled?: boolean;
}

// ---- mock store (NEXT_PUBLIC_USE_MOCKS=1) ----
let mockHooks: BlogWebhookSummary[] = [
  {
    id: 1,
    url: "https://discord.com/api/webhooks/123/abcdef",
    name: "Discord 채널",
    enabled: true,
    format: "DISCORD",
    events: ["LIKE", "COMMENT", "FOLLOW", "SERIES_SUBSCRIBE"],
    createdAt: "2026-05-20T09:00:00Z",
    lastCalledAt: "2026-06-04T08:40:00Z",
    lastStatusCode: 204,
    lastError: null,
    consecutiveFailures: 0,
    autoDisabledReason: null,
  },
];
let mockSeq = 2;

function detectFormat(url: string): BlogWebhookFormat {
  try {
    const host = new URL(url).host.toLowerCase();
    if (host === "discord.com" || host === "discordapp.com" || host.endsWith(".discord.com"))
      return "DISCORD";
    if (host === "hooks.slack.com" || host.endsWith(".hooks.slack.com")) return "SLACK";
  } catch {
    /* ignore */
  }
  return "GENERIC";
}

export function listBlogWebhooks(): Promise<BlogWebhookSummary[]> {
  if (USE_MOCKS) return Promise.resolve([...mockHooks]);
  return request<BlogWebhookSummary[]>("/api/v1/blog/webhooks", { method: "GET" });
}

export function registerBlogWebhook(body: RegisterBlogWebhookBody): Promise<IssuedBlogWebhook> {
  if (USE_MOCKS) {
    const events = body.events?.length ? body.events : ALL_BLOG_WEBHOOK_EVENTS;
    const format = detectFormat(body.url);
    const summary: BlogWebhookSummary = {
      id: mockSeq++,
      url: body.url,
      name: body.name?.trim() || null,
      enabled: true,
      format,
      events,
      createdAt: new Date().toISOString(),
      lastCalledAt: null,
      lastStatusCode: null,
      lastError: null,
      consecutiveFailures: 0,
      autoDisabledReason: null,
    };
    mockHooks = [summary, ...mockHooks];
    return Promise.resolve({
      id: summary.id,
      url: summary.url,
      secret: "mock_" + Math.random().toString(36).slice(2).padEnd(40, "0").slice(0, 44),
      name: summary.name,
      format,
      events,
      createdAt: summary.createdAt,
    });
  }
  return request<IssuedBlogWebhook>("/api/v1/blog/webhooks", { method: "POST", body });
}

export function updateBlogWebhook(
  id: number,
  body: UpdateBlogWebhookBody,
): Promise<BlogWebhookSummary> {
  if (USE_MOCKS) {
    mockHooks = mockHooks.map((h) =>
      h.id === id
        ? {
            ...h,
            name: body.name !== undefined ? body.name?.trim() || null : h.name,
            events: body.events?.length ? body.events : h.events,
            enabled: body.enabled !== undefined ? body.enabled : h.enabled,
            ...(body.enabled ? { consecutiveFailures: 0, autoDisabledReason: null } : {}),
          }
        : h,
    );
    return Promise.resolve(mockHooks.find((h) => h.id === id)!);
  }
  return request<BlogWebhookSummary>(`/api/v1/blog/webhooks/${id}`, { method: "PATCH", body });
}

export function deleteBlogWebhook(id: number): Promise<void> {
  if (USE_MOCKS) {
    mockHooks = mockHooks.filter((h) => h.id !== id);
    return Promise.resolve();
  }
  return request<void>(`/api/v1/blog/webhooks/${id}`, { method: "DELETE" });
}
