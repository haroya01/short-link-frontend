"use client";

import { AuthProvider } from "@/lib/auth";
import { PostHogProvider } from "@/components/common/posthog-provider";
import { QueryProvider } from "@/components/common/query-provider";
import { ToastProvider } from "@/components/ui/toast";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <PostHogProvider>
          <ToastProvider>{children}</ToastProvider>
        </PostHogProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
