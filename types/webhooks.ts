export type WebhookFormat = "GENERIC" | "DISCORD" | "SLACK";

export type WebhookSummary = {
  id: number;
  url: string;
  name: string | null;
  enabled: boolean;
  createdAt: string;
  lastCalledAt: string | null;
  lastStatusCode: number | null;
  lastError: string | null;
  includeBots: boolean;
  sampleRate: number;
  batchEnabled: boolean;
  dailyQuota: number | null;
  consecutiveFailures: number;
  autoDisabledReason: string | null;
  referrerHostFilter: string | null;
  utmSourceFilter: string | null;
  format: WebhookFormat;
};

export type WebhookConfigPatch = {
  includeBots?: boolean;
  sampleRate?: number;
  batchEnabled?: boolean;
  dailyQuota?: number | null;
  referrerHostFilter?: string | null;
  utmSourceFilter?: string | null;
};

export type IssuedWebhook = {
  id: number;
  url: string;
  secret: string;
  name: string | null;
  createdAt: string;
  format: WebhookFormat;
};
