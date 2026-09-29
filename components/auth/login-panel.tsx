"use client";

import { GoogleIcon } from "@/components/common/google-icon";
import { Mark } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { AppleSignInButton } from "@/components/auth/apple-sign-in-button";

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
    <div className="flex min-h-[100dvh] items-center justify-center bg-white px-5 py-12 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="hero-stagger flex flex-col items-center text-center">
          <div className="mark-draw-in" style={{ ["--hi" as string]: 0 } as React.CSSProperties}>
            {renderHome(<Mark animated className="h-9 w-auto text-accent-600 dark:text-accent-500" />)}
          </div>
          <h1
            className="mt-6 text-[24px] font-semibold tracking-headline text-slate-900 dark:text-slate-100"
            style={{ ["--hi" as string]: 1 } as React.CSSProperties}
          >
            {title}
          </h1>
          <p
            className="mt-2 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400"
            style={{ ["--hi" as string]: 2 } as React.CSSProperties}
          >
            {subtitle}
          </p>
        </div>

        <div className="profile-fade mt-9 space-y-3" style={{ ["--idx" as string]: 4 } as React.CSSProperties}>
          <Button variant="outline" className="h-11 w-full justify-center" onClick={onGoogle}>
            <GoogleIcon className="h-4 w-4" />
            {googleLabel}
          </Button>
          <AppleSignInButton successHref={appleSuccessHref} />
          <p className="px-2 pt-1 text-center text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            {consent}
          </p>
        </div>

        <div className="profile-fade mt-8 text-center" style={{ ["--idx" as string]: 6 } as React.CSSProperties}>
          {footer}
        </div>
      </div>
    </div>
  );
}
