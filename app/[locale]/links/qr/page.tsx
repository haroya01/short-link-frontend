import { getTranslations } from "next-intl/server";

export default async function LinksQrPage() {
  const t = await getTranslations("qr");
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t("title")}</h1>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("comingSoon")}</p>
    </div>
  );
}
