"use client";

import { useEffect } from "react";

/**
 * Post 페이지 로드 시 view beacon fire. dedup 없음 — 새로고침 / 봇 다 카운트. accurate unique visitor 는 L3
 * tracking JS 별도 트랙. failure 는 silent (분석 beacon 이 UX 막으면 안 됨).
 */
export function ViewBeacon({ username, slug }: { username: string; slug: string }) {
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";
    const url = `${apiBase}/api/v1/public/profiles/${encodeURIComponent(
      username,
    )}/posts/${encodeURIComponent(slug)}/view`;
    // fire-and-forget. Beacon API 가 page unload 도 안정적이지만 페이지 진입 시점 fire 는 fetch 로 충분.
    fetch(url, { method: "POST", keepalive: true }).catch(() => {});
  }, [username, slug]);
  return null;
}
