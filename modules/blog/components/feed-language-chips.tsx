import { cn } from "@/lib/utils";

// Native language names — universal, not locale-dependent. Codes match post `languageTag`.
const LANGS: { code: string; label: string }[] = [
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
];

/**
 * Language filter chips for the feed/search — "전체" (all, the default) plus one chip per post
 * language. A quiet pill row beneath the sort tabs; the active chip carries the brand accent.
 */
export function FeedLanguageChips({
  activeLang,
  buildHref,
  allLabel,
}: {
  /** "" = all languages (default). */
  activeLang: string;
  buildHref: (lang: string) => string;
  allLabel: string;
}) {
  const chips = [{ code: "", label: allLabel }, ...LANGS];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {chips.map((c) => {
        const active = c.code === activeLang;
        return (
          <a
            key={c.code || "all"}
            href={buildHref(c.code)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "focus-ring rounded-full border px-3 py-1 text-[13px] font-medium transition-colors",
              active
                ? "border-accent-600 bg-accent-50 text-accent-700 dark:border-accent-500 dark:bg-accent-500/10 dark:text-accent-400"
                : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800",
            )}
          >
            {c.label}
          </a>
        );
      })}
    </div>
  );
}
