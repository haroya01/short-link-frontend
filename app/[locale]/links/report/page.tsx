import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LINK_REASON_CODES } from "@/lib/api/abuse-report-reasons";
import type { AbuseReasonCode } from "@/lib/api/abuse-reports";
import { marketingOg } from "@/lib/marketing-og";
import { ReportLinkForm } from "./report-link-form";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "linkReport" });
  return {
    title: t("title"),
    description: t("lead"),
    alternates: { canonical: `${SITE_URL}/${locale}/report` },
    ...marketingOg({ locale, path: "/report", title: t("title"), description: t("lead") }),
  };
}

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// `?link=` and `?reason=` are a contract: the owner's switched-off banner links here with both.
export default async function ReportLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: "linkReport" });
  const reason = firstParam(query.reason).toUpperCase();
  const initialReason = (LINK_REASON_CODES as readonly string[]).includes(reason)
    ? (reason as AbuseReasonCode)
    : null;

  return (
    <article className="container max-w-2xl space-y-10 py-16">
      <header className="space-y-3">
        <h1 className="text-balance text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
          {t("title")}
        </h1>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">{t("lead")}</p>
      </header>

      <ReportLinkForm initialLink={firstParam(query.link).slice(0, 2048)} initialReason={initialReason} />

      <section className="space-y-3 border-t border-slate-200 pt-8 dark:border-slate-800">
        <h2 className="text-headline-xs font-semibold tracking-headline text-slate-900 dark:text-slate-100">
          {t("afterTitle")}
        </h2>
        <ul className="space-y-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
          <li>{t("afterReview")}</li>
          <li>{t("afterPrivacy")}</li>
          <li>{t("afterReply")}</li>
        </ul>
      </section>
    </article>
  );
}
