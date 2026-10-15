"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";

export function useLikeFailed(): (error: unknown) => void {
  const { toast } = useToast();
  const tErr = useTranslations("errors");
  const errorMessage = useApiErrorMessage();
  return useCallback(
    (error: unknown) => toast(errorMessage(error, tErr("likeFailed")), "error"),
    [toast, tErr, errorMessage],
  );
}
