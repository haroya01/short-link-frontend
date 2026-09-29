"use client";

import { useEffect, useState } from "react";
import { extractUrl } from "@/lib/extract-url";

/** 다른 앱의 공유 시트(설치형 PWA share_target)로 들어온 주소. 한 번 읽고 주소창에서 지운다. */
export function useSharedUrl(): string | null {
  const [shared, setShared] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const found = extractUrl(params.get("shared_url") || params.get("shared_text") || "");
    if (!found) return;
    setShared(found);
    for (const key of ["shared_url", "shared_text", "shared_title"]) params.delete(key);
    const qs = params.toString();
    // history.state 는 라우터가 쓰는 자리라 그대로 두고 주소만 바꾼다.
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
  }, []);
  return shared;
}
