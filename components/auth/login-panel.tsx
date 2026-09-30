"use client";

import { GoogleIcon } from "@/components/common/google-icon";
import { Button } from "@/components/ui/button";
import { AppleSignInButton } from "@/components/auth/apple-sign-in-button";
import { AuthFrame } from "@/components/auth/auth-frame";

type Props = {
  /** Wraps the mark so it links back to the product's home (a locale Link or a cross-host <a>). */
  renderHome: (mark: React.ReactNode) => React.ReactNode;
  title: string;
  subtitle: string;
  googleLabel: string;
  onGoogle: () => void;
  appleSuccessHref: string;
  consent: React.ReactNode;
  footer: React.ReactNode;
};

export function LoginPanel({
  renderHome,
  title,
  subtitle,
  googleLabel,
  onGoogle,
  appleSuccessHref,
  consent,
  footer,
}: Props) {
  return (
    <AuthFrame home={renderHome} title={title} description={subtitle} footer={footer} animated>
      <Button variant="outline" className="h-11 w-full justify-center" onClick={onGoogle}>
        <GoogleIcon className="h-4 w-4" />
        {googleLabel}
      </Button>
      <AppleSignInButton successHref={appleSuccessHref} />
      <p className="px-2 pt-1 text-center text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
        {consent}
      </p>
    </AuthFrame>
  );
}
