import { getTranslations } from "next-intl/server";
import { blogHref } from "@/lib/host";
import { blogCta } from "@/modules/blog/components/blog-cta";

export default async function PublishingNotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">404</h1>
      <p className="mt-4 text-[15px] font-semibold text-slate-700 dark:text-slate-200">{t("title")}</p>
      <p className="mt-2 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
        {t("description")}
      </p>
      {/* Not a dead end — give a way back to the feed (SearchEmpty does the same). */}
      <div className="mt-8 flex justify-center">
        <a href={blogHref("/")} className={blogCta({ variant: "secondary" })}>
          {t("cta")}
        </a>
      </div>
    </main>
  );
}
