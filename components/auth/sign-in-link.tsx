"use client";

import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { linksHref } from "@/lib/host";
import { askToSignIn, type SignInReason } from "@/components/auth/login-prompt";

export function SignInLink({
  reason,
  next,
  className,
  children,
}: {
  reason: SignInReason;
  next?: string;
  className?: string;
  children: ReactNode;
}) {
  const locale = useLocale();
  return (
    <Link
      href={next ? `/login?next=${next}` : "/login"}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        askToSignIn(reason, next ? linksHref(`/${locale}${next}`) : undefined);
      }}
    >
      {children}
    </Link>
  );
}
