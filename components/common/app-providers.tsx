"use client";

import { AuthProvider } from "@/lib/auth";
import { PostHogProvider } from "@/components/common/posthog-provider";
import { QueryProvider } from "@/components/common/query-provider";
import { ToastProvider } from "@/components/ui/toast";
import { BehaviorTracker } from "@/modules/blog/components/behavior-tracker";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <PostHogProvider>
          <ToastProvider>
            <BehaviorTracker />
            {children}
          </ToastProvider>
        </PostHogProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
