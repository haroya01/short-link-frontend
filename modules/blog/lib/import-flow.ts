import { ApiError } from "@/lib/api/client";
import { dateLocale } from "@/lib/date";
import type { ImportProgress, ImportSource } from "@/modules/blog/api/imports";

export type ImportStep = "verify" | "progress" | "done" | "error";

export function importStep(source: Pick<ImportSource, "status">): ImportStep {
  switch (source.status) {
    case "PENDING_VERIFICATION":
      return "verify";
    case "IMPORTING":
      return "progress";
    case "SYNCING":
      return "done";
    default:
      return "error";
  }
}

const CODE_KEY: Record<string, string> = {
  IMPORT_UNSUPPORTED_SOURCE: "errorUnsupported",
  IMPORT_FEED_NOT_FOUND: "errorFeedNotFound",
  IMPORT_SOURCE_UNREACHABLE: "errorUnreachable",
  IMPORT_SOURCE_TAKEN: "errorTaken",
  IMPORT_VERIFICATION_CODE_MISSING: "errorCodeMissing",
};

export function importErrorKey(err: unknown): string {
  if (err instanceof ApiError) {
    const code = err.detail.code;
    if (code && CODE_KEY[code]) return CODE_KEY[code];
    if (err.status === 429) return "errorRateLimited";
  }
  return "errorGeneric";
}

const SYNC_KEY: Record<string, string> = {
  IMPORT_SOURCE_UNREACHABLE: "syncUnreachable",
  IMPORT_FEED_NOT_FOUND: "syncFeedNotFound",
};

export function syncErrorKey(lastError: string | null): string {
  return (lastError && SYNC_KEY[lastError]) || "errorSync";
}

export function progressPercent(progress: ImportProgress | null): number {
  if (!progress || progress.total <= 0) return 0;
  return Math.min(100, Math.round((100 * progress.done) / progress.total));
}

export function withQuery(href: string, key: string, value: string | null): string {
  const url = new URL(href);
  url.searchParams.delete("url");
  url.searchParams.delete("source");
  if (value != null) url.searchParams.set(key, value);
  return url.toString();
}

export function syncedAt(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(dateLocale(locale), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
