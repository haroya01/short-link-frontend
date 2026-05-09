"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { openBillingPortal, startBillingCheckout } from "@/lib/api";
import { Button } from "./ui/button";
import { useToast } from "./ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";

export function PricingCta() {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const router = useRouter();
  const { authenticated, ready, me } = useAuth();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [busy, setBusy] = useState(false);

  if (!ready) return null;

  if (!authenticated) {
    return (
      <Button variant="accent" onClick={() => router.push(`/${locale}/login`)}>
        {t("ctaLogin")}
      </Button>
    );
  }

  const isPro = me?.tier === "PRO";

  async function go(action: "checkout" | "portal") {
    setBusy(true);
    try {
      const res = action === "checkout" ? await startBillingCheckout() : await openBillingPortal();
      window.location.href = res.url;
    } catch (err) {
      toast(errorMessage(err, t("ctaFailed")), "error");
      setBusy(false);
    }
  }

  if (isPro) {
    return (
      <Button variant="outline" onClick={() => go("portal")} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("ctaManage")}
      </Button>
    );
  }

  return (
    <Button variant="accent" onClick={() => go("checkout")} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("ctaUpgrade")}
    </Button>
  );
}
