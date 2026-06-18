import { Avatar } from "url-shortener";

// ── Avatar preview ────────────────────────────────────────────────────────────
// Axes: size sweep (xs→xl) with initials fallback; real image via data-URI.

const avatarImg =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>" +
      "<rect width='80' height='80' fill='#a7f3d0'/>" +
      "<text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='32' font-family='sans-serif' fill='#065f46'>지</text>" +
      "</svg>",
  );

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

/** Size sweep — initials fallback (no avatarUrl), brand accent disc */
export const SizeSweepInitials = () => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
    {SIZES.map((size) => (
      <div
        key={size}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
      >
        <Avatar src={null} name="지혜" size={size} />
        <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{size}</span>
      </div>
    ))}
  </div>
);

/** Image avatar — src supplied; shows rounded-full object-cover at all sizes */
export const SizeSweepImage = () => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
    {SIZES.map((size) => (
      <div
        key={size}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
      >
        <Avatar src={avatarImg} name="지혜" size={size} />
        <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{size}</span>
      </div>
    ))}
  </div>
);

/** In-context — avatar alongside author name, as seen in feed-card meta row */
export const InContext = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 320 }}>
    {[
      { name: "김지혜", size: "md", src: null, role: "에디터" },
      { name: "박민우", size: "md", src: avatarImg, role: "작가" },
      { name: "이수연", size: "sm", src: null, role: "독자" },
    ].map(({ name, size, src, role }) => (
      <div key={name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar src={src} name={name} size={size as never} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{name}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{role}</div>
        </div>
      </div>
    ))}
  </div>
);
