"use client";

import { useTranslations } from "next-intl";
import { askToSignIn, type SignInReason } from "@/components/auth/login-prompt";

export function SignInRow({
  reason,
  placeholder,
  next,
  onAsk,
}: {
  reason: SignInReason;
  placeholder: string;
  next?: () => string;
  onAsk?: () => void;
}) {
  const t = useTranslations("loginPrompt");
  return (
    <button
      type="button"
      data-testid="sign-in-row"
      onClick={() => {
        const back = next?.();
        onAsk?.();
        askToSignIn(reason, back);
      }}
      aria-label={t(reason)}
      className="group flex w-full items-center gap-3 rounded-surface py-3 text-left focus-ring"
    >
      <span aria-hidden className="h-9 w-9 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800" />
      <span className="min-w-0 flex-1 truncate text-[15px] text-slate-400 dark:text-slate-500">{placeholder}</span>
      <span className="shrink-0 rounded-full border border-slate-900 px-4 py-1.5 text-[14px] font-semibold text-slate-900 transition-colors group-hover:bg-slate-900 group-hover:text-white dark:border-slate-100 dark:text-slate-100 dark:group-hover:bg-slate-100 dark:group-hover:text-slate-900">
        {t("signIn")}
      </span>
    </button>
  );
}
