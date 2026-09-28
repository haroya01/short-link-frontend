"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { Section } from "@/components/common/section";
import { LogoutButton } from "@/components/common/logout-button";
import { Skeleton } from "@/components/ui/skeleton";

const TOOLS = [
  ["/settings/profile", "profile"],
  ["/campaigns", "campaigns"],
  ["/events", "events"],
  ["/ctas", "ctas"],
] as const;

export default function MorePage() {
  const t = useTranslations("more");
  const locale = useLocale();
  const router = useRouter();
  const { authenticated, ready, me } = useAuth();

  useEffect(() => {
    if (ready && !authenticated) router.replace(`/${locale}/login?next=${encodeURIComponent("/more")}`);
  }, [ready, authenticated, locale, router]);

  if (!me) {
    return (
      <div aria-busy className="container max-w-2xl space-y-6 py-12">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl space-y-6 py-12">
      <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
        {t("title")}
      </h1>

      <Section title={t("toolsTitle")}>
        <div className="-mx-2 divide-y divide-slate-100 dark:divide-slate-800">
          {TOOLS.map(([href, key]) => (
            <MoreRow key={key} href={href} title={t(`tools.${key}`)} description={t(`tools.${key}Desc`)} />
          ))}
        </div>
      </Section>

      <Section title={t("accountTitle")}>
        <div className="-mx-2">
          <MoreRow href="/settings" title={t("settings")} description={me.email} />
        </div>
      </Section>

      <LogoutButton />
    </div>
  );
}

function MoreRow({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="focus-ring flex min-h-14 items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{title}</span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{description}</span>
      </span>
      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
    </Link>
  );
}
