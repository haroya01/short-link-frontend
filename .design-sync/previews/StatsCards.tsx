import { StatsCards } from "url-shortener";

export const StatsCanonical = () => (
  // >1024px content width so the lg: breakpoint hits and the 1.5x-hero KPI strip renders
  // (the component's signature layout); below it the grid stays in the 3-col tablet tier.
  <div style={{ maxWidth: 1240, padding: "24px" }}>
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "#6b7280",
        marginBottom: 16,
      }}
    >
      6-업 KPI 그리드 — 실제 클릭 수치 + 프로필 유입 카드 포함
    </p>
    <StatsCards
      total={4_820}
      human={4_231}
      bot={589}
      unique={2_104}
      profileClicks={318}
      timeToFirstClickMinutes={7}
      velocityRatio={2.4}
      animate={false}
    />
  </div>
);

export const StatsZeroState = () => (
  <div style={{ maxWidth: 900, padding: "24px" }}>
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "#6b7280",
        marginBottom: 16,
      }}
    >
      제로 상태 — 링크 생성 직후, 클릭 없음
    </p>
    <StatsCards
      total={0}
      human={0}
      bot={0}
      unique={null}
      animate={false}
    />
  </div>
);
