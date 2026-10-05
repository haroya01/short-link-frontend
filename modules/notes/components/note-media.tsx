import type { NoteMedia } from "@/modules/notes/api/notes";
import { cn } from "@/lib/utils";

export function NoteMediaGrid({ media }: { media: NoteMedia[] }) {
  if (media.length === 0) return null;
  return (
    <div className={cn("mt-3 grid gap-1.5", media.length > 1 && "grid-cols-2")}>
      {media.map((image) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={image.url}
          src={image.url}
          alt={image.altText ?? ""}
          loading="lazy"
          className={cn(
            "w-full rounded-lg border border-slate-200 bg-slate-100 object-cover dark:border-slate-800 dark:bg-slate-900",
            media.length === 1 ? "max-h-[28rem]" : "aspect-square",
          )}
        />
      ))}
    </div>
  );
}
