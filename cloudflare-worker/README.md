# kurl Subdomain Publishing Worker

`*.kurl.me/*` 요청을 Vercel 의 Next.js 프런트엔드로 proxy. 원래 host (예: `john.kurl.me`) 는 `X-Original-Host` 헤더로 propagate.

Vercel Hobby 의 wildcard domain 미지원 우회 — Vercel 는 자기 default deployment URL 만 보고, 본 Worker 가 subdomain 정보를 헤더로 전달.

## Setup

처음 한 번:

```bash
cd cloudflare-worker
npm install
npx wrangler login
```

## Deploy

```bash
npm run deploy
```

배포 후 Cloudflare dashboard → Workers & Pages → kurl-subdomain-publishing 에서 라우트 확인. `wrangler.toml` 의 `[[routes]]` 가 `*.kurl.me/*` 로 설정됨.

## Local dev

```bash
npm run dev
```

기본 `http://localhost:8787` 에서 listen. 테스트:

```bash
curl -H "Host: john.kurl.me" http://localhost:8787/
curl -H "Host: john.kurl.me" http://localhost:8787/some-post-slug
```

## Behavior

| Host | Worker action |
|---|---|
| `john.kurl.me`, `jane.kurl.me`, ... | Vercel 로 proxy + `X-Original-Host` set |
| `www`, `app`, `api`, `origin`, `admin`, `blog`, `help`, `status`, `mail`, `kurl`, `official` | Pass through to default CF routing |
| `foo.bar.kurl.me` (multi-level) | 404 (Universal SSL wildcard 범위 밖) |
| Non `.kurl.me` host | Pass through (defensive) |

## Logs

```bash
npm run tail
```

Worker 의 stdout / 에러 실시간 stream.

## Related

- Frontend Next.js middleware: `app/[locale]/p/[username]/...` 라우트 + `middleware.ts` 의 `X-Original-Host` 감지
- Backend public API: `kurl.me/api/v1/public/profiles/{username}/posts/...`
- DNS: `*.kurl.me A 192.0.2.1 Proxied` (TEST-NET, Worker 가 intercept 하니까 실제 origin 필요 없음)
