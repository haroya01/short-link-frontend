import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-slate-200 py-6">
      <div className="container flex flex-col items-center justify-between gap-2 text-xs text-slate-500 sm:flex-row">
        <span>{t("copyright", { year: new Date().getFullYear() })}</span>
        <nav className="flex items-center gap-3">
          <Link href="/about" className="hover:text-slate-900">
            {t("about")}
          </Link>
          <span aria-hidden>·</span>
          <Link href="/pricing" className="hover:text-slate-900">
            {t("pricing")}
          </Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="hover:text-slate-900">
            {t("terms")}
          </Link>
          <span aria-hidden>·</span>
          <Link href="/privacy" className="hover:text-slate-900">
            {t("privacy")}
          </Link>
          <span aria-hidden>·</span>
          <a
            href="https://github.com/haroya01/short-link"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-900"
          >
            {t("github")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
