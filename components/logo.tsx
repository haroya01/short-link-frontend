import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  showText?: boolean;
};

export function Logo({ className, showText = true }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-accent-600", className)}>
      <Mark className="h-4" />
      {showText && (
        // Wordmark in the display serif. Pretendard's bold reads as a generic logo at 16px;
        // mixing in the serif gives the wordmark a fixed editorial signature that survives at
        // any size and matches the hero headline's serif accent.
        <span className="font-display text-[18px] font-normal leading-none">kurl</span>
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
