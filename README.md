# shortl

short-link backend(Spring Boot) 프론트.

## 로컬 실행

```bash
# 백엔드 먼저 (별도 터미널)
cd /Users/gimdonghyeon/Documents/short-link
docker compose -f resources/docker-compose.yml up -d
SPRING_PROFILES_ACTIVE=local ./gradlew bootRun

# 프론트
npm install
npm run dev
```

`next.config.js`의 `rewrites`가 `/api/v1/*`, `/oauth2/*`를 백엔드(`http://localhost:8080`)로 프록시.

## 인증

### Google OAuth (정상 흐름)
1. 백엔드 env에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 설정
2. 프론트 `로그인` → `/oauth2/authorization/google` 리다이렉트
3. 백엔드 성공 핸들러가 프론트 `/auth/callback#access_token=...`으로 리다이렉트
4. 프론트 콜백 페이지가 access token을 localStorage에 저장하고, refresh token은 백엔드가 httpOnly cookie로 설정
5. 인증 API는 access token을 `Authorization: Bearer`로 보내며, 401 발생 시 `/api/v1/auth/refresh`로 자동 갱신 시도

## E2E 테스트 (Playwright)

```bash
# 1. 백엔드 + 프론트 dev 모두 띄운 상태에서
npm run e2e            # headless
npm run e2e:headed     # 브라우저 보면서
```

`e2e/` 폴더 구성:
- `anonymous-shorten.spec.ts` — 홈에서 비로그인 단축, 폼 검증, 결과 카드, 로그인 CTA
- `auth-redirect.spec.ts` — 인증 필요 페이지에서 로그인 안내 표시
- `api-smoke.spec.ts` — 프록시 통과 백엔드 API 검증 (201 / 400 / 401 / VALIDATION_FAILED)

인증 필요 흐름은 `e2e/helpers/auth.ts`가 로컬/테스트 프로필의 `/api/v1/auth/dev-login`을 호출해 세션을 만든 뒤 검증합니다.
