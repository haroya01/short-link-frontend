"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { askToSignIn, type SignInReason } from "@/components/auth/login-prompt";

export function SignInEmptyState({
  reason,
  icon: Icon,
  page = false,
  className,
}: {
  reason: SignInReason;
  icon: LucideIcon;
  page?: boolean;
  className?: string;
}) {
  const t = useTranslations("loginPrompt");
  const Line = page ? "h1" : "h2";
  return (
    <div
      data-testid="sign-in-empty"
      className={cn(
        "flex flex-col items-center px-6 text-center",
        page ? "min-h-[70dvh] justify-center py-16" : "py-24",
        className,
      )}
    >
      <Icon aria-hidden strokeWidth={1.5} className="h-8 w-8 text-slate-400 dark:text-slate-500" />
      <Line className="mt-4 text-[15px] font-medium text-slate-700 dark:text-slate-200">{t(reason)}</Line>
      <Button variant="accent" className="mt-5" onClick={() => askToSignIn(reason)}>
        {t("signIn")}
      </Button>
    </div>
  );
}
