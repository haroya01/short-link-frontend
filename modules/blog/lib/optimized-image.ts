/**
 * next/image 로 최적화 가능한 커버 호스트 판별 — next.config.js images.remotePatterns 와
 * 반드시 같은 목록(그쪽은 빌드 설정이라 import 로 공유가 안 돼 복제; 바꾸면 같이).
 * 커버는 본문 첫 이미지 자동 지정으로 임의 호스트가 될 수 있어, 목록 밖이면 호출측이
 * 원본 <img> 로 폴백한다(next/image 는 미허용 호스트에서 런타임 에러).
 */
const OPTIMIZABLE_HOSTS = new Set([
  "d82putaebkgm4.cloudfront.net",
  "qiita-image-store.s3.ap-northeast-1.amazonaws.com",
  "images.unsplash.com",
]);

export function canOptimizeCover(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && OPTIMIZABLE_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}
