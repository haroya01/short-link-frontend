import { cn } from "@/lib/utils";

export const STRONG_NAME = "font-semibold text-slate-900 dark:text-slate-100";
export const META_HANDLE = "text-slate-400 dark:text-slate-500";

export function AuthorName({
  name,
  handle,
  className,
  handleClassName = "text-slate-500 dark:text-slate-400",
}: {
  name?: string | null;
  handle: string;
  className?: string;
  handleClassName?: string;
}) {
  const display = name?.trim();
  return (
    <span className={cn("flex min-w-0 items-baseline gap-1", className)}>
      {display ? (
        <>
          <span className="max-w-[70%] shrink-0 truncate">{display}</span>
          <span className={cn("min-w-0 truncate font-normal", handleClassName)}>@{handle}</span>
        </>
      ) : (
        <span className="min-w-0 truncate">@{handle}</span>
      )}
    </span>
  );
}
