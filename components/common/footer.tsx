"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { linksHref } from "@/lib/host";

export function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const pathname = usePathname();

  // about/pricing/terms/privacy are canonical pages on the links product
  // (app/[locale]/links/{about,pricing,terms,privacy}). This footer is shared chrome rendered on the
  // blog too, where the blog host rewrites every path to /blog/* — so a bare /about would 404.
  // linksHref pins them to the links host (absolute in prod, same-origin path in dev) so they resolve
  // from any surface.
  const marketingHref = (p: string) => linksHref(`/${locale}${p}`);

  // Public profile pages render chrome-less — same skip rule as <Nav>.
  if (pathname.startsWith("/u/")) return null;

  return (
    <footer className="border-t border-slate-200 py-6 dark:border-slate-800">
      <div className="container flex flex-col items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex-row">
        <span>{t("copyright", { year: new Date().getFullYear() })}</span>
        <nav className="flex items-center gap-3">
          <a href={marketingHref("/about")} className="hover:text-slate-900 dark:hover:text-slate-100">
            {t("about")}
          </a>
          <span aria-hidden>·</span>
          <a href={marketingHref("/pricing")} className="hover:text-slate-900 dark:hover:text-slate-100">
            {t("pricing")}
          </a>
          <span aria-hidden>·</span>
          <a href={marketingHref("/terms")} className="hover:text-slate-900 dark:hover:text-slate-100">
            {t("terms")}
          </a>
          <span aria-hidden>·</span>
          <a href={marketingHref("/privacy")} className="hover:text-slate-900 dark:hover:text-slate-100">
            {t("privacy")}
          </a>
          <span aria-hidden>·</span>
          <a
            href="https://github.com/haroya01/short-link"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-900 dark:hover:text-slate-100"
          >
            {t("github")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
