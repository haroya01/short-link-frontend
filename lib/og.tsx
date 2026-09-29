// Shared building blocks for the four OG share cards (root, blog feed, author home, post): one paper
// visual system + the brand font so every unfurl matches the site it links to. Imported only by
// `opengraph-image.tsx` routes (nodejs runtime).

const PRETENDARD_BASE = "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static";

type OgFont = { name: string; data: ArrayBuffer; weight: 600 | 700; style: "normal" };

// Fetched once per cold start, then reused across renders. Satori needs OTF/TTF (not woff2), which is
// why we pull the static OTF rather than the CDN's dynamic-subset woff2 the site itself loads.
let fontCache: Promise<OgFont[]> | null = null;

function loadPretendard(): Promise<OgFont[]> {
  if (!fontCache) {
    fontCache = Promise.all([
      fetch(`${PRETENDARD_BASE}/Pretendard-Bold.otf`)
        .then((r) => r.arrayBuffer())
        .then((data) => ({ name: "Pretendard", data, weight: 700 as const, style: "normal" as const })),
      fetch(`${PRETENDARD_BASE}/Pretendard-SemiBold.otf`)
        .then((r) => r.arrayBuffer())
        .then((data) => ({ name: "Pretendard", data, weight: 600 as const, style: "normal" as const })),
    ]).catch(() => [] as OgFont[]);
  }
  return fontCache;
}

// Pretendard covers Latin (incl. Vietnamese diacritics) + Hangul + KS-X-1001 hanja, but NOT Japanese
// kana or Devanagari. Providing only Pretendard for those scripts would render tofu (□); returning []
// instead lets next/og fall back to its built-in font, which renders them (verified). So ko/en/vi text
// + every brand wordmark gets the premium brand face, and ja/hi degrade to the working default.
const NEEDS_FALLBACK = /[぀-ヿऀ-ॿ]/; // Hiragana/Katakana | Devanagari

export async function ogFonts(text: string): Promise<OgFont[]> {
  if (NEEDS_FALLBACK.test(text)) return [];
  return loadPretendard();
}

// Paper palette shared by every card — the site's own surface, ink and single green.
export const OG = {
  size: { width: 2400, height: 1260 },
  bg: "#F9FAF9",
  ink: "#131A16",
  mute: "#4F5652",
  faint: "#6D7570",
  rule: "#E5E8E6",
  green: "#059669",
  greenSoft: "#ECFDF5",
  greenInk: "#047857",
} as const;

/** The kurl mark (three bars), solid brand green. */
export function OgMark({ width = 132 }: { width?: number }) {
  const height = (width * 18) / 28;
  return (
    <svg width={width} height={height} viewBox="0 0 28 18" xmlns="http://www.w3.org/2000/svg">
      <g fill={OG.green}>
        <rect x="6" y="1" width="20" height="3.4" rx="1" />
        <rect x="0" y="7.3" width="28" height="3.4" rx="1" />
        <rect x="9" y="13.6" width="17" height="3.4" rx="1" />
      </g>
    </svg>
  );
}

/** Satori crashes the whole render if a remote <img> fails — and avatars are user-set (can 404, block
 *  CORS, or be webp/avif Satori can't decode). Fetch the bytes ourselves, accept only png/jpeg, inline
 *  as a data URL. Any failure returns null → the caller falls back to a monogram. */
export async function loadAvatar(rawUrl: string): Promise<string | null> {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:") return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(rawUrl, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!/^image\/(png|jpe?g)$/.test(ct)) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 2_000_000) return null;
    return `data:${ct};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}
