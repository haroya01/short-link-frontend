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
3. **알려진 이슈**: 콜백이 access token JSON을 응답 본문으로 반환해 SPA가 토큰 캡처 불가 → 백엔드 [#38](https://github.com/haroya01/short-link/issues/38)

### 임시 우회 — 개발용 토큰 입력
1. 다른 방법(curl + 직접 OAuth 등)으로 access token 확보
2. 로그인 페이지 → "개발용 access token 직접 입력" 토글 → 토큰 paste
3. localStorage에 저장되며 모든 인증 API에 자동 첨부
4. 401 발생 시 `/api/v1/auth/refresh`로 자동 갱신 시도(refresh cookie 보유 시)

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

15개 케이스, 약 7초.

인증 필요 흐름(대시보드 CRUD, 통계)은 백엔드 [#40 dev-login](https://github.com/haroya01/short-link/issues/40) 머지 후 추가 예정.

## 연관 백엔드 이슈

- [#37](https://github.com/haroya01/short-link/issues/37) CORS 미설정 (현재 Next 프록시로 회피)
- [#38](https://github.com/haroya01/short-link/issues/38) OAuth 성공 콜백 처리
- [#39](https://github.com/haroya01/short-link/issues/39) my-links 페이지네이션
- [#40](https://github.com/haroya01/short-link/issues/40) 로컬 dev 토큰 발급
- [#41](https://github.com/haroya01/short-link/issues/41) `/api/v1/users/me` 엔드포인트
