import { TagChip } from "url-shortener";

// ── TagChip preview ───────────────────────────────────────────────────────────
// Axes: inactive (default) vs active; with/without count; realistic Korean tags.

const tags = [
  { label: "에세이", count: 24 },
  { label: "제품", count: 11 },
  { label: "회고", count: 7 },
  { label: "글쓰기", count: 18 },
  { label: "독서", count: 5 },
  { label: "기술", count: 32 },
];

/** Canonical — inactive chips with post counts, as rendered in a tag cloud */
export const Inactive = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 480 }}>
    {tags.map((t) => (
      <TagChip key={t.label} href={`/tag/${t.label}`} label={t.label} count={t.count} />
    ))}
  </div>
);

/** Active (selected filter) — brand-filled variant; count hidden per spec */
export const Active = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 480 }}>
    {tags.map((t) => (
      <TagChip
        key={t.label}
        href={`/tag/${t.label}`}
        label={t.label}
        count={t.count}
        active
      />
    ))}
  </div>
);

/** Mixed strip — one active among peers, mimicking the tag-feed filter bar */
export const FilterStrip = () => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 560 }}>
    <TagChip href="/tag/all" label="전체" active />
    {tags.slice(0, 5).map((t) => (
      <TagChip key={t.label} href={`/tag/${t.label}`} label={t.label} count={t.count} />
    ))}
  </div>
);
