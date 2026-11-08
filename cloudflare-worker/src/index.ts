/**
 * kurl Subdomain Worker (`*.kurl.me/*`).
 *
 * blog.kurl.me 만 Vercel 의 Next.js 프런트엔드로 proxy 한다. 원래 host 는 X-Original-Host 헤더로
 * 전달 → Next.js middleware 가 blog host 를 /blog/* 로 rewrite. Vercel Hobby 는 kurl.me 서브도메인을
 * 자기 default deployment URL 로만 받으므로 이 Worker 가 host 정보를 헤더로 넘긴다.
 *
 * 예약 시스템 subdomain 과 .kurl.me 가 아닌 host 는 default CF routing 으로 넘긴다. 옛 명함
 * 서브도메인({username}.kurl.me)의 루트는 kurl.me/u/{username} 으로 보내고, 그 밖의 서브도메인
 * 요청은 Vercel 에 닿지 않게 여기서 404 로 끝낸다.
 *
 * Decision: [[decisions/2026-05-29-product-surface-c-lite]]
 */

import { routeSubdomain } from "./route";

const VERCEL_DEPLOYMENT_HOST = "short-link-frontend-blond.vercel.app";

export interface Env {}

export default {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const route = routeSubdomain(host, url.pathname, url.search);

    if (route.kind === "pass") return fetch(request);
    if (route.kind === "redirect") return Response.redirect(route.location, 301);
    if (route.kind === "notFound") return new Response("Not found", { status: 404 });

    const vercelUrl = `https://${VERCEL_DEPLOYMENT_HOST}${url.pathname}${url.search}`;

    const headers = new Headers(request.headers);
    headers.set("X-Original-Host", host);
    // host 헤더 제거: fetch 가 vercelUrl 기반으로 자동 설정 (Vercel 가 default domain 으로 인식).
    headers.delete("host");

    return fetch(vercelUrl, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });
  },
};
