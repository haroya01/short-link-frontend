"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";

export default function LoginPage() {
  const t = useTranslations("login");
  const { signInWithGoogle } = useAuth();

  return (
    <div className="grid-bg">
      <div className="container flex min-h-[calc(100vh-3.5rem-3rem)] max-w-md flex-col justify-center py-16">
        <div className="rounded-lg border border-slate-200 bg-white p-8">
          <h1 className="font-mono text-xl font-semibold tracking-tight text-slate-900">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>

          <Button
            variant="outline"
            className="mt-6 h-11 w-full justify-center"
            onClick={signInWithGoogle}
          >
            <GoogleIcon className="h-4 w-4" />
            {t("google")}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          {t.rich("anonymousAlt", {
            shorten: (chunks) => (
              <Link href="/" className="text-slate-700 underline underline-offset-4">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
