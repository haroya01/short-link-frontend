"use client";

import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/common/error-state";

/**
 * The feed's error state — shown when the server feed fetch fails outright (backend/network down), as
 * opposed to a genuinely empty feed. A server component can't hold an onRetry closure, so this thin
 * client wrapper owns the retry: `router.refresh()` re-runs the server render (re-fetching the feed)
 * without a full reload. Distinguishing this from FeedEmpty is the point — a reader on a broken backend
 * gets "try again", not the false "첫 글을 써보세요".
 */
export function FeedErrorState() {
  const router = useRouter();
  return <ErrorState onRetry={() => router.refresh()} />;
}
