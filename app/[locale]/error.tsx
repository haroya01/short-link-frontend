"use client";

import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect } from "react";
import { ErrorState } from "@/components/common/error-state";

// Route-level recovery boundary for everything under /[locale]. Without this, a thrown server
// component bubbled to global-error.tsx (bare inline HTML, no locale, no chrome) or the framework
// default. Here we're still inside the locale layout's NextIntlClientProvider, so ErrorState reads
// the visitor's own copy and retrying re-renders the segment in place instead of a full reload.
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  // reset() alone only re-renders the client boundary with the same cached RSC payload, so a fault
  // thrown from a server component reproduces immediately and the button reads as dead. Refresh the
  // route first to re-fetch the server tree, then reset — both inside one transition so React runs
  // them against the refreshed data rather than the stale error render.
  const retry = useCallback(() => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }, [router, reset]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <ErrorState onRetry={retry} />
    </div>
  );
}
