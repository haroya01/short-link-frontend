import { splitLinks } from "@/modules/notes/lib/note-text";

export function NoteBody({ body }: { body: string }) {
  if (!body) return null;
  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
      {splitLinks(body).map((part, i) =>
        part.kind === "link" ? (
          <a
            key={i}
            href={part.value}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="focus-ring rounded-md text-accent-700 underline-offset-2 hover:underline dark:text-accent-400"
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
