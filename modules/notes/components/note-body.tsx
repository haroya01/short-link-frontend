import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { authorHref } from "@/modules/blog/lib/author-href";
import { blogPath } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { splitNoteText } from "@/modules/notes/lib/note-text";

const linkClass =
  "rounded text-accent-700 decoration-1 underline-offset-[0.2em] hover:underline focus-ring dark:text-accent-400";

export function noteTagHref(tag: string): string {
  return blogPath(`/tags/${encodeURIComponent(tag)}?view=notes`);
}

export function NoteBody({
  body,
  mentions = [],
  large = false,
}: {
  body: string;
  mentions?: readonly string[];
  large?: boolean;
}) {
  const locale = useLocale();
  if (!body) return null;
  return (
    <p
      className={cn(
        "whitespace-pre-wrap break-words leading-[1.45] text-slate-800 dark:text-slate-200",
        large ? "text-[17px]" : "text-[15px]",
      )}
    >
      {splitNoteText(body, mentions).map((part, i) =>
        part.kind === "link" ? (
          <a key={i} href={part.value} target="_blank" rel="nofollow noopener noreferrer" className={linkClass}>
            {part.value}
          </a>
        ) : part.kind === "tag" ? (
          <BlogLink key={i} href={noteTagHref(part.value)} className={linkClass}>
            #{part.value}
          </BlogLink>
        ) : part.kind === "mention" ? (
          <BlogLink key={i} href={authorHref(part.value, locale, "notes")} className={linkClass}>
            @{part.value}
          </BlogLink>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </p>
  );
}
