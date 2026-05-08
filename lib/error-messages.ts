"use client";

import { useTranslations } from "next-intl";
import { ApiError } from "./api";

/**
 * Resolves a user-facing message for any error thrown by API helpers, preferring the
 * locale-specific copy keyed by the backend's `code` (e.g., "LINK_EXPIRED"). Falls back to the
 * server's `detail` text and finally to the supplied `fallback` so call sites always render
 * something.
 */
export function useApiErrorMessage() {
  const tErr = useTranslations("errors");
  return (err: unknown, fallback: string): string => {
    if (err instanceof ApiError) {
      const code = err.detail.code;
      const detailRaw = err.detail as Record<string, unknown>;
      if (code && tErr.has(code)) {
        return tErr(code, {
          limit: (detailRaw.limit as number | undefined) ?? 0,
          rows: (detailRaw.rows as number | undefined) ?? 0,
        });
      }
      return err.detail.detail ?? fallback;
    }
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  };
}
