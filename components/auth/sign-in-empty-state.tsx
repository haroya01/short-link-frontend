"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { askToSignIn, type SignInReason } from "@/components/auth/login-prompt";

export function SignInEmptyState({
  reason,
  page = false,
  className,
}: {
  reason: SignInReason;
  icon?: LucideIcon;
  page?: boolean;
  className?: string;
}) {
  const t = useTranslations("loginPrompt");
  const Line = page ? "h1" : "h2";
  return (
    <div
      data-testid="sign-in-empty"
      className={cn(page ? "container min-h-[60dvh] max-w-3xl py-12" : "py-10", className)}
    >
      <Line className="text-[15px] font-medium text-slate-900 dark:text-slate-100">{t(reason)}</Line>
      <button
        type="button"
        onClick={() => askToSignIn(reason)}
        className="touch-target focus-ring -mx-1 mt-1.5 rounded-md px-1 py-0.5 text-[15px] font-medium text-accent-700 underline-offset-4 hover:underline dark:text-accent-400"
      >
        {t("signIn")}
      </button>
    </div>
  );
}
