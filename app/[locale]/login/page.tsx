"use client";

import { useState } from "react";
import { ArrowRight, Key, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link, useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleIcon } from "@/components/google-icon";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("login");
  const { signInWithGoogle, signInWithToken } = useAuth();
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [showDev, setShowDev] = useState(false);

  function submitDevToken(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    signInWithToken(token);
    toast(t("loggedIn"), "success");
    router.push("/dashboard");
  }

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

          <div className="mt-4 flex items-center gap-3 text-[11px] text-slate-500">
            <div className="h-px flex-1 bg-slate-200" />
            {t("or")}
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={() => setShowDev((v) => !v)}
            className="mt-4 flex w-full items-center justify-between rounded-md border border-dashed border-slate-300 px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              <Key className="h-3.5 w-3.5" />
              {t("devTokenToggle")}
            </span>
            <ArrowRight className={`h-3.5 w-3.5 transition ${showDev ? "rotate-90" : ""}`} />
          </button>

          {showDev && (
            <form onSubmit={submitDevToken} className="mt-3 space-y-2">
              <Input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t("devTokenPlaceholder")}
                className="font-mono text-xs"
                autoFocus
              />
              <Button type="submit" size="sm" variant="accent" className="w-full">
                {t("devTokenSubmit")}
              </Button>
              <p className="text-[11px] leading-relaxed text-slate-500">{t("devTokenHint")}</p>
            </form>
          )}

          <div className="mt-6 flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-600" />
            <p>{t("securityNote")}</p>
          </div>
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
