"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Prev / numbered / next pager shared by the admin browse tables. Zero-indexed {@code page}; the
 * caller owns fetching and passes {@code totalPages} derived from its own page size. Truncates to
 * <= 7 buttons so the control row stays single-line even at the size cap.
 */
export function PageControls({
  page,
  totalPages,
  loading,
  onPage,
}: {
  page: number;
  totalPages: number;
  loading: boolean;
  onPage: (next: number) => void;
}) {
  const t = useTranslations("admin.pagination");
  const numbers = pageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {t("page", { page: page + 1, total: totalPages })}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page - 1)}
          disabled={loading || page === 0}
          aria-label={t("prev")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {numbers.map((n, i) =>
          n === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-slate-500 dark:text-slate-400">
              …
            </span>
          ) : (
            <Button
              key={n}
              variant={n === page ? "accent" : "outline"}
              size="sm"
              onClick={() => onPage(n)}
              disabled={loading}
              className="min-w-[2rem]"
            >
              {n + 1}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page + 1)}
          disabled={loading || page >= totalPages - 1}
          aria-label={t("next")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function pageNumbers(current: number, totalPages: number): Array<number | "…"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const out: Array<number | "…"> = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(totalPages - 2, current + 1);
  if (start > 1) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < totalPages - 2) out.push("…");
  out.push(totalPages - 1);
  return out;
}
