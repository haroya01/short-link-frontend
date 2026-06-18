import { CampaignsEntryCard } from "url-shortener";

export const CampaignsEntry = () => (
  <div style={{ maxWidth: 640, padding: "24px" }}>
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
      대시보드 발견 카드 — QR 캠페인 진입점
    </p>
    <CampaignsEntryCard />
  </div>
);
