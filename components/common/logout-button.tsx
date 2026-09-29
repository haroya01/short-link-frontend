"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function LogoutButton() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signOut();
        router.push(`/${locale}`);
      }}
    >
      <LogOut aria-hidden className="h-4 w-4" />
      {t("logout")}
    </Button>
  );
}
