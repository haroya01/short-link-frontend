import { cn } from "@/lib/utils";
import { splitLinks } from "@/modules/notes/lib/note-text";

export function NoteBody({ body, large = false }: { body: string; large?: boolean }) {
  if (!body) return null;
  return (
    <p
      className={cn(
        "whitespace-pre-wrap break-words leading-[1.45] text-slate-800 dark:text-slate-200",
        large ? "text-[17px]" : "text-[15px]",
      )}
    >
      {splitLinks(body).map((part, i) =>
        part.kind === "link" ? (
          <a
            key={i}
            href={part.value}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="rounded text-accent-700 decoration-1 underline-offset-[0.2em] hover:underline focus-ring dark:text-accent-400"
          >
            {part.value}
          </a>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </p>
  );
}
