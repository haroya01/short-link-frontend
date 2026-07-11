"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { ErrorState } from "@/components/common/error-state";

// Route-level recovery boundary for everything under /[locale]. Without this, a thrown server
// component bubbled to global-error.tsx (bare inline HTML, no locale, no chrome) or the framework
// default. Here we're still inside the locale layout's NextIntlClientProvider, so ErrorState reads
// the visitor's own copy and reset() re-renders the segment in place instead of a full reload.
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <ErrorState onRetry={reset} />
    </div>
  );
}
