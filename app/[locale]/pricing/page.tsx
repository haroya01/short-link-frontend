import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return { title: t("title"), description: t("lead") };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  const free = [
    t("freeFeature1"),
    t("freeFeature2"),
    t("freeFeature3"),
    t("freeFeature4"),
    t("freeFeature5"),
  ];
  const paid = [
    t("paidFeature1"),
    t("paidFeature2"),
    t("paidFeature3"),
    t("paidFeature4"),
    t("paidFeature5"),
  ];

  return (
    <article className="container max-w-3xl space-y-8 py-16">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="text-sm text-slate-500">{t("lead")}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">{t("freeTitle")}</h2>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900">{t("freePrice")}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {free.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-accent-600">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50/40 p-6">
          <h2 className="text-lg font-semibold text-slate-700">{t("paidTitle")}</h2>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-700">{t("paidPrice")}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-500">
            {paid.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-slate-400">○</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}
