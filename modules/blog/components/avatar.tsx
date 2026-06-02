/**
 * Author avatar — the "image if present, else the initial on an accent disc" pattern that every surface
 * (feed card, following feed, discovery rail, series card, comments, author header, post page) was
 * reimplementing inline. One definition keeps the disc tint consistent in light AND dark across all of
 * them — the identity element of the weblog.
 *
 * Sizes: xs 20 (inline meta) · sm 28 (comment header) · md 36 (rail / cards) · lg 44 (post rail) ·
 * xl 80 (author header).
 */
const SIZES = {
  xs: { box: "h-5 w-5", text: "text-[10px]" },
  sm: { box: "h-7 w-7", text: "text-[11px]" },
  md: { box: "h-9 w-9", text: "text-[13px]" },
  lg: { box: "h-11 w-11", text: "text-base" },
  xl: { box: "h-20 w-20", text: "text-2xl" },
} as const;

export type AvatarSize = keyof typeof SIZES;

export function Avatar({
  src,
  name,
  size = "md",
  shrink = true,
}: {
  src: string | null | undefined;
  /** Author name — its first character is the fallback initial. */
  name: string;
  size?: AvatarSize;
  /** `shrink-0` so the avatar keeps its size in a flex row. Off only where the original markup omitted it. */
  shrink?: boolean;
}) {
  const { box, text } = SIZES[size];
  const shrinkCls = shrink ? "shrink-0 " : "";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`${box} ${shrinkCls}rounded-full object-cover`} />;
  }
  return (
    <span
      className={`${box} ${shrinkCls}grid place-items-center rounded-full bg-accent-100 ${text} font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-300`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
