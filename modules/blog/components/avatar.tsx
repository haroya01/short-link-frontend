import type { CSSProperties } from "react";
import { avatarInitial, avatarTint } from "@/modules/blog/lib/avatar-tint";

/**
 * Author avatar — the "image if present, else the initial on a tinted disc" pattern that every surface
 * (feed card, following feed, discovery rail, series card, comments, author header, post page) was
 * reimplementing inline. One definition keeps the disc tint consistent in light AND dark across all of
 * them — the identity element of the weblog.
 *
 * Sizes: xs 20 (inline meta) · sm 28 (comment header) · md 36 (rail / cards) · lg 44 (post rail) ·
 * xl 64 → 80 from sm (author header).
 */
const SIZES = {
  xs: { box: "h-5 w-5", text: "text-[10px]" },
  sm: { box: "h-7 w-7", text: "text-[11px]" },
  md: { box: "h-9 w-9", text: "text-[13px]" },
  lg: { box: "h-11 w-11", text: "text-base" },
  xl: { box: "h-16 w-16 sm:h-20 sm:w-20", text: "text-xl sm:text-2xl" },
} as const;

export type AvatarSize = keyof typeof SIZES;

export function Avatar({
  src,
  name,
  seed,
  size = "md",
  shrink = true,
  eager = false,
}: {
  src: string | null | undefined;
  /** Display name or username — its first letter is the fallback initial. */
  name: string;
  /** The person's local user id, which picks the disc tint. null for remote accounts and unknown people. */
  seed: number | null;
  size?: AvatarSize;
  /** `shrink-0` so the avatar keeps its size in a flex row. Off only where the original markup omitted it. */
  shrink?: boolean;
  /**
   * Feed/comment rows render dozens of avatars below the fold, so the default is lazy. Only above-fold
   * callers (e.g. the author header) opt into eager so their avatar isn't deferred behind layout.
   */
  eager?: boolean;
}) {
  const { box, text } = SIZES[size];
  const shrinkCls = shrink ? "shrink-0 " : "";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={`${box} ${shrinkCls}rounded-full object-cover`}
      />
    );
  }
  const tint = avatarTint(seed);
  const colors = {
    "--avatar-bg": tint.light.bg,
    "--avatar-fg": tint.light.fg,
    "--avatar-bg-dark": tint.dark.bg,
    "--avatar-fg-dark": tint.dark.fg,
  } as CSSProperties;
  return (
    <span
      data-avatar-tint={tint.name}
      style={colors}
      className={`${box} ${shrinkCls}grid place-items-center rounded-full bg-[var(--avatar-bg)] ${text} font-semibold text-[var(--avatar-fg)] dark:bg-[var(--avatar-bg-dark)] dark:text-[var(--avatar-fg-dark)]`}
    >
      {avatarInitial(name)}
    </span>
  );
}
