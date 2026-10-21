import type { CSSProperties } from "react";

export const AVATAR_TINTS = ["rose", "amber", "sky", "violet", "peach", "teal"] as const;

export type AvatarTint = (typeof AVATAR_TINTS)[number] | "neutral";

const encoder = new TextEncoder();

/** Shared with iOS (Palette.avatarTint): FNV-1a 32 over the lowercased handle's UTF-8 bytes, modulo the six tints. */
export function tintIndex(handle: string): number {
  let hash = 2166136261;
  for (const byte of encoder.encode(handle.toLowerCase())) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
  return hash % AVATAR_TINTS.length;
}

export function avatarTint(handle: string | null | undefined): AvatarTint {
  return handle ? AVATAR_TINTS[tintIndex(handle)] : "neutral";
}

export function avatarTintStyle(tint: AvatarTint): CSSProperties {
  return { "--avatar-bg": `var(--avatar-${tint}-bg)`, "--avatar-fg": `var(--avatar-${tint}-fg)` } as CSSProperties;
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
