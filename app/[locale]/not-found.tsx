import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="container max-w-md py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{t("description")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        {t("cta")}
      </Link>
    </div>
  );
}
