import { Avatar } from "url-shortener";

// ── Avatar preview ────────────────────────────────────────────────────────────
// Axes: size sweep (xs→xl) with initials fallback; real image via data-URI.

// A photo-like data-URI (sky gradient + sun + hill silhouette, no text) so the image
// sweep reads unmistakably as a cropped photo — distinct from the lettered accent disc.
const avatarImg =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>" +
      "<defs><linearGradient id='sky' x1='0' y1='0' x2='1' y2='1'>" +
      "<stop offset='0' stop-color='#fcd34d'/><stop offset='0.5' stop-color='#fb923c'/><stop offset='1' stop-color='#7c3aed'/>" +
      "</linearGradient></defs>" +
      "<rect width='80' height='80' fill='url(#sky)'/>" +
      "<circle cx='25' cy='27' r='12' fill='#fffbeb' opacity='0.9'/>" +
      "<path d='M0 62 L26 42 L46 58 L80 32 L80 80 L0 80 Z' fill='#065f46' opacity='0.6'/>" +
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
