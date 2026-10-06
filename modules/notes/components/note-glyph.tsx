import { cn } from "@/lib/utils";

// iOS(kurl-me-ios NoteGlyph)와 같은 경로 — 24 격자, 선 1.8, 둥근 끝. 한쪽을 고치면 다른 쪽도 고친다.
export const NOTE_GLYPHS = {
  heart: [
    "M12 20.3C11.7 20.3 11.4 20.2 11.15 20.02C7.1 17.15 3.75 14.1 3.75 9.9C3.75 7.2 5.8 5.25 8.3 5.25C9.8 5.25 11.15 6 12 7.2C12.85 6 14.2 5.25 15.7 5.25C18.2 5.25 20.25 7.2 20.25 9.9C20.25 14.1 16.9 17.15 12.85 20.02C12.6 20.2 12.3 20.3 12 20.3Z",
  ],
  reply: [
    "M12 4.1C16.25 4.1 19.7 7.55 19.7 11.8C19.7 16.05 16.25 19.5 12 19.5C10.82 19.5 9.7 19.24 8.7 18.77L4.6 19.95L5.72 16.1C4.82 14.9 4.3 13.4 4.3 11.8C4.3 7.55 7.75 4.1 12 4.1Z",
  ],
  repost: [
    "M4.75 11.25V9.75C4.75 7.82 6.32 6.25 8.25 6.25H19.25",
    "M16.5 3.5L19.25 6.25L16.5 9",
    "M19.25 12.75V14.25C19.25 16.18 17.68 17.75 15.75 17.75H4.75",
    "M7.5 20.5L4.75 17.75L7.5 15",
  ],
  share: [
    "M20.25 12L4.35 4.6L7.1 12L4.35 19.4Z",
    "M7.1 12H12.9",
  ],
} as const;

type Glyph = keyof typeof NOTE_GLYPHS;

export function NoteGlyph({
  name,
  active = false,
  className,
}: {
  name: Glyph;
  active?: boolean;
  className?: string;
}) {
  const paths = NOTE_GLYPHS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active && name === "repost" ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      {paths.map((d) => (
        <path key={d} d={d} fill={active && name === "heart" ? "currentColor" : undefined} />
      ))}
    </svg>
  );
}
