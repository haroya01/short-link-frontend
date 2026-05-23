"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";

/**
 * Surfaces the result of the auto-claim flow: when {@code lib/auth.ts} successfully claims
 * anonymous links into the freshly authenticated account, a toast confirms how many were rescued.
 */
export function ClaimToastListener() {
  const t = useTranslations("recent");
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ count: number }>).detail;
      if (!detail || detail.count <= 0) return;
      toast(t("claimedToast", { count: detail.count }), "success");
    };
    window.addEventListener("kurl:claimed", handler);
    return () => window.removeEventListener("kurl:claimed", handler);
  }, [t, toast]);

  return null;
}
