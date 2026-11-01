"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { appStoreUrl, type IosApp } from "@/lib/app-store";
import { linksHref } from "@/lib/host";

const LINK = "inline-flex min-h-6 items-center hover:text-slate-900 dark:hover:text-slate-100";

const USE_PAGES = [
  ["free-url-shortener", "freeUrlShortener"],
  ["bitly-alternative", "bitlyAlternative"],
  ["link-in-bio", "linkInBio"],
  ["instagram-profile-link", "instagramProfileLink"],
  ["kakaotalk-link-preview", "kakaotalkLinkPreview"],
  ["poster-qr-code", "posterQrCode"],
  ["flyer-qr-tracking", "flyerQrTracking"],
  ["qr-campaign-analytics", "qrCampaignAnalytics"],
] as const;

export function Footer({ app, directory = false }: { app?: IosApp; directory?: boolean } = {}) {
  const pathname = usePathname();
  const { ready, authenticated } = useAuth();

  // Public profile pages render chrome-less — same skip rule as <Nav>.
  if (pathname.startsWith("/u/")) return null;
  if (!directory || (ready && authenticated)) return <CompactFooter app={app} />;

  return (
    <>
      <div data-auth-slot={ready ? undefined : "anon"} className="contents">
        <DirectoryFooter app={app} />
      </div>
      {!ready && (
        <div data-auth-slot="authed" className="contents">
          <CompactFooter app={app} />
        </div>
      )}
    </>
  );
}

function useMarketingHref() {
  const locale = useLocale();
  // about/terms/privacy/report are canonical pages on the links product
  // (app/[locale]/links/{about,terms,privacy,report}). This footer is shared chrome rendered on the
  // blog too, where the blog host rewrites every path to /blog/* — so a bare /about would 404.
  // linksHref pins them to the links host (absolute in prod, same-origin path in dev) so they resolve
  // from any surface.
  return (p: string) => linksHref(`/${locale}${p}`);
}

function CompactFooter({ app }: { app?: IosApp }) {
  const t = useTranslations("footer");
  const marketingHref = useMarketingHref();
  return (
    <footer className="site-footer border-t border-slate-200 py-6 dark:border-slate-800">
      <div className="container flex flex-col items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex-row">
        <span>{t("copyright", { year: new Date().getFullYear() })}</span>
        {/* 320px 급 극소폭에서 링크 행이 줄바꿈 없이 6px 넘치던 전역 결함 — wrap 허용으로 수리. */}
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:gap-x-3">
          <a href={marketingHref("/about")} className={LINK}>
            {t("about")}
          </a>
          <span aria-hidden className="hidden sm:inline">·</span>
          {app && (
            <>
              <a
                href={appStoreUrl(app)}
                target="_blank"
                rel="noreferrer"
                className={LINK}
              >
                {t("iosApp")}
              </a>
              <span aria-hidden className="hidden sm:inline">·</span>
            </>
          )}
          <a href={marketingHref("/terms")} className={LINK}>
            {t("terms")}
          </a>
          <span aria-hidden className="hidden sm:inline">·</span>
          <a href={marketingHref("/privacy")} className={LINK}>
            {t("privacy")}
          </a>
          <span aria-hidden className="hidden sm:inline">·</span>
          <a href={marketingHref("/report")} className={LINK}>
            {t("report")}
          </a>
          <span aria-hidden className="hidden sm:inline">·</span>
          <a
            href="https://github.com/haroya01/short-link"
            target="_blank"
            rel="noreferrer"
            className={LINK}
          >
            {t("github")}
          </a>
        </nav>
      </div>
    </footer>
  );
}

const HEADING = "text-[12px] font-semibold text-slate-900 dark:text-slate-100";
const LIST = "mt-3 grid gap-y-1.5 text-[13px] text-slate-500 dark:text-slate-400";

function DirectoryFooter({ app }: { app?: IosApp }) {
  const t = useTranslations("footer");
  const marketingHref = useMarketingHref();
  return (
    <footer data-testid="footer-directory" className="site-footer border-t border-slate-200 dark:border-slate-800">
      <div className="container py-10 sm:py-14">
        <nav className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-[2fr_1fr_1fr]">
          <section className="col-span-2 sm:col-span-1">
            <h2 className={HEADING}>{t("useTitle")}</h2>
            <ul className={`${LIST} grid-cols-2 gap-x-6`}>
              {USE_PAGES.map(([slug, key]) => (
                <li key={slug}>
                  <a href={marketingHref(`/use/${slug}`)} className={LINK}>
                    {t(`use.${key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className={HEADING}>{t("learnTitle")}</h2>
            <ul className={LIST}>
              <li>
                <a href={marketingHref("/about")} className={LINK}>
                  {t("about")}
                </a>
              </li>
              <li>
                <a href={marketingHref("/learn")} className={LINK}>
                  {t("learn")}
                </a>
              </li>
              <li>
                <a href={marketingHref("/qr-campaigns")} className={LINK}>
                  {t("qrCampaigns")}
                </a>
              </li>
            </ul>
          </section>
          <section>
            <h2 className={HEADING}>kurl</h2>
            <ul className={LIST}>
              {app && (
                <li>
                  <a href={appStoreUrl(app)} target="_blank" rel="noreferrer" className={LINK}>
                    {t("iosApp")}
                  </a>
                </li>
              )}
              <li>
                <a href={marketingHref("/terms")} className={LINK}>
                  {t("terms")}
                </a>
              </li>
              <li>
                <a href={marketingHref("/privacy")} className={LINK}>
                  {t("privacy")}
                </a>
              </li>
              <li>
                <a href={marketingHref("/report")} className={LINK}>
                  {t("report")}
                </a>
              </li>
              <li>
                <a href="https://github.com/haroya01/short-link" target="_blank" rel="noreferrer" className={LINK}>
                  {t("github")}
                </a>
              </li>
            </ul>
          </section>
        </nav>
        <p className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
