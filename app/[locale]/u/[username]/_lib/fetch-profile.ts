import { cache } from "react";
import type { PublicProfile } from "@/types";
import { fetchWithTimeout } from "@/lib/api/fetch-timeout";
import { mockPublicProfile } from "@/modules/profile/mock-profile";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

export type ProfileResult =
  | { ok: true; data: PublicProfile }
  | { ok: false; status: 404 }
  | { ok: false; status: "error"; cause: unknown };

// Next 14.2 는 오류 셸을 그릴 때 generateMetadata 를 새 렌더에서 다시 불러 cache() 를 비켜 간다. 방금 실패한
// 조회를 잠깐 기억하지 않으면 순단 한 번에 백엔드를 두 번 부르고, 응답이 없으면 타임아웃을 두 번 기다린다.
const FAILURE_MEMO_MS = 1_000;
const recentFailures = new Map<string, { at: number; result: ProfileResult }>();

// fetchWithTimeout 이 signal 을 넘기면 React 의 fetch 중복 제거가 꺼진다.
export const fetchProfile = cache(async (username: string): Promise<ProfileResult> => {
  // Demo/mock mode: render a stand-in link-in-bio so the surface (and the blog→프로필 cross-link)
  // works without a backend.
  if (USE_MOCKS) {
    const data = mockPublicProfile(username);
    return data ? { ok: true, data } : { ok: false, status: 404 };
  }
  const failed = recentFailures.get(username);
  if (failed && Date.now() - failed.at < FAILURE_MEMO_MS) return failed.result;
  const result = await requestProfile(username);
  if (result.ok || result.status === 404) recentFailures.delete(username);
  else rememberFailure(username, result);
  return result;
});

async function requestProfile(username: string): Promise<ProfileResult> {
  // Short revalidate so owner edits show up within ~30s without smashing the backend per visit.
  // The backend layers a 5min Redis cache that auto-evicts on profile/toggle/reorder writes.
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/api/v1/public/profiles/${encodeURIComponent(username)}`,
      { next: { revalidate: 30 } },
    );
    if (res.status === 404) return { ok: false, status: 404 };
    if (!res.ok) return { ok: false, status: "error", cause: `HTTP ${res.status}` };
    return { ok: true, data: (await res.json()) as PublicProfile };
  } catch (cause) {
    return { ok: false, status: "error", cause };
  }
}

function rememberFailure(username: string, result: ProfileResult) {
  const now = Date.now();
  for (const [key, failure] of recentFailures) {
    if (now - failure.at >= FAILURE_MEMO_MS) recentFailures.delete(key);
  }
  recentFailures.set(username, { at: now, result });
}
