import { PostStatusBadge } from "url-shortener";

// ── PostStatusBadge preview ───────────────────────────────────────────────────
// Axis: status — DRAFT · SCHEDULED · PUBLISHED · UNPUBLISHED (one per story + one combined row).

/** All four status badges in a row — canonical color/label axis sweep */
export const AllStatuses = () => (
  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
    <PostStatusBadge status={"DRAFT" as never} />
    <PostStatusBadge status={"SCHEDULED" as never} />
    <PostStatusBadge status={"PUBLISHED" as never} />
    <PostStatusBadge status={"UNPUBLISHED" as never} />
  </div>
);

/** Contextual — badges shown next to a post title, as they appear in the write list */
export const InContext = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
    {(
      [
        { status: "DRAFT", title: "쿠팡의 추천 알고리즘에 대하여 (초안)" },
        { status: "SCHEDULED", title: "2026년 하반기 제품 회고" },
        { status: "PUBLISHED", title: "작게, 깊게: 1,000명의 진짜 팬" },
        { status: "UNPUBLISHED", title: "초기 스타트업의 팀 문화 — 비공개" },
      ] as { status: string; title: string }[]
    ).map(({ status, title }) => (
      <div
        key={status}
        style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit" }}
      >
        <PostStatusBadge status={status as never} />
        <span style={{ fontSize: 14, color: "#334155" }}>{title}</span>
      </div>
    ))}
  </div>
);
