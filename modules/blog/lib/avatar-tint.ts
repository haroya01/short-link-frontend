export type AvatarTint = { name: string; light: { bg: string; fg: string }; dark: { bg: string; fg: string } };

/**
 * Shared with iOS: same order, same hex, same pick. Changing any of it changes every person's colour on
 * both platforms. Dark backgrounds are the Tailwind 500 of each hue at 20% over slate-950 (#020617).
 */
export const AVATAR_TINTS: readonly AvatarTint[] = [
  { name: "rose", light: { bg: "#ffe4e6", fg: "#9f1239" }, dark: { bg: "#321125", fg: "#fda4af" } },
  { name: "orange", light: { bg: "#ffedd5", fg: "#9a3412" }, dark: { bg: "#331c17", fg: "#fdba74" } },
  { name: "amber", light: { bg: "#fef3c7", fg: "#92400e" }, dark: { bg: "#332415", fg: "#fcd34d" } },
  { name: "emerald", light: { bg: "#d1fae5", fg: "#065f46" }, dark: { bg: "#052a2c", fg: "#6ee7b7" } },
  { name: "teal", light: { bg: "#ccfbf1", fg: "#115e59" }, dark: { bg: "#062a34", fg: "#5eead4" } },
  { name: "sky", light: { bg: "#e0f2fe", fg: "#075985" }, dark: { bg: "#042641", fg: "#7dd3fc" } },
  { name: "indigo", light: { bg: "#e0e7ff", fg: "#3730a3" }, dark: { bg: "#151943", fg: "#a5b4fc" } },
  { name: "violet", light: { bg: "#ede9fe", fg: "#5b21b6" }, dark: { bg: "#1d1744", fg: "#c4b5fd" } },
];

export const NEUTRAL_TINT: AvatarTint = {
  name: "neutral",
  light: { bg: "#f1f5f9", fg: "#334155" },
  dark: { bg: "#1e293b", fg: "#cbd5e1" },
};

export function tintIndex(seed: number): number {
  return Math.imul(seed | 0, 2654435761 | 0) >>> 29;
}

export function avatarTint(seed: number | null | undefined): AvatarTint {
  if (seed == null || !Number.isFinite(seed) || seed <= 0) return NEUTRAL_TINT;
  return AVATAR_TINTS[tintIndex(seed)];
}

const graphemes =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? (text: string) => Array.from(new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text), (s) => s.segment)
    : (text: string) => Array.from(text);

export function avatarInitial(name: string): string {
  const parts = graphemes(name.normalize("NFKC").trim().replace(/^@+/, ""));
  const first = parts.find((g) => /^[\p{L}\p{N}]/u.test(g) && !/^\p{Lm}/u.test(g)) ?? parts[0] ?? "";
  return first.toLocaleUpperCase("en-US");
}
