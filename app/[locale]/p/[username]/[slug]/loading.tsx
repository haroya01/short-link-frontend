/**
 * Instant loading skeleton shown while a post's server component fetches. Mirrors the REAL post
 * layout exactly — the same symmetric 3-column grid (max-w-7xl, 42rem center) + article padding +
 * headline-sized title + author-meta row — so the skeleton doesn't jump to a different geometry when
 * the post resolves (the "스켈레톤이 다르다" gap). Dark-aware; rendered inside the author chrome.
 */
export default function PostLoading() {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 xl:grid-cols-[1fr_minmax(0,42rem)_1fr]">
      {/* Left gutter — the author rail lives here on the real page; empty in the skeleton so the
          centered article column lands in the exact same place. */}
      <div className="hidden xl:block" aria-hidden />

      <div className="mx-auto w-full max-w-2xl animate-pulse py-14 sm:py-20" aria-busy>
        {/* Title — same headline measure as the post <h1> (2 lines). */}
        <div className="h-9 w-11/12 rounded bg-slate-200/80 dark:bg-slate-700/80 sm:h-11" />
        <div className="mt-3 h-9 w-3/5 rounded bg-slate-200/80 dark:bg-slate-700/80 sm:h-11" />

        {/* Author + meta row (mt-6, matching the header). */}
        <div className="mt-6 flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-3 w-44 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>

        {/* Body (header has mb-12 before the article body). */}
        <div className="mt-12 space-y-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className={`h-4 rounded bg-slate-100 dark:bg-slate-800 ${i % 4 === 3 ? "w-2/3" : "w-full"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
