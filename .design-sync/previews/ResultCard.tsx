import { ResultCard } from "url-shortener";

const mockResult = {
  shortCode: "spring",
  shortUrl: "kurl.me/spring",
  claimToken: null,
} as never;

const mockResultWithToken = {
  shortCode: "dev2026",
  shortUrl: "kurl.me/dev2026",
  claimToken: "tok_abc123xyz",
} as never;

const originalUrl =
  "https://blog.naver.com/techwriter/2026010100001?utm_source=kakao&utm_medium=share&utm_campaign=spring-launch";

export const AuthenticatedResult = () => (
  <div style={{ maxWidth: 520, padding: "24px" }}>
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "#6b7280",
        marginBottom: 12,
      }}
    >
      인증 사용자 — 통계·프로필 CTA 노출
    </p>
    <ResultCard
      result={mockResult}
      originalUrl={originalUrl}
      authenticated={true}
    />
  </div>
);

export const AnonymousResult = () => (
  <div style={{ maxWidth: 520, padding: "24px" }}>
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "#6b7280",
        marginBottom: 12,
      }}
    >
      비로그인 — 24시간 만료 배너 + 가입 CTA 노출
    </p>
    <ResultCard
      result={mockResultWithToken}
      originalUrl={originalUrl}
      authenticated={false}
    />
  </div>
);
