"use client";

import { useTranslations } from "next-intl";

/**
 * Screen-reader-only loading announcement for route skeletons. A `loading.tsx` fallback is a
 * synchronous server component (can't be async without itself suspending), so it can't call
 * getTranslations — this tiny client island carries the translated status text. The skeleton
 * container keeps `aria-busy`; this adds the `role="status"` live region that actually announces
 * "불러오는 중…" / "読み込み中…" / "Loading…" while the page streams in.
 */
export function SrLoading() {
  const t = useTranslations("common");
  return (
    <span role="status" className="sr-only">
      {t("loading")}
    </span>
  );
}
