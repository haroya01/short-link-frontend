// 미들웨어가 /{locale}/* 를 /{locale}/links/* 로 rewrite 하므로 서버 렌더의 경로엔 /links 가 붙고
// 브라우저 주소엔 없다. 둘이 다르면 하이드레이션이 서버 속성을 그대로 남긴다.
export function linksPublicPath(pathname: string): string {
  if (pathname === "/links") return "/";
  if (pathname.startsWith("/links/")) return pathname.slice("/links".length);
  return pathname;
}
