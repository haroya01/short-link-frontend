"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronRight, LayoutGrid } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { Section } from "@/components/common/section";
import { LogoutButton } from "@/components/common/logout-button";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { appStoreUrl, type IosApp } from "@/lib/app-store";

const TOOLS = [
  ["/settings/profile", "profile"],
  ["/ctas", "ctas"],
] as const;

const APPS = ["links", "blog"] as const satisfies readonly IosApp[];

export default function MorePage() {
  const t = useTranslations("more");
  const { authenticated, ready, me } = useAuth();

  if (ready && !authenticated) return <SignInEmptyState page reason="more" icon={LayoutGrid} />;

  if (!me) {
    return (
      <div aria-busy className="container max-w-3xl space-y-6 py-8">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl space-y-6 py-8">
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

      <Section title={t("appsTitle")}>
        <div className="-mx-2 divide-y divide-slate-100 dark:divide-slate-800">
          {APPS.map((app) => (
            <AppRow key={app} app={app} title={t(`apps.${app}`)} description={t(`apps.${app}Desc`)} />
          ))}
        </div>
        <p className="mt-3 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">{t("appsScanHint")}</p>
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

function AppRow({ app, title, description }: { app: IosApp; title: string; description: string }) {
  const href = appStoreUrl(app);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    import("qrcode")
      .then(({ default: QRCode }) => QRCode.toDataURL(href, { margin: 1, width: 144, errorCorrectionLevel: "M" }))
      .then((url) => alive && setQr(url))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [href]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="focus-ring flex min-h-14 items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{title}</span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{description}</span>
      </span>
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="" className="hidden h-[72px] w-[72px] shrink-0 rounded-md sm:block" />
      )}
      <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0 text-slate-400 sm:hidden" />
    </a>
  );
}
