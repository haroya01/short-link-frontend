"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { ApiError } from "./api";

type ErrorCatalog = {
  has: (code: string) => boolean;
  translate: (code: string, values: Record<string, number>) => string;
};

/**
 * 오류를 화면 문구로 바꾼다. 번역해 둔 백엔드 `code` 면 그 문구, 아니면 부른 쪽이 준 `fallback`.
 * 서버 `detail`("internal server error")과 JS 오류 메시지("Failed to fetch")는 영어 기술 문구라
 * 화면에 올리지 않는다.
 */
export function resolveErrorMessage(err: unknown, fallback: string, catalog: ErrorCatalog): string {
  if (err instanceof ApiError) {
    const code = err.detail.code;
    if (code && catalog.has(code)) {
      const detailRaw = err.detail as Record<string, unknown>;
      return catalog.translate(code, {
        limit: (detailRaw.limit as number | undefined) ?? 0,
        rows: (detailRaw.rows as number | undefined) ?? 0,
      });
    }
  }
  return fallback;
}

export function useApiErrorMessage() {
  const tErr = useTranslations("errors");
  return useCallback(
    (err: unknown, fallback: string): string =>
      resolveErrorMessage(err, fallback, {
        has: (code) => tErr.has(code),
        translate: (code, values) => tErr(code, values),
      }),
    [tErr],
  );
}
