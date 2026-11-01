"use client";

import { ErrorState } from "@/components/common/error-state";

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <ErrorState message={message} onRetry={onRetry} />;
}
