import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  showText?: boolean;
  /** "blog" renders the blog.kurl wordmark for the (now independent) blog product header. */
  variant?: "kurl" | "blog";
};

export function Logo({ className, showText = true, variant = "kurl" }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-accent-600", className)}>
      <Mark className="h-4" />
      {showText && (
        // Wordmark in Pretendard 700 — one sans family across the app keeps the brand voice
        // consistent with the hero headline (also Pretendard). Tight tracking (-0.04em) gives
        // the mark the density a logo needs at 18px without a separate display face. The blog is
        // an independent surface, so it carries a "blog.kurl" wordmark.
        <span
          className="text-[18px] font-bold leading-none"
          style={{ letterSpacing: "-0.04em" }}
        >
          {variant === "blog" ? (
            <>
              <span className="text-slate-400">blog.</span>kurl
            </>
          ) : (
            "kurl"
          )}
        </span>
      )}
    </span>
  );
}

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 18"
      fill="currentColor"
      aria-hidden
      className={cn("h-auto", className)}
    >
      <rect x="6" y="1" width="20" height="3.4" rx="1.7" />
      <rect x="0" y="7.3" width="28" height="3.4" rx="1.7" />
      <rect x="9" y="13.6" width="17" height="3.4" rx="1.7" />
    </svg>
  );
}
