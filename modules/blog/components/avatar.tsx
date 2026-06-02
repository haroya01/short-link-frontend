/**
 * Author avatar — the "image if present, else the initial on an accent disc" pattern that every feed
 * surface (feed card, following feed, discovery rail, series card, comments) was reimplementing inline.
 * Sizes match the three the surfaces use; class strings are order-independent utilities so the rendered
 * output is byte-for-byte what each call site emitted before.
 *
 * Sizes: xs = 20px / 10px initial (inline meta rows), sm = 28px / 11px (comment header), md = 36px /
 * 13px (rail + discovery cards).
 */
const SIZES = {
  xs: { box: "h-5 w-5", text: "text-[10px]" },
  sm: { box: "h-7 w-7", text: "text-[11px]" },
  md: { box: "h-9 w-9", text: "text-[13px]" },
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
      className={`${box} ${shrinkCls}grid place-items-center rounded-full bg-accent-100 ${text} font-semibold text-accent-700`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
