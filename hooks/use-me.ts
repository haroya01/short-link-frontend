"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { fetchMe, readToken } from "@/lib/api/client";
import type { Me } from "@/types";

export const ME_QUERY_KEY = ["me"] as const;

function useHasToken(): boolean {
  const [hasToken, setHasToken] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!readToken();
  });

  useEffect(() => {
    const update = () => setHasToken(!!readToken());
    update();
    window.addEventListener("auth:change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("auth:change", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return hasToken;
}

export function useMe() {
  const hasToken = useHasToken();
  const queryClient = useQueryClient();

  // 로그아웃 시 stale me 가 화면에 안 남도록 캐시 제거 (invalidate 만으론 disabled 상태에서 data 유지됨)
  useEffect(() => {
    if (hasToken) return;
    queryClient.removeQueries({ queryKey: ME_QUERY_KEY });
  }, [hasToken, queryClient]);

  return useQuery<Me>({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    enabled: hasToken,
  });
}
