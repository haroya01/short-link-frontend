# 크로스-서브도메인 세션 — 백엔드 요구사항

`kurl.me` ↔ `blog.kurl.me` (및 `{author}.kurl.me`) 사이를 오갈 때 로그인 상태가 유지되어야 한다. 프론트는 이미 이 전제 위에서 동작하도록 구현돼 있고, **남은 한 가지는 백엔드의 refresh 쿠키 스코프**다.

## 왜 백엔드가 필요한가 (구조)

- **access token 은 오리진별 localStorage** 에 저장된다(`short-link:access-token`). 즉 `kurl.me` 에 심긴 토큰은 `blog.kurl.me` 에서 보이지 않는다 — 설계상 그렇다.
- OAuth **콜백은 항상 apex(`kurl.me`) 로 떨어진다**. 따라서 blog 에서 로그인해도 토큰은 apex localStorage 에만 생긴다.
- 다른 서브도메인에 도착하면 프론트는 토큰이 없으므로 **refresh 쿠키로 세션을 복구**한다:
  - `lib/auth.tsx` → `bootstrapSession()` (mount 시 1회)
  - → `lib/api/client.ts` → `POST /api/v1/auth/refresh` (`credentials: "include"`) → `{ accessToken }` 수신 후 이 오리진 localStorage 에 저장.
- 이 복구가 성립하려면 **refresh 쿠키가 두 서브도메인 모두에 전송**되어야 한다 = `Domain=.kurl.me`.

> 즉 refresh 쿠키가 host-only(`blog.kurl.me` 만, 또는 `kurl.me` 만)로 발급되면 서브도메인 전환 시 복구가 실패하고 **로그아웃처럼 보인다**.

## 필요한 설정 (백엔드)

refresh 쿠키를 발급/갱신하는 모든 응답에서:

```
Set-Cookie: refresh_token=<...>;
            Domain=.kurl.me;     # ← 핵심. 선행 dot 으로 모든 서브도메인 공유
            Path=/;
            HttpOnly;
            Secure;
            SameSite=Lax;
            Max-Age=<...>
```

- **`Domain=.kurl.me`** — 이게 빠지면 host-only 가 되어 본 이슈 발생.
- **`SameSite=Lax`** — Google OAuth 왕복은 top-level GET 네비게이션이라 Lax 로 충분. 만약 refresh 호출이 **다른 등록가능 도메인**(예: API 가 `kurl.md` 등 별도 apex)에서 일어나면 그땐 cross-site 가 되어 **`SameSite=None; Secure`** 가 필요하다.
- **CORS** — 프론트가 `credentials: "include"` 로 호출하므로, refresh(및 인증 필요한 API)가 cross-origin 이면 응답에:
  - `Access-Control-Allow-Credentials: true`
  - `Access-Control-Allow-Origin: <정확한 Origin>` (와일드카드 `*` 불가)

## 환경 변수 (프론트, 참고)

- `NEXT_PUBLIC_KURL_HOST=kurl.me`, `NEXT_PUBLIC_BLOG_HOST=blog.kurl.me` 가 prod 에 설정되어야 host 기반 라우팅·`.kurl.me` 쿠키가 동작한다. (코드엔 `?? "kurl.me"` fallback 을 넣어 누락 시에도 쿠키 스코프는 살아있게 했다.)

## 검증 시나리오

1. `kurl.me` 로그인 → `blog.kurl.me` 이동 → **로그인 유지** (refresh 쿠키로 복구)
2. `blog.kurl.me` 로그인 → 콜백(apex) → **blog 로 복귀** (FE 수정: `.kurl.me` login-next 쿠키) → **로그인 유지** (refresh 쿠키)
3. 두 방향 모두 새로고침/직접진입에서도 유지

> 2번의 "blog 로 복귀" 는 이번 FE PR 에서 해결됨. "로그인 유지" 는 위 refresh 쿠키 설정이 전제.
