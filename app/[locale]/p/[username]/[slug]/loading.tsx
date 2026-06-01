/**
 * Instant loading skeleton shown while a post's server component fetches — so tapping into a post
 * gives an immediate reading-shaped placeholder instead of a blank gap. Mirrors the centered article
 * column; dark-aware. Rendered inside the author chrome layout (header + nav persist).
 */
export default function PostLoading() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse px-4 py-14 sm:px-6 sm:py-20">
      {/* title */}
      <div className="h-9 w-11/12 rounded bg-slate-200/80 dark:bg-slate-700/80" />
      <div className="mt-3 h-9 w-3/5 rounded bg-slate-200/80 dark:bg-slate-700/80" />
      {/* author + meta */}
      <div className="mt-6 flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
      {/* body lines */}
      <div className="mt-12 space-y-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={`h-4 rounded bg-slate-100 dark:bg-slate-800 ${
              i % 4 === 3 ? "w-2/3" : "w-full"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
