"use client";

import { AuthProvider } from "@/lib/auth";
import { LoginPromptHost } from "@/components/auth/login-prompt";
import { PostHogProvider } from "@/components/common/posthog-provider";
import { QueryProvider } from "@/components/common/query-provider";
import { ToastProvider } from "@/components/ui/toast";
import { PrimaryVariantProvider } from "@/components/ui/button";
import { BehaviorTracker } from "@/modules/blog/components/behavior-tracker";

export function AppProviders({ children, primary = "default" }: { children: React.ReactNode; primary?: "default" | "accent" }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <PostHogProvider>
          <ToastProvider>
            <PrimaryVariantProvider variant={primary}>
              <BehaviorTracker />
              {children}
              <LoginPromptHost />
            </PrimaryVariantProvider>
          </ToastProvider>
        </PostHogProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
