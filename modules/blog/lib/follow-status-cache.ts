import { getFollowStatus, type FollowStatus } from "@/modules/blog/api/follows";

// 공개 글/시리즈/프로필은 같은 작가의 팔로우 상태를 여러 컴포넌트가 각자 조회한다 — 글 상세는 CSS 로만
// 갈리는 FollowButton 2개(레일 + 헤더)가 모두 마운트되고, 프로필은 FollowButton + FollowCounts 가 같은
// 엔드포인트를 친다. username 키로 진행 중인 GET 하나를 공유해 중복 요청을 없앤다. 완료되면 항목을 비워
// 이후(팔로우 토글 후 등) 갱신은 다시 조회한다 — 결과를 캐시하는 게 아니라 동시 요청만 합친다.
const inflight = new Map<string, Promise<FollowStatus>>();

export function fetchFollowStatus(username: string): Promise<FollowStatus> {
  const existing = inflight.get(username);
  if (existing) return existing;
  const promise = getFollowStatus(username).finally(() => {
    inflight.delete(username);
  });
  inflight.set(username, promise);
  return promise;
}
