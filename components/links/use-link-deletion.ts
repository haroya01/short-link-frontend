"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { ApiError, deleteLink, restoreLink } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";

const UNDO_MS = 10_000;

/** 구버전 서버엔 복구 경로가 없다. 새 서버의 404 는 LINK_NOT_FOUND(30일이 지났거나 내 링크가 아님)라 구분한다. */
export function isMissingEndpoint(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404 && err.detail.code !== "LINK_NOT_FOUND";
}

export function useLinkDeletion({
  restorable,
  onChanged,
  onRestoreMissing,
}: {
  restorable: boolean;
  onChanged: () => void;
  onRestoreMissing?: () => void;
}) {
  const t = useTranslations("dashboard");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  const setShown = useCallback((codes: string[], shown: boolean) => {
    setHidden((prev) => {
      const next = new Set(prev);
      for (const code of codes) {
        if (shown) next.delete(code);
        else next.add(code);
      }
      return next;
    });
  }, []);

  const undo = useCallback(
    async (codes: string[]) => {
      const results = await Promise.allSettled(codes.map((code) => restoreLink(code)));
      const restored = codes.filter((_, i) => results[i].status === "fulfilled");
      const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
      setShown(restored, true);
      if (failure) toast(errorMessage(failure.reason, t("restoreFailed")), "error");
      if (failure && isMissingEndpoint(failure.reason)) onRestoreMissing?.();
      onChanged();
    },
    [errorMessage, onChanged, onRestoreMissing, setShown, t, toast],
  );

  const remove = useCallback(
    async (codes: string[]) => {
      setShown(codes, false);
      const results = await Promise.allSettled(codes.map((code) => deleteLink(code)));
      const done = codes.filter((_, i) => results[i].status === "fulfilled");
      const failed = codes.filter((_, i) => results[i].status === "rejected");
      setShown(failed, true);
      if (done.length > 0) {
        const message = codes.length === 1 ? t("deleted") : t("bulkDeleted", { count: done.length });
        toast(
          message,
          "success",
          restorable ? { action: { label: t("undo"), onClick: () => void undo(done) }, durationMs: UNDO_MS } : undefined,
        );
      }
      if (failed.length > 0) {
        const first = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
        toast(
          codes.length === 1 ? errorMessage(first?.reason, t("deleteFailed")) : t("bulkDeleteFailed", { failed: failed.length, total: codes.length }),
          "error",
        );
      }
      onChanged();
    },
    [errorMessage, onChanged, restorable, setShown, t, toast, undo],
  );

  return { hidden, remove };
}
