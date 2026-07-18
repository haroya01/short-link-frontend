"use client";

import { useEffect } from "react";
import { behaviorSessionId } from "@/lib/analytics/behavior";

/**
 * Post 페이지 로드 시 view beacon fire. dedup 없음 — 새로고침 / 봇 다 카운트. accurate unique visitor 는 L3
 * tracking JS 별도 트랙. failure 는 silent (분석 beacon 이 UX 막으면 안 됨).
 */
export function ViewBeacon({ username, slug }: { username: string; slug: string }) {
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";
    // 유입원은 ref 쿼리로 명시 전달 — 이 fetch 의 Referer 헤더는 글 페이지 자신이라 유입원이 못
    // 된다(백엔드는 ref 우선, 헤더 폴백). document.referrer 는 문서 로드 기준이라 소프트 내비로
    // 글을 옮겨 다녀도 세션의 진입점이 유지된다 — "유입 경로"가 원하는 의미.
    const params = new URLSearchParams();
    if (document.referrer) params.set("ref", document.referrer);
    // 행동 이벤트(behavior_event)와 같은 세션으로 조인될 탭 수명 ID — 유입 레퍼러가 붙은 이
    // 도달 이벤트가 퍼널의 진입점이 된다.
    const sid = behaviorSessionId();
    if (sid) params.set("sid", sid);
    const qs = [...params].length > 0 ? `?${params.toString()}` : "";
    const url = `${apiBase}/api/v1/public/profiles/${encodeURIComponent(
      username,
    )}/posts/${encodeURIComponent(slug)}/view${qs}`;
    // fire-and-forget. Beacon API 가 page unload 도 안정적이지만 페이지 진입 시점 fire 는 fetch 로 충분.
    fetch(url, { method: "POST", keepalive: true }).catch(() => {});
  }, [username, slug]);
  return null;
}
