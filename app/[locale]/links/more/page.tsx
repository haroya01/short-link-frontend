"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { GROUPED_ROW, GroupedList } from "@/components/common/grouped-list";
import { LogoutButton } from "@/components/common/logout-button";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { appStoreUrl, type IosApp } from "@/lib/app-store";
import { LinksPage } from "@/components/links/links-page";

const TOOLS = [
  ["/settings/profile", "profile"],
  ["/ctas", "ctas"],
] as const;

const APPS = ["links", "blog"] as const satisfies readonly IosApp[];

export default function MorePage() {
  const t = useTranslations("more");
  const { authenticated, ready, me } = useAuth();

  if (ready && !authenticated) return <SignInEmptyState page reason="more" />;

  if (!me) {
    return (
      <LinksPage width="narrow" aria-busy className="space-y-6">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </LinksPage>
    );
  }

  return (
    <LinksPage width="narrow" className="space-y-6">
      <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
        {t("title")}
      </h1>

      <GroupedList title={t("toolsTitle")}>
        {TOOLS.map(([href, key]) => (
          <MoreRow key={key} href={href} title={t(`tools.${key}`)} />
        ))}
      </GroupedList>

      <GroupedList title={t("appsTitle")} footer={t("appsScanHint")} footerClassName="hidden sm:block">
        {APPS.map((app) => (
          <AppRow key={app} app={app} title={t(`apps.${app}`)} />
        ))}
      </GroupedList>

      <GroupedList title={t("accountTitle")}>
        <MoreRow href="/settings" title={t("settings")} description={me.email} />
      </GroupedList>

      <LogoutButton />
    </LinksPage>
  );
}

function MoreRow({ href, title, description }: { href: string; title: string; description?: string }) {
  return (
    <Link href={href} className={GROUPED_ROW}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{title}</span>
        {description && <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
    </Link>
  );
}

function AppRow({ app, title }: { app: IosApp; title: string }) {
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
      className={GROUPED_ROW}
    >
      <span className="min-w-0 text-sm font-medium text-slate-900 dark:text-slate-100">{title}</span>
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="" className="hidden h-[72px] w-[72px] shrink-0 rounded-md sm:block" />
      )}
      <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0 text-slate-400 sm:hidden" />
    </a>
  );
}
